import json

import httpx
import pytest

from app.config import Settings
from app.models import Order, OrderStatus, Ownership, Subscription, SubscriptionStatus
from app.services.payments.base import WebhookVerificationError
from app.services.payments.payplus import PayPlusError, PayPlusProvider, callback_hash
from app.services.payments.registry import get_provider
from tests.conftest import auth, listed_site, make_user

SECRET = "sk_test"


def settings(**kw):
    return Settings(payplus_api_key="ak_test", payplus_secret_key=SECRET, payplus_payment_page_uid="page-1",
                    payplus_terminal_uid="term-1", public_api_url="https://api.example.com", **kw)


def provider(handler):
    return PayPlusProvider(settings(), transport=httpx.MockTransport(handler))


def ok(data):
    return httpx.Response(200, json={"results": {"status": "success", "code": 0}, "data": data})


def callback(tx: dict, kind="Charge", invoice=None):
    body = json.dumps({"transaction_type": kind, "transaction": tx, "invoice": invoice or {}}).encode()
    return body, {"user-agent": "PayPlus", "hash": callback_hash(SECRET, body)}


def test_requires_configuration():
    with pytest.raises(PayPlusError):
        PayPlusProvider(Settings())


def test_generate_link_request_for_one_time_purchase():
    seen = {}

    def handler(req: httpx.Request):
        seen["url"], seen["headers"], seen["body"] = str(req.url), req.headers, json.loads(req.content)
        return ok({"page_request_uid": "pr-1", "payment_page_link": "https://paymentsdev.payplus.co.il/pr-1"})

    s = provider(handler).create_checkout(order_id="o1", amount_cents=149000, currency="ILS", description="Site",
                                          customer_email="a@b.co", success_url="https://x/s", cancel_url="https://x/c")
    assert s.provider_ref == "pr-1" and s.redirect_url.endswith("/pr-1")
    assert seen["url"] == "https://restapidev.payplus.co.il/api/v1.0/PaymentPages/generateLink"
    assert seen["headers"]["api-key"] == "ak_test" and seen["headers"]["secret-key"] == SECRET
    b = seen["body"]
    assert b["amount"] == 1490.0 and b["currency_code"] == "ILS" and b["charge_method"] == 1
    assert b["payment_page_uid"] == "page-1" and b["more_info"] == "order:o1"
    assert b["refURL_callback"] == "https://api.example.com/api/webhooks/payments/payplus"


def test_subscription_uses_recurring_monthly():
    seen = {}

    def handler(req):
        seen["body"] = json.loads(req.content)
        return ok({"page_request_uid": "pr-2", "payment_page_link": "https://p/pr-2"})

    provider(handler).create_subscription(subscription_id="s1", plan="ai_pro", amount_cents=7900, currency="ILS",
                                          customer_email="a@b.co", success_url="https://x/s", cancel_url="https://x/c")
    rs = seen["body"]["recurring_settings"]
    assert seen["body"]["charge_method"] == 3 and seen["body"]["amount"] == 79.0
    assert rs["recurring_type"] == 2 and rs["recurring_range"] == 1 and rs["number_of_charges"] == 0


def test_refund_and_cancel_endpoints_and_error_handling():
    paths = []

    def handler(req):
        paths.append(req.url.path)
        if "Refund" in req.url.path:
            assert json.loads(req.content) == {"transaction_uid": "tx-9", "amount": 10.5, "more_info": "why"}
            return ok({"transaction": {"uid": "rf-1"}})
        if "DeleteRecurring" in req.url.path:
            return httpx.Response(200, json={"results": {"status": "error", "description": "not found"}})
        raise AssertionError

    p = provider(handler)
    assert p.refund("tx-9", 1050, "why") == "rf-1"
    with pytest.raises(PayPlusError, match="not found"):
        p.cancel_subscription("rec-1")
    assert paths[-1].endswith("/RecurringPayments/DeleteRecurring/rec-1")


def test_callback_verification_and_normalization():
    p = provider(lambda r: ok({}))
    body, headers = callback({"uid": "tx-1", "payment_request_uid": "pr-1", "status_code": "000", "amount": 1490,
                              "currency": "ILS", "more_info": "order:o1"}, invoice={"original_url": "https://inv/1"})
    ev = p.parse_webhook(headers, body)
    assert (ev.type, ev.provider_ref, ev.amount_cents, ev.transaction_ref, ev.invoice_url) == (
        "payment.succeeded", "pr-1", 149000, "tx-1", "https://inv/1")
    with pytest.raises(WebhookVerificationError):
        p.parse_webhook({**headers, "hash": "AAAA"}, body)
    with pytest.raises(WebhookVerificationError):
        p.parse_webhook({**headers, "user-agent": "curl"}, body)
    with pytest.raises(WebhookVerificationError):
        p.parse_webhook(headers, body + b" ")  # tampered body
    body, headers = callback({"uid": "tx-2", "payment_request_uid": "pr-1", "status_code": "033", "amount": 1})
    assert p.parse_webhook(headers, body).type == "payment.failed"
    body, headers = callback({"uid": "tx-3", "status_code": "000", "amount": 79,
                              "recurring_charge_information": {"recurring_uid": "rec-7"}})
    ev = p.parse_webhook(headers, body)
    assert (ev.type, ev.provider_ref, ev.replacement_ref) == ("subscription.renewed", "rec-7", "rec-7")


