from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.public import preview_token
from app.api.schemas import AdminWebsite, DecisionIn, GenerateIn
from app.config import get_settings
from app.db import get_db
from app.generation import pipeline
from app.models import AICallLog, GenerationJob, Order, OrderStatus, ReviewRecord, User, Website, WebsiteStatus
from app.security import require_admin
from app.services import review

router = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


def _aw(w: Website) -> AdminWebsite:
    a = AdminWebsite.model_validate(w)
    a.page_count = len(w.spec.get("pages", []))
    return a


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    by_status = dict(db.execute(select(Website.status, func.count()).group_by(Website.status)).all())
    revenue = db.scalar(select(func.coalesce(func.sum(Order.amount_cents), 0)).where(Order.status == OrderStatus.paid))
    ai = db.execute(select(AICallLog.provider, func.count(), func.avg(AICallLog.latency_ms))
                    .group_by(AICallLog.provider)).all()
    return {
        "websites": {k.value: v for k, v in by_status.items()},
        "revenue_cents": revenue,
        "ai_calls": [{"provider": p, "calls": c, "avg_latency_ms": round(l or 0)} for p, c, l in ai],
    }


@router.post("/generate")
def generate(body: GenerateIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Synchronous in development; queue via Celery (app.worker.generate_website) in production."""
    if get_settings().env == "production":
        from app.worker import generate_website

        ids = [generate_website.delay(body.category, body.design_direction, admin.id).id for _ in range(body.count)]
        return {"queued": ids}
    results = []
    for i in range(body.count):
        seed = None if body.seed is None else body.seed + i
        job, site = pipeline.generate(db, category=body.category, direction=body.design_direction, seed=seed,
                                      requested_by_id=admin.id)
        results.append({"job_id": job.id, "status": job.status.value, "website_id": site.id if site else None,
                        "website_status": site.status.value if site else None, "error": job.error})
    return {"results": results}


@router.get("/jobs")
def jobs(db: Session = Depends(get_db), limit: int = Query(default=50, le=200)):
    rows = db.scalars(select(GenerationJob).order_by(GenerationJob.created_at.desc()).limit(limit)).all()
    return [{"id": j.id, "category": j.category, "direction": j.design_direction, "status": j.status.value,
             "website_id": j.website_id, "error": j.error, "steps": j.steps, "created_at": j.created_at} for j in rows]


@router.get("/websites", response_model=list[AdminWebsite])
def websites(db: Session = Depends(get_db), status: WebsiteStatus | None = None,
             limit: int = Query(default=100, le=500)):
    stmt = select(Website).order_by(Website.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(Website.status == status)
    return [_aw(w) for w in db.scalars(stmt)]


@router.get("/websites/{website_id}")
def website(website_id: str, db: Session = Depends(get_db)):
    w = db.get(Website, website_id)
    if not w:
        raise HTTPException(404)
    reviews = db.scalars(select(ReviewRecord).where(ReviewRecord.website_id == w.id)
                         .order_by(ReviewRecord.created_at.desc())).all()
    return {
        "website": _aw(w),
        "pages": [{"slug": p["slug"], "title": p["title"]} for p in w.spec["pages"]],
        "reviews": [{"decision": r.decision.value, "notes": r.notes, "similarity": r.similarity,
                     "decided_at": r.decided_at} for r in reviews],
        "preview": {"token": preview_token("website", w.id), "base": f"/api/preview/website/{w.id}/"},
    }


@router.post("/websites/{website_id}/decision", response_model=AdminWebsite)
def decide(website_id: str, body: DecisionIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return _aw(review.decide(db, admin, website_id, body.approve, body.notes, body.price_cents))
    except review.ReviewError as e:
        raise HTTPException(409, str(e)) from e


@router.post("/websites/{website_id}/archive", response_model=AdminWebsite)
def archive(website_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return _aw(review.archive(db, admin, website_id))
    except review.ReviewError as e:
        raise HTTPException(409, str(e)) from e
