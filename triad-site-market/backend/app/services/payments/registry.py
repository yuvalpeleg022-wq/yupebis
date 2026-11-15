from functools import lru_cache

from app.config import get_settings
from app.services.payments.base import PaymentProvider
from app.services.payments.mock import MockPaymentProvider


@lru_cache
def get_provider(name: str | None = None) -> PaymentProvider:
    s = get_settings()
    name = name or s.payment_provider
    if name == "mock":
        if s.env == "production":
            raise RuntimeError("mock payment provider is not allowed in production")
        return MockPaymentProvider(s.payment_webhook_secret, s.public_base_url)
    if name == "payplus":
        from app.services.payments.payplus import PayPlusProvider

        return PayPlusProvider(s)
    # Other adapters (e.g. an Israeli recurring-billing processor) are registered here once
    # the business selects a provider and credentials are provisioned.
    raise RuntimeError(f"payment provider '{name}' is not configured")
