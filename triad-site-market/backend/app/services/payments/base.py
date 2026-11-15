"""Payment provider abstraction.

Concrete adapters (e.g. an Israeli processor supporting recurring billing, refunds and
tax invoices) implement this interface. No provider credentials live in code; adapters
read them from environment/secret storage. Choosing and connecting a real provider
requires business approval.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Literal

EventType = Literal[
    "payment.succeeded",
    "payment.failed",
    "refund.succeeded",
    "subscription.activated",
    "subscription.renewed",
    "subscription.payment_failed",
    "subscription.canceled",
]


@dataclass
class CheckoutSession:
    provider_ref: str
    redirect_url: str


@dataclass
class SubscriptionCheckout:
    provider_ref: str
    redirect_url: str


@dataclass
class NormalizedEvent:
    event_id: str
    type: EventType
    provider_ref: str  # order or subscription reference at the provider
    amount_cents: int | None = None
    currency: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)
    transaction_ref: str | None = None  # provider transaction id (needed for refunds)
    replacement_ref: str | None = None  # long-lived id that replaces provider_ref (e.g. recurring uid)
    invoice_url: str | None = None


class WebhookVerificationError(Exception):
    pass


class PaymentProvider(ABC):
    name: str
    supports_recurring: bool = False
    supports_refunds: bool = False
    supports_invoices: bool = False

    @abstractmethod
    def create_checkout(self, *, order_id: str, amount_cents: int, currency: str, description: str,
                        customer_email: str, success_url: str, cancel_url: str) -> CheckoutSession: ...

    @abstractmethod
    def create_subscription(self, *, subscription_id: str, plan: str, amount_cents: int, currency: str,
                            customer_email: str, success_url: str, cancel_url: str) -> SubscriptionCheckout: ...

    @abstractmethod
    def cancel_subscription(self, provider_ref: str) -> None: ...

    @abstractmethod
    def refund(self, provider_ref: str, amount_cents: int, reason: str) -> str: ...

    @abstractmethod
    def parse_webhook(self, headers: dict[str, str], body: bytes) -> NormalizedEvent:
        """Verify the signature and normalize. Must raise WebhookVerificationError if invalid."""