@pytest.fixture
def payplus_app(monkeypatch):
    """Run the real API with PayPlus as the provider, PayPlus' HTTP API faked."""
    state = {"n": 0, "refunds": []}

    def handler(req: httpx.Request):
        if "generateLink" in req.url.path:
            state["n"] += 1
            return ok({"page_request_uid": f"pr-{state['n']}", "payment_page_link": f"https://pay/pr-{state['n']}"})
        if "Refund" in req.url.path:
            state["refunds"].append(json.loads(req.content))
            return ok({"transaction": {"uid": "rf"}})
        return ok({})

    p = provider(handler)
    monkeypatch.setattr("app.api.commerce.get_provider", lambda name=None: p)
    return state


def test_end_to_end_purchase_through_payplus_callback(db, client, payplus_app):
    site = listed_site(db)
    buyer = make_user(db)
    r = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "pp-0000001"}, headers=auth(buyer))
    assert r.status_code == 200 and r.json()["redirect_url"] == "https://pay/pr-1"
    again = client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "pp-0000001"}, headers=auth(buyer))
    assert again.json()["redirect_url"] == "https://pay/pr-1" and payplus_app["n"] == 1  # idempotent

    body, headers = callback({"uid": "tx-100", "payment_request_uid": "pr-1", "status_code": "000",
                              "amount": site.price_cents / 100, "currency": "ILS"},
                             invoice={"original_url": "https://inv/100"})
    assert client.post("/api/webhooks/payments/payplus", content=body, headers=headers).json()["status"] == "paid"
    assert client.post("/api/webhooks/payments/payplus", content=body, headers=headers).json()["status"] == "duplicate"
    bad = client.post("/api/webhooks/payments/payplus", content=body, headers={**headers, "hash": "x"})
    assert bad.status_code == 400
    db.expire_all()
    o = db.query(Order).one()
    assert o.status == OrderStatus.paid and o.provider_txn_ref == "tx-100" and o.invoice_url == "https://inv/100"
    assert db.query(Ownership).count() == 1
    assert client.get("/api/orders", headers=auth(buyer)).json()[0]["invoice_url"] == "https://inv/100"


def test_wrong_amount_from_payplus_is_refunded_by_transaction_uid(db, client, payplus_app):
    site = listed_site(db)
    buyer = make_user(db)
    client.post(f"/api/websites/{site.id}/checkout", json={"idempotency_key": "pp-0000002"}, headers=auth(buyer))
    body, headers = callback({"uid": "tx-200", "payment_request_uid": "pr-1", "status_code": "000", "amount": 1})
    assert client.post("/api/webhooks/payments/payplus", content=body, headers=headers).json()["status"] == "failed"
    assert payplus_app["refunds"][0]["transaction_uid"] == "tx-200" and db.query(Ownership).count() == 0


def test_subscription_lifecycle_through_payplus(db, client, payplus_app):
    user = make_user(db)
    client.post("/api/me/subscription", headers=auth(user))
    body, headers = callback({"uid": "tx-300", "payment_request_uid": "pr-1", "status_code": "000", "amount": 79,
                              "more_info": "sub:x", "recurring_charge_information": {"recurring_uid": "rec-1"}})
    client.post("/api/webhooks/payments/payplus", content=body, headers=headers)
    db.expire_all()
    sub = db.query(Subscription).one()
    assert sub.status == SubscriptionStatus.active and sub.provider_ref == "rec-1"
    first_end = sub.current_period_end
    body, headers = callback({"uid": "tx-301", "status_code": "000", "amount": 79,
                              "recurring_charge_information": {"recurring_uid": "rec-1"}})
    client.post("/api/webhooks/payments/payplus", content=body, headers=headers)
    db.expire_all()
    assert db.query(Subscription).one().current_period_end > first_end  # renewal extends the period
    body, headers = callback({"uid": "tx-302", "status_code": "051", "amount": 79,
                              "recurring_charge_information": {"recurring_uid": "rec-1"}})
    client.post("/api/webhooks/payments/payplus", content=body, headers=headers)
    db.expire_all()
    assert db.query(Subscription).one().status == SubscriptionStatus.past_due
