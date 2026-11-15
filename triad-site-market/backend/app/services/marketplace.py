"""Exclusive one-of-one purchase flow.

Double-sale protection is layered:
  1. Reservation is a *conditional* UPDATE (``WHERE status='listed'``) executed under a
     row lock (``SELECT ... FOR UPDATE`` on PostgreSQL). Only one transaction can win.
  2. Finalization is again a conditional UPDATE that requires the buyer's own reservation.
  3. The database enforces ``UNIQUE(ownerships.website_id)`` and a partial unique index
     allowing only one ``paid`` order per website, so even a logic bug cannot create two owners.
  4. The ORM refuses any status change away from ``sold`` (see models._guard_sold_websites).
If a payment arrives for a website that was meanwhile sold to someone else, the payment
is refunded automatically and the order is marked ``conflict_refunded``.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    AuditLog,
    CustomerSite,
    Order,
    OrderStatus,
    Ownership,
    SiteRevision,
    User,
    Website,
    WebsiteStatus,
)
from app.services.payments.base import PaymentProvider


class PurchaseError(Exception):
    code = "purchase_error"
    http_status = 400


class NotAvailable(PurchaseError):
    code = "not_available"
    http_status = 409


class NotFound(PurchaseError):
    code = "not_found"
    http_status = 404


def now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is None:  # SQLite returns naive datetimes
        return dt.replace(tzinfo=timezone.utc)
    return dt


@dataclass
class CheckoutResult:
    order: Order
    redirect_url: str
    reserved_until: datetime


def _lock_website(db: Session, website_id: str) -> Website | None:
    return db.execute(select(Website).where(Website.id == website_id).with_for_update()).scalar_one_or_none()


def start_checkout(db: Session, provider: PaymentProvider, buyer: User, website_id: str,
                   idempotency_key: str) -> CheckoutResult:
    settings = get_settings()

    existing = db.scalar(select(Order).where(Order.idempotency_key == idempotency_key))
    if existing:
        if existing.buyer_id != buyer.id or existing.website_id != website_id:
            raise PurchaseError("idempotency key reused for a different request")
        site = db.get(Website, website_id)
        return CheckoutResult(existing, f"{settings.public_base_url}/checkout/mock?ref={existing.provider_ref}"
                              f"&order={existing.id}", _aware(site.reserved_until) if site else now())

    site = _lock_website(db, website_id)
    if site is None:
        raise NotFound("website not found")

    t = now()
    until = t + timedelta(minutes=settings.reservation_minutes)
    # Conditional reservation: listed, or reserved-but-expired, or already reserved by this buyer.
    res = db.execute(
        update(Website)
        .where(
            Website.id == website_id,
            or_(
                Website.status == WebsiteStatus.listed,
                and_(Website.status == WebsiteStatus.reserved, Website.reserved_until < t),
                and_(Website.status == WebsiteStatus.reserved, Website.reserved_by_id == buyer.id),
            ),
        )
        .values(status=WebsiteStatus.reserved, reserved_by_id=buyer.id, reserved_until=until,
                version=Website.version + 1)
        .execution_options(synchronize_session=False)
    )
    if res.rowcount != 1:
        db.rollback()
        raise NotAvailable("this website is no longer available")
    db.refresh(site)

    order = Order(website_id=site.id, buyer_id=buyer.id, amount_cents=site.price_cents, currency=site.currency,
                  provider=provider.name, idempotency_key=idempotency_key)
    db.add(order)
    db.flush()
    session = provider.create_checkout(
        order_id=order.id, amount_cents=order.amount_cents, currency=order.currency,
        description=f"TRIAD website {site.sku} - {site.title}", customer_email=buyer.email,
        success_url=f"{settings.public_base_url}/dashboard?order={order.id}",
        cancel_url=f"{settings.public_base_url}/sites/{site.slug}",
    )
    order.provider_ref = session.provider_ref
    db.add(AuditLog(actor_id=buyer.id, action="website.reserved", entity="website", entity_id=site.id,
                    data={"order_id": order.id, "until": until.isoformat()}))
    db.commit()
    return CheckoutResult(order, session.redirect_url, until)


def complete_purchase(db: Session, provider: PaymentProvider, order_id: str,
                      paid_amount_cents: int | None = None) -> Order:
    """Called from a verified payment webhook. Idempotent."""
    order = db.execute(select(Order).where(Order.id == order_id).with_for_update()).scalar_one_or_none()
    if order is None:
        raise NotFound("order not found")
    if order.status in (OrderStatus.paid, OrderStatus.conflict_refunded, OrderStatus.refunded):
        return order  # already processed
    if paid_amount_cents is not None and paid_amount_cents != order.amount_cents:
        order.status = OrderStatus.failed
        db.add(AuditLog(action="order.amount_mismatch", entity="order", entity_id=order.id,
                        data={"expected": order.amount_cents, "got": paid_amount_cents}))
        provider.refund(order.provider_ref or "", paid_amount_cents, "amount mismatch")
        db.commit()
        return order

    site = _lock_website(db, order.website_id)
    t = now()
    res = db.execute(
        update(Website)
        .where(
            Website.id == order.website_id,
            or_(
                and_(Website.status == WebsiteStatus.reserved, Website.reserved_by_id == order.buyer_id),
                Website.status == WebsiteStatus.listed,  # reservation lapsed but nobody took it
            ),
        )
        .values(status=WebsiteStatus.sold, owner_id=order.buyer_id, sold_at=t, reserved_by_id=None,
                reserved_until=None, version=Website.version + 1)
        .execution_options(synchronize_session=False)
    )
    if res.rowcount != 1:
        return _refund_conflict(db, provider, order)

    try:
        db.refresh(site)
        order.status = OrderStatus.paid
        order.paid_at = t
        db.flush()  # partial unique index: one paid order per website
        own = Ownership(website_id=site.id, owner_id=order.buyer_id, order_id=order.id,
                        original_spec_hash=site.spec_hash, license_terms_version=order.license_terms_version)
        db.add(own)
        db.flush()  # unique ownership per website
        private = copy.deepcopy(site.spec)  # buyer's private working copy
        cs = CustomerSite(ownership_id=own.id, website_id=site.id, owner_id=order.buyer_id, name=site.title,
                          spec=private, revision=1)
        db.add(cs)
        db.flush()
        db.add(SiteRevision(customer_site_id=cs.id, revision=1, source="initial", operations=[], spec=private))
        db.add(AuditLog(actor_id=order.buyer_id, action="website.sold", entity="website", entity_id=site.id,
                        data={"order_id": order.id, "ownership_id": own.id, "amount_cents": order.amount_cents}))
        db.commit()
    except IntegrityError:
        db.rollback()
        order = db.get(Order, order_id)
        return _refund_conflict(db, provider, order)
    return order


def _refund_conflict(db: Session, provider: PaymentProvider, order: Order) -> Order:
    refund_ref = provider.refund(order.provider_ref or "", order.amount_cents, "website no longer available")
    order.status = OrderStatus.conflict_refunded
    db.add(AuditLog(actor_id=order.buyer_id, action="order.conflict_refunded", entity="order", entity_id=order.id,
                    data={"website_id": order.website_id, "refund_ref": refund_ref}))
    db.commit()
    return order


def fail_payment(db: Session, order_id: str) -> Order | None:
    order = db.execute(select(Order).where(Order.id == order_id).with_for_update()).scalar_one_or_none()
    if order is None or order.status != OrderStatus.pending:
        return order
    order.status = OrderStatus.failed
    _release(db, order.website_id, order.buyer_id)
    db.commit()
    return order


def _release(db: Session, website_id: str, buyer_id: str) -> None:
    db.execute(
        update(Website)
        .where(Website.id == website_id, Website.status == WebsiteStatus.reserved, Website.reserved_by_id == buyer_id)
        .values(status=WebsiteStatus.listed, reserved_by_id=None, reserved_until=None, version=Website.version + 1)
        .execution_options(synchronize_session=False)
    )


def expire_reservations(db: Session) -> int:
    """Return lapsed reservations to inventory. Can never touch sold websites."""
    t = now()
    res = db.execute(
        update(Website)
        .where(Website.status == WebsiteStatus.reserved, Website.reserved_until < t)
        .values(status=WebsiteStatus.listed, reserved_by_id=None, reserved_until=None, version=Website.version + 1)
        .execution_options(synchronize_session=False)
    )
    db.execute(
        update(Order)
        .where(Order.status == OrderStatus.pending, Order.created_at < t - timedelta(hours=24))
        .values(status=OrderStatus.expired)
        .execution_options(synchronize_session=False)
    )
    db.commit()
    return res.rowcount or 0
