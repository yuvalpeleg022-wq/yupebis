from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.schemas import LoginIn, RegisterIn, TokenOut, UserOut, WebsiteCard, WebsiteDetail
from app.config import get_settings
from app.db import get_db
from app.generation.catalog import CATEGORIES, DIRECTIONS
from app.generation.renderer import render_page
from app.generation.spec import SiteSpec
from app.models import CustomerSite, User, Website, WebsiteStatus
from app.security import create_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/api")


def card(w: Website) -> WebsiteCard:
    c = WebsiteCard.model_validate(w)
    c.page_count = len(w.spec.get("pages", []))
    return c


@router.post("/auth/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "email already registered")
    u = User(email=email, password_hash=hash_password(body.password), full_name=body.full_name)
    db.add(u)
    db.commit()
    return TokenOut(access_token=create_token(u), user=UserOut.model_validate(u))


@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == body.email.lower()))
    if not u or not verify_password(body.password, u.password_hash) or not u.is_active:
        raise HTTPException(401, "invalid credentials")
    return TokenOut(access_token=create_token(u), user=UserOut.model_validate(u))


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.get("/catalog")
def catalog():
    return {
        "categories": [{"key": c.key, "label": c.label} for c in CATEGORIES.values()],
        "design_directions": [{"key": d.key, "label": d.label} for d in DIRECTIONS.values()],
    }


@router.get("/websites", response_model=dict)
def list_websites(
    db: Session = Depends(get_db),
    category: str | None = None,
    direction: str | None = None,
    q: str | None = Query(default=None, max_length=100),
    sort: str = Query(default="newest", pattern="^(newest|price_asc|price_desc|quality)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=60),
):
    """Public inventory: only `listed` websites. Reserved and sold sites never appear."""
    stmt = select(Website).where(Website.status == WebsiteStatus.listed)
    if category:
        stmt = stmt.where(Website.category == category)
    if direction:
        stmt = stmt.where(Website.design_direction == direction)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(Website.title).like(like) | func.lower(Website.tagline).like(like))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = {
        "newest": Website.listed_at.desc(),
        "price_asc": Website.price_cents.asc(),
        "price_desc": Website.price_cents.desc(),
        "quality": Website.quality_score.desc(),
    }[sort]
    items = db.scalars(stmt.order_by(order, Website.id).offset((page - 1) * page_size).limit(page_size)).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [card(w) for w in items]}


@router.get("/websites/{slug}", response_model=WebsiteDetail)
def website_detail(slug: str, db: Session = Depends(get_db)):
    w = db.scalar(select(Website).where(Website.slug == slug))
    if not w or w.status not in (WebsiteStatus.listed, WebsiteStatus.reserved, WebsiteStatus.sold):
        raise HTTPException(404, "website not found")
    t = w.spec["theme"]
    return WebsiteDetail(
        **card(w).model_dump(),
        pages=[{"slug": p["slug"], "title": p["title"]} for p in w.spec["pages"]],
        theme={"palette": t["palette"], "fonts": [t["typography"]["heading_font"], t["typography"]["body_font"]]},
        status="available" if w.status == WebsiteStatus.listed else "unavailable",
    )


# ---------------------------------------------------------------- previews

PREVIEW_CSP = (
    "default-src 'none'; img-src data: https:; style-src 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; form-action 'none'; base-uri 'none'; frame-ancestors {origin}"
)


def preview_token(kind: str, obj_id: str, minutes: int = 30) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode({"purpose": "preview", "kind": kind, "id": obj_id, "exp": exp}, get_settings().jwt_secret,
                      algorithm="HS256")


def _check_preview_token(token: str | None, kind: str, obj_id: str) -> bool:
    if not token:
        return False
    try:
        p = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return False
    return p.get("purpose") == "preview" and p.get("kind") == kind and p.get("id") == obj_id


def html_response(html: str) -> Response:
    s = get_settings()
    return Response(html, media_type="text/html; charset=utf-8", headers={
        "Content-Security-Policy": PREVIEW_CSP.format(origin=s.public_base_url),
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "private, max-age=60",
    })


@router.get("/preview/website/{website_id}/{page}.html", include_in_schema=False)
def preview_website(website_id: str, page: str, token: str | None = None, db: Session = Depends(get_db)):
    w = db.get(Website, website_id)
    if not w:
        raise HTTPException(404)
    public = w.status == WebsiteStatus.listed
    if not public and not _check_preview_token(token, "website", w.id):
        raise HTTPException(404)
    spec = SiteSpec.model_validate(w.spec)
    if not spec.page(page):
        raise HTTPException(404)
    return html_response(render_page(spec, page, preview_banner=f"TRIAD preview · {w.sku}"))


@router.get("/preview/site/{site_id}/{page}.html", include_in_schema=False)
def preview_customer_site(site_id: str, page: str, token: str | None = None, db: Session = Depends(get_db)):
    cs = db.get(CustomerSite, site_id)
    if not cs or not _check_preview_token(token, "site", cs.id):
        raise HTTPException(404)
    spec = SiteSpec.model_validate(cs.spec)
    if not spec.page(page):
        raise HTTPException(404)
    return html_response(render_page(spec, page))
