from app.models import CustomerSite, Ownership
from tests.conftest import auth, listed_site, make_user
from tests.test_marketplace import pay


def _buy(db, client):
    site = listed_site(db)
    buyer = make_user(db)
    oid = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": f"sub-{site.id[:8]}"},
                      headers=auth(buyer)).json()["order_id"]
    pay(client, oid)
    return buyer, db.query(CustomerSite).filter_by(owner_id=buyer.id).one()


def _subscribe(client, buyer):
    r = client.post("/api/me/subscription", headers=auth(buyer)).json()
    sim = client.post(f"/api/dev/simulate-subscription/{r['subscription_id']}").json()
    client.post("/api/webhooks/payments/mock", content=sim["body"], headers=sim["headers"])


def test_ai_editor_requires_subscription_visual_editor_does_not(db, client):
    buyer, cs = _buy(db, client)
    r = client.post(f"/api/me/sites/{cs.id}/ai-edit", json={"instruction": "rename to Nova", "revision": 1},
                    headers=auth(buyer))
    assert r.status_code == 402
    r = client.post(f"/api/me/sites/{cs.id}/edits", params={"revision": 1},
                    json={"operations": [{"op": "update_meta", "tagline": "Free visual edit"}]}, headers=auth(buyer))
    assert r.status_code == 200 and r.json()["revision"] == 2


def test_ai_edit_with_subscription_consumes_allowance(db, client):
    buyer, cs = _buy(db, client)
    _subscribe(client, buyer)
    r = client.post(f"/api/me/sites/{cs.id}/ai-edit", json={"instruction": "rename to Nova Studio", "revision": 1},
                    headers=auth(buyer))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["site"]["spec"]["meta"]["business_name"] == "Nova Studio"
    assert body["usage"]["used"] == 1


def test_cancel_subscription_keeps_ownership(db, client):
    buyer, cs = _buy(db, client)
    _subscribe(client, buyer)
    assert client.delete("/api/me/subscription", headers=auth(buyer)).json()["status"] == "canceled"
    assert len(client.get("/api/me/sites", headers=auth(buyer)).json()) == 1
    assert db.query(Ownership).filter_by(owner_id=buyer.id).count() == 1
    assert client.get(f"/api/me/sites/{cs.id}/export.zip", headers=auth(buyer)).status_code == 200


def test_other_users_cannot_access_site(db, client):
    _, cs = _buy(db, client)
    stranger = make_user(db)
    assert client.get(f"/api/me/sites/{cs.id}", headers=auth(stranger)).status_code == 404
    assert client.get(f"/api/me/sites/{cs.id}/export.zip", headers=auth(stranger)).status_code == 404


def test_edit_ops_validation_and_optimistic_lock(db, client):
    buyer, cs = _buy(db, client)
    nav = cs.spec["pages"][0]["sections"][0]["id"]
    r = client.post(f"/api/me/sites/{cs.id}/edits", params={"revision": 1},
                    json={"operations": [{"op": "remove_section", "page": "index", "section_id": nav}]},
                    headers=auth(buyer))
    assert r.status_code == 422
    r = client.post(f"/api/me/sites/{cs.id}/edits", params={"revision": 5},
                    json={"operations": [{"op": "update_meta", "tagline": "x y z"}]}, headers=auth(buyer))
    assert r.status_code == 409


def test_restore_revision(db, client):
    buyer, cs = _buy(db, client)
    client.post(f"/api/me/sites/{cs.id}/edits", params={"revision": 1},
                json={"operations": [{"op": "update_meta", "tagline": "changed"}]}, headers=auth(buyer))
    r = client.post(f"/api/me/sites/{cs.id}/restore/1", headers=auth(buyer))
    assert r.json()["revision"] == 3 and r.json()["spec"]["meta"]["tagline"] != "changed"
