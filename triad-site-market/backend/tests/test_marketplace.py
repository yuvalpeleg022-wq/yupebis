import threading
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import update

from app.db import SessionLocal
from app.models import (
    CustomerSite,
    Order,
    OrderStatus,
    Ownership,
    SoldWebsiteMutationError,
    Website,
    WebsiteStatus,
)
from app.services import marketplace
from app.services.payments.registry import get_provider
from tests.conftest import IS_PG, auth, listed_site, make_user


def pay(client, order_id, succeed=True):
    sim = client.post(f"/api/dev/simulate-payment/{order_id}", params={"succeed": succeed}).json()
    return client.post("/api/webhooks/payments/mock", content=sim["body"], headers=sim["headers"])


def test_full_purchase_flow(db, client):
    site = listed_site(db)
    buyer = make_user(db)
    assert client.get("/api/websites").json()["total"] == 1

    r = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "k-00000001"}, headers=auth(buyer))
    assert r.status_code == 200, r.text
    order_id = r.json()["order_id"]
    assert client.get("/api/websites").json()["total"] == 0  # reserved -> hidden

    assert pay(client, order_id).json()["status"] == "paid"
    db.expire_all()
    w = db.get(Website, site.id)
    assert w.status == WebsiteStatus.sold and w.owner_id == buyer.id
    own = db.query(Ownership).filter_by(website_id=site.id).one()
    assert own.owner_id == buyer.id and own.original_spec_hash == w.spec_hash
    sites = client.get("/api/me/sites", headers=auth(buyer)).json()
    assert len(sites) == 1 and sites[0]["website_id"] == site.id
    assert client.get(f"/api/websites/{site.slug}").json()["status"] == "unavailable"


def test_second_buyer_cannot_checkout_reserved_or_sold(db, client):
    site = listed_site(db)
    a, b = make_user(db), make_user(db)
    r = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "a-00000001"}, headers=auth(a))
    assert r.status_code == 200
    r2 = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "b-00000001"}, headers=auth(b))
    assert r2.status_code == 409
    pay(client, r.json()["order_id"])
    r3 = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "b-00000002"}, headers=auth(b))
    assert r3.status_code == 409


def test_webhook_is_idempotent_and_signature_checked(db, client):
    site = listed_site(db)
    buyer = make_user(db)
    order_id = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "k-00000002"},
                           headers=auth(buyer)).json()["order_id"]
    sim = client.post(f"/api/dev/simulate-payment/{order_id}").json()
    bad = dict(sim["headers"], **{"x-triad-signature": "0" * 64})
    assert client.post("/api/webhooks/payments/mock", content=sim["body"], headers=bad).status_code == 400
    assert client.post("/api/webhooks/payments/mock", content=sim["body"], headers=sim["headers"]).json()["status"] == "paid"
    assert client.post("/api/webhooks/payments/mock", content=sim["body"], headers=sim["headers"]).json()["status"] == "duplicate"
    assert db.query(Ownership).count() == 1


def test_late_payment_after_resale_is_refunded(db):
    """Buyer A's reservation lapses, B buys; A's late payment must be refunded, not double-sold."""
    provider = get_provider()
    site = listed_site(db)
    a, b = make_user(db), make_user(db)
    ra = marketplace.start_checkout(db, provider, a, site.id, "late-a-0001")
    db.execute(update(Website).where(Website.id == site.id)
               .values(reserved_until=datetime.now(timezone.utc) - timedelta(minutes=1)))
    db.commit()
    rb = marketplace.start_checkout(db, provider, b, site.id, "late-b-0001")
    assert marketplace.complete_purchase(db, provider, rb.order.id).status == OrderStatus.paid
    late = marketplace.complete_purchase(db, provider, ra.order.id)
    assert late.status == OrderStatus.conflict_refunded
    assert provider.refunds and provider.refunds[-1][1] == ra.order.amount_cents
    db.expire_all()
    assert db.get(Website, site.id).owner_id == b.id
    assert db.query(Ownership).count() == 1


