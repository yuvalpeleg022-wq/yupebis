"""Development/test payment provider with real HMAC webhook verification.

Use ``sign_webhook`` (or the dev-only /api/dev/pay endpoint) to simulate the provider
calling back after a successful payment.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets

from app.services.payments.base import (
    CheckoutSession,
    NormalizedEvent,
    PaymentProvider,
    SubscriptionCheckout,
    WebhookVerificationError,
)

SIG_HEADER = "x-triad-signature"


def sign_webhook(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


class MockPaymentProvider(PaymentProvider):
    name = "mock"
    supports_recurring = True
    supports_refunds = True
    supports_invoices = False

    def __init__(self, webhook_secret: str, public_base_url: str):
        self.secret = webhook_secret
        self.base = public_base_url.rstrip("/")
        self.refunds: list[tuple[str, int, str]] = []
        self.canceled: list[str] = []

    def create_checkout(self, *, order_id, amount_cents, currency, description, customer_email,
                        success_url, cancel_url) -> CheckoutSession:
        ref = f"mock_pay_{secrets.token_hex(8)}"
        return CheckoutSession(provider_ref=ref, redirect_url=f"{self.base}/checkout/mock?ref={ref}&order={order_id}")

    def create_subscription(self, *, subscription_id, plan, amount_cents, currency, customer_email,
                            success_url, cancel_url) -> SubscriptionCheckout:
        ref = f"mock_sub_{secrets.token_hex(8)}"
        return SubscriptionCheckout(provider_ref=ref, redirect_url=f"{self.base}/checkout/mock?sub={ref}")

    def cancel_subscription(self, provider_ref: str) -> None:
        self.canceled.append(provider_ref)

    def refund(self, provider_ref: str, amount_cents: int, reason: str) -> str:
        self.refunds.append((provider_ref, amount_cents, reason))
        return f"mock_refund_{secrets.token_hex(6)}"

    def parse_webhook(self, headers, body) -> NormalizedEvent:
        sig = {k.lower(): v for k, v in headers.items()}.get(SIG_HEADER, "")
        if not hmac.compare_digest(sig, sign_webhook(self.secret, body)):
            raise WebhookVerificationError("bad signature")
        try:
            data = json.loads(body)
            return NormalizedEvent(event_id=data["id"], type=data["type"], provider_ref=data["ref"],
                                   amount_cents=data.get("amount_cents"), currency=data.get("currency"), raw=data)
        except (KeyError, ValueError) as e:
            raise WebhookVerificationError(f"malformed payload: {e}") from e
