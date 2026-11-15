"""PayPlus adapter (Israeli processor): hosted payment page, recurring billing, refunds, invoices.

Written against the public PayPlus REST API reference (docs.payplus.co.il):
  * POST PaymentPages/generateLink            -> hosted checkout (charge_method 1) or
                                                 recurring subscription (charge_method 3)
  * POST Transactions/RefundByTransactionUID  -> refund
  * POST RecurringPayments/DeleteRecurring/{uid}
  * Callbacks are authenticated with headers ``user-agent: PayPlus`` and
    ``hash: base64(HMAC-SHA256(secret_key, body))``.
Credentials come from the environment (TRIAD_PAYPLUS_*), never from code.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any

import httpx

from app.config import Settings
from app.services.payments.base import (
    CheckoutSession,
    NormalizedEvent,
    PaymentProvider,
    SubscriptionCheckout,
    WebhookVerificationError,
)

PROD = "https://restapi.payplus.co.il/api/v1.0"
SANDBOX = "https://restapidev.payplus.co.il/api/v1.0"


class PayPlusError(RuntimeError):
    pass


def callback_hash(secret_key: str, body: bytes) -> str:
    return base64.b64encode(hmac.new(secret_key.encode(), body, hashlib.sha256).digest()).decode()


class PayPlusProvider(PaymentProvider):
    name = "payplus"
    supports_recurring = True
    supports_refunds = True
    supports_invoices = True

    def __init__(self, settings: Settings, transport: httpx.BaseTransport | None = None):
        missing = [n for n in ("payplus_api_key", "payplus_secret_key", "payplus_payment_page_uid")
                   if not getattr(settings, n)]
        if missing:
            raise PayPlusError("PayPlus is not configured; set " + ", ".join("TRIAD_" + m.upper() for m in missing))
        self.s = settings
        self.base = SANDBOX if settings.payplus_sandbox else PROD
        self.http = httpx.Client(timeout=30.0, transport=transport)
        self.callback_url = f"{settings.public_api_url.rstrip('/')}/api/webhooks/payments/payplus"

    def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        try:
            r = self.http.post(f"{self.base}/{path}", json=body, headers={
                "api-key": self.s.payplus_api_key or "", "secret-key": self.s.payplus_secret_key or ""})
            data = r.json()
        except (httpx.HTTPError, ValueError) as e:
            raise PayPlusError(f"PayPlus request failed: {e}") from e
        res = data.get("results") or {}
        if r.status_code != 200 or res.get("status") != "success":
            raise PayPlusError(f"PayPlus {path} failed ({r.status_code}): {res.get('description') or data}")
        return data.get("data") or {}

    def _link(self, *, ref: str, amount_cents: int, currency: str, customer_email: str, success_url: str,
              cancel_url: str, extra: dict[str, Any]) -> tuple[str, str]:
        data = self._post("PaymentPages/generateLink", {
            "payment_page_uid": self.s.payplus_payment_page_uid,
            "amount": round(amount_cents / 100, 2),
            "currency_code": currency,
            "refURL_success": success_url,
            "refURL_failure": cancel_url,
            "refURL_cancel": cancel_url,
            "refURL_callback": self.callback_url,
            "send_failure_callback": True,
            "sendEmailApproval": True,
            "initial_invoice": self.s.payplus_issue_invoice,
            "more_info": ref,
            "customer": {"customer_name": customer_email, "email": customer_email},
            **extra,
        })
        try:
            return data["page_request_uid"], data["payment_page_link"]
        except KeyError as e:
            raise PayPlusError(f"PayPlus response missing {e}") from e

    def create_checkout(self, *, order_id, amount_cents, currency, description, customer_email,
                        success_url, cancel_url) -> CheckoutSession:
        uid, link = self._link(
            ref=f"order:{order_id}", amount_cents=amount_cents, currency=currency, customer_email=customer_email,
            success_url=success_url, cancel_url=cancel_url,
            extra={"charge_method": 1, "expiry_datetime": str(self.s.reservation_minutes),
                   "items": [{"name": description[:100], "quantity": 1, "price": round(amount_cents / 100, 2)}]})
        return CheckoutSession(provider_ref=uid, redirect_url=link)

    def create_subscription(self, *, subscription_id, plan, amount_cents, currency, customer_email,
                            success_url, cancel_url) -> SubscriptionCheckout:
        uid, link = self._link(
            ref=f"sub:{subscription_id}", amount_cents=amount_cents, currency=currency,
            customer_email=customer_email, success_url=success_url, cancel_url=cancel_url,
            extra={"charge_method": 3, "recurring_settings": {
                "instant_first_payment": True, "recurring_type": 2, "recurring_range": 1, "number_of_charges": 0,
                "start_date_on_payment_date": True, "start_date": 1, "jump_payments": 0,
                "successful_invoice": self.s.payplus_issue_invoice, "customer_failure_email": True,
                "send_customer_success_email": True}})
        return SubscriptionCheckout(provider_ref=uid, redirect_url=link)

    def cancel_subscription(self, provider_ref: str) -> None:
        self._post(f"RecurringPayments/DeleteRecurring/{provider_ref}",
                   {"terminal_uid": self.s.payplus_terminal_uid} if self.s.payplus_terminal_uid else {})

    def refund(self, provider_ref: str, amount_cents: int, reason: str) -> str:
        data = self._post("Transactions/RefundByTransactionUID", {
            "transaction_uid": provider_ref, "amount": round(amount_cents / 100, 2), "more_info": reason[:200]})
        return (data.get("transaction") or {}).get("uid", "")

    def parse_webhook(self, headers, body) -> NormalizedEvent:
        h = {k.lower(): v for k, v in headers.items()}
        if h.get("user-agent") != "PayPlus":
            raise WebhookVerificationError("unexpected user-agent")
        if not hmac.compare_digest(h.get("hash", ""), callback_hash(self.s.payplus_secret_key or "", body)):
            raise WebhookVerificationError("bad hash")
        try:
            data = json.loads(body)
            tx = data["transaction"]
            uid = tx["uid"]
        except (ValueError, KeyError, TypeError) as e:
            raise WebhookVerificationError(f"malformed payload: {e}") from e

        ok = str(tx.get("status_code")) == "000"
        kind = str(data.get("transaction_type", "")).lower()
        recurring = (tx.get("recurring_charge_information") or {}).get("recurring_uid")
        page_uid = tx.get("payment_request_uid")
        is_sub = bool(recurring) or str(tx.get("more_info", "")).startswith("sub:")
        amount = tx.get("amount")
        common = dict(amount_cents=None if amount is None else int(round(float(amount) * 100)),
                      currency=tx.get("currency"), raw=data, transaction_ref=uid,
                      invoice_url=(data.get("invoice") or {}).get("original_url"))
        if kind == "refund":
            return NormalizedEvent(event_id=f"refund:{uid}", type="refund.succeeded", provider_ref=page_uid or uid, **common)
        if is_sub:
            etype = "subscription.renewed" if ok else "subscription.payment_failed"
            return NormalizedEvent(event_id=f"sub:{uid}", type=etype, provider_ref=page_uid or recurring or uid,
                                   replacement_ref=recurring, **common)
        return NormalizedEvent(event_id=f"pay:{uid}", type="payment.succeeded" if ok else "payment.failed",
                               provider_ref=page_uid or uid, **common)