def test_expired_reservation_returns_to_inventory_but_sold_never_does(db):
    provider = get_provider()
    s1, s2 = listed_site(db), listed_site(db, seed=99)
    u = make_user(db)
    marketplace.start_checkout(db, provider, u, s1.id, "exp-00000001")
    r2 = marketplace.start_checkout(db, provider, u, s2.id, "exp-00000002")
    marketplace.complete_purchase(db, provider, r2.order.id)
    past = datetime.now(timezone.utc) - timedelta(minutes=5)
    db.execute(update(Website).where(Website.id == s1.id).values(reserved_until=past))
    db.commit()
    assert marketplace.expire_reservations(db) == 1
    db.expire_all()
    assert db.get(Website, s1.id).status == WebsiteStatus.listed
    assert db.get(Website, s2.id).status == WebsiteStatus.sold


def test_sold_website_cannot_be_relisted_orm_or_sql(db):
    provider = get_provider()
    site = listed_site(db)
    u = make_user(db)
    r = marketplace.start_checkout(db, provider, u, site.id, "sold-0000001")
    marketplace.complete_purchase(db, provider, r.order.id)
    w = db.get(Website, site.id)
    w.status = WebsiteStatus.listed
    with pytest.raises(SoldWebsiteMutationError):
        db.commit()
    db.rollback()
    with pytest.raises(Exception):  # database trigger
        db.execute(update(Website).where(Website.id == site.id).values(status=WebsiteStatus.listed))
        db.commit()
    db.rollback()
    with pytest.raises(Exception):
        db.execute(update(Website).where(Website.id == site.id).values(owner_id=make_user(db).id))
        db.commit()


def test_private_modifications_never_touch_original(db, client):
    site = listed_site(db)
    buyer = make_user(db)
    oid = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "priv-0000001"},
                      headers=auth(buyer)).json()["order_id"]
    pay(client, oid)
    cs = db.query(CustomerSite).one()
    original_hash = db.get(Website, site.id).spec_hash
    ops = {"operations": [{"op": "update_meta", "business_name": "My Private Brand"}]}
    r = client.post(f"/api/me/sites/{cs.id}/edits", params={"revision": 1}, json=ops, headers=auth(buyer))
    assert r.status_code == 200, r.text
    db.expire_all()
    w = db.get(Website, site.id)
    assert w.spec_hash == original_hash and w.spec["meta"]["business_name"] != "My Private Brand"
    assert db.get(CustomerSite, cs.id).spec["meta"]["business_name"] == "My Private Brand"


def test_amount_mismatch_is_rejected(db):
    provider = get_provider()
    site = listed_site(db)
    u = make_user(db)
    r = marketplace.start_checkout(db, provider, u, site.id, "amt-00000001")
    o = marketplace.complete_purchase(db, provider, r.order.id, paid_amount_cents=1)
    assert o.status == OrderStatus.failed and db.query(Ownership).count() == 0


@pytest.mark.skipif(not IS_PG, reason="true concurrency test requires PostgreSQL")
def test_concurrent_checkout_and_payment_only_one_owner(db):
    provider = get_provider()
    site = listed_site(db)
    buyers = [make_user(db) for _ in range(12)]
    results: list[str] = []
    barrier = threading.Barrier(len(buyers))

    def attempt(i):
        s = SessionLocal()
        try:
            barrier.wait()
            r = marketplace.start_checkout(s, provider, buyers[i], site.id, f"conc-{i:08d}")
            marketplace.complete_purchase(s, provider, r.order.id)
            results.append("ok")
        except marketplace.NotAvailable:
            results.append("unavailable")
        finally:
            s.close()

    threads = [threading.Thread(target=attempt, args=(i,)) for i in range(len(buyers))]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert results.count("ok") == 1 and results.count("unavailable") == len(buyers) - 1
    db.expire_all()
    assert db.query(Ownership).count() == 1
    assert db.query(Order).filter_by(status=OrderStatus.paid).count() == 1


@pytest.mark.skipif(not IS_PG, reason="true concurrency test requires PostgreSQL")
def test_concurrent_duplicate_payment_webhooks(db):
    provider = get_provider()
    site = listed_site(db)
    u = make_user(db)
    r = marketplace.start_checkout(db, provider, u, site.id, "dupe-0000001")
    barrier = threading.Barrier(8)

    def go():
        s = SessionLocal()
        try:
            barrier.wait()
            marketplace.complete_purchase(s, provider, r.order.id)
        finally:
            s.close()

    ts = [threading.Thread(target=go) for _ in range(8)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert db.query(Ownership).count() == 1 and db.query(CustomerSite).count() == 1
