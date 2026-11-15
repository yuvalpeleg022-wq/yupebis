"""Database models for TRIAD SITE MARKET.

Key invariants enforced at the database level (not only in application code):
  * ``ownerships.website_id`` is UNIQUE -> a website can have at most one owner, ever.
  * ``orders`` has a partial unique index on ``website_id WHERE status = 'paid'``
    -> at most one successful payment per website.
  * A website whose status is ``sold`` can never change status again (ORM guard below).
  * Customer modifications live in ``customer_sites`` - the original ``websites.spec``
    is never mutated after sale and never receives a buyer's private changes.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
    inspect,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from app.db import Base

JSONType = JSON().with_variant(JSONB(), "postgresql")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    customer = "customer"
    admin = "admin"


class WebsiteStatus(str, enum.Enum):
    generating = "generating"
    in_review = "in_review"  # passed automated QC, waiting for admin
    rejected = "rejected"  # failed QC or rejected by admin; never public
    listed = "listed"  # publicly purchasable
    reserved = "reserved"  # checkout in progress, hidden from inventory
    sold = "sold"  # terminal
    archived = "archived"  # withdrawn by admin before sale


PUBLIC_STATUSES = (WebsiteStatus.listed,)


class OrderStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    expired = "expired"
    conflict_refunded = "conflict_refunded"  # paid but website no longer available -> refunded
    refunded = "refunded"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    past_due = "past_due"
    canceled = "canceled"  # remains usable until current_period_end
    expired = "expired"


class GenerationStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class ReviewDecision(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


def _enum(e: type[enum.Enum]) -> Enum:
    return Enum(e, native_enum=False, length=32, validate_strings=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(200))
    role: Mapped[UserRole] = mapped_column(_enum(UserRole), default=UserRole.customer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Website(Base):
    """A one-of-one marketplace product. ``spec`` is the original source project."""

    __tablename__ = "websites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    sku: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    tagline: Mapped[str] = mapped_column(String(300), default="")
    category: Mapped[str] = mapped_column(String(64), index=True)
    design_direction: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[WebsiteStatus] = mapped_column(
        _enum(WebsiteStatus), default=WebsiteStatus.generating, index=True
    )
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="ILS")

    spec: Mapped[dict] = mapped_column(JSONType)
    spec_hash: Mapped[str] = mapped_column(String(64), index=True)
    fingerprint: Mapped[dict] = mapped_column(JSONType, default=dict)
    quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    qc_report: Mapped[dict] = mapped_column(JSONType, default=dict)

    reserved_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    reserved_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    sold_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    listed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    generation_job_id: Mapped[str | None] = mapped_column(String(36))
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    assets: Mapped[list[WebsiteAsset]] = relationship(back_populates="website")


class WebsiteAsset(Base):
    __tablename__ = "website_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    website_id: Mapped[str] = mapped_column(ForeignKey("websites.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32))  # image | font | icon | illustration
    uri: Mapped[str] = mapped_column(String(1000))
    license: Mapped[str] = mapped_column(String(200))  # e.g. "generated", "CC0", "Unsplash License"
    source: Mapped[str] = mapped_column(String(200))
    attribution: Mapped[str | None] = mapped_column(String(500))

    website: Mapped[Website] = relationship(back_populates="assets")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index(
            "uq_orders_one_paid_per_website",
            "website_id",
            unique=True,
            postgresql_where=text("status = 'paid'"),
            sqlite_where=text("status = 'paid'"),
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    website_id: Mapped[str] = mapped_column(ForeignKey("websites.id"), index=True)
    buyer_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[OrderStatus] = mapped_column(_enum(OrderStatus), default=OrderStatus.pending)
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    provider: Mapped[str] = mapped_column(String(32))
    provider_ref: Mapped[str | None] = mapped_column(String(200), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True)
    license_terms_version: Mapped[str] = mapped_column(String(32), default="2026-11")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Ownership(Base):
    """Immutable proof of exclusive ownership. One row per website, forever."""

    __tablename__ = "ownerships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    website_id: Mapped[str] = mapped_column(ForeignKey("websites.id"), unique=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), unique=True)
    original_spec_hash: Mapped[str] = mapped_column(String(64))
    license_terms_version: Mapped[str] = mapped_column(String(32))
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CustomerSite(Base):
    """The buyer's private working copy. Never shared, never fed back into generation."""

    __tablename__ = "customer_sites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    ownership_id: Mapped[str] = mapped_column(ForeignKey("ownerships.id"), unique=True)
    website_id: Mapped[str] = mapped_column(ForeignKey("websites.id"), unique=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    spec: Mapped[dict] = mapped_column(JSONType)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SiteRevision(Base):
    __tablename__ = "site_revisions"
    __table_args__ = (UniqueConstraint("customer_site_id", "revision"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    customer_site_id: Mapped[str] = mapped_column(ForeignKey("customer_sites.id"), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(16))  # initial | visual | ai | restore
    operations: Mapped[list] = mapped_column(JSONType, default=list)
    spec: Mapped[dict] = mapped_column(JSONType)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    plan: Mapped[str] = mapped_column(String(32))
    status: Mapped[SubscriptionStatus] = mapped_column(_enum(SubscriptionStatus))
    monthly_allowance: Mapped[int] = mapped_column(Integer)
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    provider: Mapped[str] = mapped_column(String(32))
    provider_ref: Mapped[str | None] = mapped_column(String(200), index=True)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    subscription_id: Mapped[str] = mapped_column(ForeignKey("subscriptions.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32))  # ai_edit
    units: Mapped[int] = mapped_column(Integer, default=1)
    customer_site_id: Mapped[str | None] = mapped_column(ForeignKey("customer_sites.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PaymentEvent(Base):
    """Webhook idempotency + audit trail."""

    __tablename__ = "payment_events"
    __table_args__ = (UniqueConstraint("provider", "event_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    provider: Mapped[str] = mapped_column(String(32))
    event_id: Mapped[str] = mapped_column(String(200))
    event_type: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSONType)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    category: Mapped[str] = mapped_column(String(64))
    design_direction: Mapped[str] = mapped_column(String(64))
    seed: Mapped[int] = mapped_column(Integer)
    status: Mapped[GenerationStatus] = mapped_column(
        _enum(GenerationStatus), default=GenerationStatus.queued
    )
    steps: Mapped[list] = mapped_column(JSONType, default=list)
    website_id: Mapped[str | None] = mapped_column(String(36))
    error: Mapped[str | None] = mapped_column(Text)
    requested_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    website_id: Mapped[str] = mapped_column(ForeignKey("websites.id"), index=True)
    decision: Mapped[ReviewDecision] = mapped_column(
        _enum(ReviewDecision), default=ReviewDecision.pending
    )
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    qc_report: Mapped[dict] = mapped_column(JSONType, default=dict)
    similarity: Mapped[dict] = mapped_column(JSONType, default=dict)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AICallLog(Base):
    __tablename__ = "ai_call_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    task: Mapped[str] = mapped_column(String(64), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(100))
    success: Mapped[bool] = mapped_column(Boolean)
    latency_ms: Mapped[int] = mapped_column(Integer)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    actor_id: Mapped[str | None] = mapped_column(String(36))
    action: Mapped[str] = mapped_column(String(64), index=True)
    entity: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    data: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SoldWebsiteMutationError(RuntimeError):
    pass


@event.listens_for(Session, "before_flush")
def _guard_sold_websites(session: Session, _ctx, _instances) -> None:
    """A sold website is terminal: its status, owner and original spec are frozen."""
    for obj in session.dirty:
        if not isinstance(obj, Website):
            continue
        state = inspect(obj)
        status_hist = state.attrs.status.history
        if status_hist.deleted and WebsiteStatus.sold in status_hist.deleted:
            raise SoldWebsiteMutationError(f"website {obj.id} is sold and cannot be relisted")
        if obj.status == WebsiteStatus.sold and not status_hist.added:
            for frozen in ("owner_id", "spec", "spec_hash"):
                if state.attrs[frozen].history.deleted:
                    raise SoldWebsiteMutationError(f"website {obj.id}: '{frozen}' is frozen after sale")
