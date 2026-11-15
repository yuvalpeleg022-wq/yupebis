"""AI editor subscriptions - completely independent of website ownership.

Canceling, expiring or failing to pay for a subscription only affects access to the AI
chat editor. It never touches ``ownerships``, ``customer_sites`` or ``websites``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AuditLog, Subscription, SubscriptionStatus, UsageEvent, User
from app.services.payments.base import PaymentProvider


@dataclass(frozen=True)
class Plan:
    key: str
    label: str
    price_cents: int
    currency: str
    monthly_ai_edits: int


def plans() -> dict[str, Plan]:
    s = get_settings()
    return {
        "ai_pro": Plan("ai_pro", "AI Editor Pro", 7900, s.default_currency, s.ai_plan_monthly_edits),
    }


class SubscriptionError(Exception):
    http_status = 402


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def now() -> datetime:
    return datetime.now(timezone.utc)


def active_subscription(db: Session, user_id: str) -> Subscription | None:
    t = now()
    subs = db.scalars(select(Subscription).where(Subscription.user_id == user_id)
                      .order_by(Subscription.created_at.desc())).all()
    for s in subs:
        if s.status in (SubscriptionStatus.active, SubscriptionStatus.canceled) and _aware(s.current_period_end) > t:
            return s
    return None


def start_subscription(db: Session, provider: PaymentProvider, user: User, plan_key: str) -> tuple[Subscription, str]:
    plan = plans().get(plan_key)
    if plan is None:
        raise SubscriptionError("unknown plan")
    if active_subscription(db, user.id):
        raise SubscriptionError("already subscribed")
    t = now()
    sub = Subscription(user_id=user.id, plan=plan.key, status=SubscriptionStatus.past_due,
                       monthly_allowance=plan.monthly_ai_edits, current_period_start=t, current_period_end=t,
                       provider=provider.name)
    db.add(sub)
    db.flush()
    s = get_settings()
    checkout = provider.create_subscription(
        subscription_id=sub.id, plan=plan.key, amount_cents=plan.price_cents, currency=plan.currency,
        customer_email=user.email, success_url=f"{s.public_base_url}/dashboard?subscribed=1",
        cancel_url=f"{s.public_base_url}/pricing")
    sub.provider_ref = checkout.provider_ref
    db.commit()
    return sub, checkout.redirect_url


def activate_or_renew(db: Session, provider_ref: str) -> Subscription | None:
    sub = db.scalar(select(Subscription).where(Subscription.provider_ref == provider_ref))
    if sub is None:
        return None
    t = now()
    start = max(t, _aware(sub.current_period_end)) if sub.status == SubscriptionStatus.active else t
    sub.current_period_start = start
    sub.current_period_end = start + timedelta(days=30)
    if sub.status != SubscriptionStatus.canceled:
        sub.status = SubscriptionStatus.active
    db.add(AuditLog(actor_id=sub.user_id, action="subscription.renewed", entity="subscription", entity_id=sub.id))
    db.commit()
    return sub


def mark_past_due(db: Session, provider_ref: str) -> None:
    sub = db.scalar(select(Subscription).where(Subscription.provider_ref == provider_ref))
    if sub and sub.status == SubscriptionStatus.active:
        sub.status = SubscriptionStatus.past_due
        db.commit()


def cancel(db: Session, provider: PaymentProvider, user: User) -> Subscription:
    sub = active_subscription(db, user.id)
    if sub is None:
        raise SubscriptionError("no active subscription")
    if sub.provider_ref:
        provider.cancel_subscription(sub.provider_ref)
    sub.status = SubscriptionStatus.canceled  # access continues until current_period_end
    sub.canceled_at = now()
    db.add(AuditLog(actor_id=user.id, action="subscription.canceled", entity="subscription", entity_id=sub.id))
    db.commit()
    return sub


def usage_this_period(db: Session, sub: Subscription) -> int:
    return db.scalar(
        select(func.coalesce(func.sum(UsageEvent.units), 0)).where(
            UsageEvent.subscription_id == sub.id, UsageEvent.created_at >= sub.current_period_start)
    ) or 0


def require_ai_allowance(db: Session, user: User, units: int = 1) -> Subscription:
    sub = active_subscription(db, user.id)
    if sub is None:
        raise SubscriptionError("an active AI Editor subscription is required")
    if usage_this_period(db, sub) + units > sub.monthly_allowance:
        raise SubscriptionError("monthly AI edit allowance exhausted")
    return sub


def record_usage(db: Session, user: User, sub: Subscription, customer_site_id: str, units: int = 1) -> None:
    db.add(UsageEvent(user_id=user.id, subscription_id=sub.id, kind="ai_edit", units=units,
                      customer_site_id=customer_site_id))
