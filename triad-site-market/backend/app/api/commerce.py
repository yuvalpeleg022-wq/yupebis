import io
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai.router import AIRouter, RoutingError
from app.api.public import preview_token
from app.api.schemas import (
    AIEditIn,
    AIEditOut,
    CheckoutIn,
    CheckoutOut,
    CustomerSiteDetail,
    CustomerSiteOut,
    OrderOut,
    SubscriptionOut,
)
from app.config import get_settings
from app.db import get_db
from app.editor.ai_editor import plan_edit
from app.editor.ops import EditError, OperationBatch, apply_operations
from app.generation.renderer import render_site
from app.generation.spec import SiteSpec
from app.models import (
    AuditLog,
    CustomerSite,
    Order,
    Ownership,
    PaymentEvent,
    SiteRevision,
    User,
    Website,
)
from app.security import current_user
from app.services import marketplace, subscriptions
from app.services.payments.base import WebhookVerificationError
from app.services.payments.registry import get_provider

router = APIRouter(prefix="/api")


def _err(e: Exception):
    raise HTTPException(getattr(e, "http_status", 400), str(e)) from e


# ---------------------------------------------------------------- checkout


@router.post("/websites/{website_id}/checkout", response_model=CheckoutOut)
def checkout(website_id: str, body: CheckoutIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        r = marketplace.start_checkout(db, get_provider(), user, website_id, body.idempotency_key)
    except marketplace.PurchaseError as e:
        _err(e)
    return CheckoutOut(order_id=r.order.id, redirect_url=r.redirect_url, reserved_until=r.reserved_until,
                       amount_cents=r.order.amount_cents, currency=r.order.currency)


@router.get("/orders", response_model=list[OrderOut])
def my_orders(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Order).where(Order.buyer_id == user.id).order_by(Order.created_at.desc())).all()


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    o = db.get(Order, order_id)
    if not o or o.buyer_id != user.id:
        raise HTTPException(404)
    return o


@router.post("/webhooks/payments/{provider_name}", include_in_schema=False)
async def payment_webhook(provider_name: str, request: Request, db: Session = Depends(get_db)):
    try:
        provider = get_provider(provider_name)
    except RuntimeError:
        raise HTTPException(404) from None
    body = await request.body()
    try:
        ev = provider.parse_webhook(dict(request.headers), body)
    except WebhookVerificationError as e:
        raise HTTPException(400, f"invalid webhook: {e}") from e
    try:  # idempotency
        db.add(PaymentEvent(provider=provider.name, event_id=ev.event_id, event_type=ev.type, payload=ev.raw))
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"status": "duplicate"}

    if ev.type in ("payment.succeeded", "payment.failed"):
        order = db.scalar(select(Order).where(Order.provider == provider.name, Order.provider_ref == ev.provider_ref))
        if order is None:
            return {"status": "unknown_order"}
        if ev.type == "payment.succeeded":
            o = marketplace.complete_purchase(db, provider, order.id, ev.amount_cents)
        else:
            o = marketplace.fail_payment(db, order.id)
        return {"status": o.status.value if o else "ignored"}
    if ev.type in ("subscription.activated", "subscription.renewed"):
        subscriptions.activate_or_renew(db, ev.provider_ref)
    elif ev.type == "subscription.payment_failed":
        subscriptions.mark_past_due(db, ev.provider_ref)
    return {"status": "ok"}


# ---------------------------------------------------------------- owned sites


def _owned(db: Session, user: User, site_id: str) -> CustomerSite:
    cs = db.get(CustomerSite, site_id)
    if not cs or cs.owner_id != user.id:
        raise HTTPException(404, "site not found")
    return cs


def _detail(db: Session, cs: CustomerSite) -> CustomerSiteDetail:
    own = db.get(Ownership, cs.ownership_id)
    w = db.get(Website, cs.website_id)
    return CustomerSiteDetail(
        id=cs.id, website_id=cs.website_id, name=cs.name, revision=cs.revision, updated_at=cs.updated_at,
        spec=cs.spec, sku=w.sku, acquired_at=own.acquired_at, license_terms_version=own.license_terms_version)


@router.get("/me/sites", response_model=list[CustomerSiteOut])
def my_sites(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Ownership is permanent and independent of any subscription."""
    return db.scalars(select(CustomerSite).where(CustomerSite.owner_id == user.id)
                      .order_by(CustomerSite.updated_at.desc())).all()


@router.get("/me/sites/{site_id}", response_model=CustomerSiteDetail)
def my_site(site_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _detail(db, _owned(db, user, site_id))


@router.post("/me/sites/{site_id}/preview-token")
def site_preview_token(site_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    cs = _owned(db, user, site_id)
    return {"token": preview_token("site", cs.id), "base": f"/api/preview/site/{cs.id}/"}


def _save(db: Session, cs: CustomerSite, new_spec: dict, source: str, ops: list) -> None:
    cs.revision += 1
    cs.spec = new_spec
    cs.updated_at = datetime.now(timezone.utc)
    db.add(SiteRevision(customer_site_id=cs.id, revision=cs.revision, source=source, operations=ops, spec=new_spec))


@router.post("/me/sites/{site_id}/edits", response_model=CustomerSiteDetail)
def visual_edit(site_id: str, body: OperationBatch, revision: int, user: User = Depends(current_user),
                db: Session = Depends(get_db)):
    """Free visual editor. ``revision`` provides optimistic concurrency control."""
    cs = _owned(db, user, site_id)
    if cs.revision != revision:
        raise HTTPException(409, "site was modified elsewhere; reload")
    try:
        new_spec = apply_operations(cs.spec, body.operations)
    except EditError as e:
        raise HTTPException(422, str(e)) from e
    _save(db, cs, new_spec, "visual", [o.model_dump(mode="json") for o in body.operations])
    db.commit()
    return _detail(db, cs)


@router.post("/me/sites/{site_id}/ai-edit", response_model=AIEditOut)
def ai_edit(site_id: str, body: AIEditIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Premium AI chat editor - requires an active subscription with remaining allowance."""
    cs = _owned(db, user, site_id)
    if cs.revision != body.revision:
        raise HTTPException(409, "site was modified elsewhere; reload")
    try:
        sub = subscriptions.require_ai_allowance(db, user)
    except subscriptions.SubscriptionError as e:
        raise HTTPException(402, str(e)) from e
    try:
        plan, new_spec = plan_edit(AIRouter(db=db), cs.spec, body.instruction)
    except (RoutingError, EditError) as e:
        db.commit()  # keep AI call logs
        raise HTTPException(502, f"AI edit failed: {e}") from e
    ops = [o.model_dump(mode="json") for o in plan.operations]
    if ops:
        _save(db, cs, new_spec, "ai", ops)
        subscriptions.record_usage(db, user, sub, cs.id)
    db.commit()
    used = subscriptions.usage_this_period(db, sub)
    return AIEditOut(summary=plan.summary, operations=ops, site=_detail(db, cs),
                     usage={"used": used, "allowance": sub.monthly_allowance})


@router.get("/me/sites/{site_id}/revisions")
def revisions(site_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    cs = _owned(db, user, site_id)
    revs = db.scalars(select(SiteRevision).where(SiteRevision.customer_site_id == cs.id)
                      .order_by(SiteRevision.revision.desc()).limit(50)).all()
    return [{"revision": r.revision, "source": r.source, "operations": len(r.operations), "created_at": r.created_at}
            for r in revs]


@router.post("/me/sites/{site_id}/restore/{rev}", response_model=CustomerSiteDetail)
def restore(site_id: str, rev: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    cs = _owned(db, user, site_id)
    r = db.scalar(select(SiteRevision).where(SiteRevision.customer_site_id == cs.id, SiteRevision.revision == rev))
    if not r:
        raise HTTPException(404)
    _save(db, cs, r.spec, "restore", [{"restored_from": rev}])
    db.commit()
    return _detail(db, cs)


@router.get("/me/sites/{site_id}/export.zip")
def export_site(site_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Deliver the owned website as a self-contained static site."""
    cs = _owned(db, user, site_id)
    files = render_site(SiteSpec.model_validate(cs.spec))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, html in files.items():
            z.writestr(name, html)
        z.writestr("LICENSE.txt", f"Exclusive website license - TRIAD SITE MARKET\nSite: {cs.name}\n"
                                  f"Owner: {user.email}\nTerms version: {db.get(Ownership, cs.ownership_id).license_terms_version}\n")
    db.add(AuditLog(actor_id=user.id, action="site.exported", entity="customer_site", entity_id=cs.id))
    db.commit()
    return Response(buf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="site-{cs.id[:8]}.zip"'})


# ---------------------------------------------------------------- subscription


@router.get("/subscription/plans")
def list_plans():
    return [p.__dict__ for p in subscriptions.plans().values()]


@router.get("/me/subscription", response_model=SubscriptionOut | None)
def my_subscription(user: User = Depends(current_user), db: Session = Depends(get_db)):
    sub = subscriptions.active_subscription(db, user.id)
    if not sub:
        return None
    out = SubscriptionOut.model_validate(sub)
    out.used_this_period = subscriptions.usage_this_period(db, sub)
    return out


@router.post("/me/subscription")
def subscribe(plan: str = "ai_pro", user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        sub, url = subscriptions.start_subscription(db, get_provider(), user, plan)
    except subscriptions.SubscriptionError as e:
        raise HTTPException(409, str(e)) from e
    return {"subscription_id": sub.id, "redirect_url": url, "provider_ref": sub.provider_ref}


@router.delete("/me/subscription", response_model=SubscriptionOut)
def cancel_subscription(user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        sub = subscriptions.cancel(db, get_provider(), user)
    except subscriptions.SubscriptionError as e:
        raise HTTPException(404, str(e)) from e
    return SubscriptionOut.model_validate(sub)


def ensure_dev():
    if get_settings().env == "production":
        raise HTTPException(404)
