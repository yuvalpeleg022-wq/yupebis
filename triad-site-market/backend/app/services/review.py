"""Admin review: nothing reaches public inventory without passing QC AND human approval."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, ReviewDecision, ReviewRecord, User, Website, WebsiteStatus


class ReviewError(Exception):
    http_status = 409


def decide(db: Session, admin: User, website_id: str, approve: bool, notes: str | None = None,
           price_cents: int | None = None) -> Website:
    site = db.execute(select(Website).where(Website.id == website_id).with_for_update()).scalar_one_or_none()
    if site is None:
        raise ReviewError("website not found")
    if site.status != WebsiteStatus.in_review:
        raise ReviewError(f"website is '{site.status.value}', only 'in_review' websites can be decided")
    if approve and not site.qc_report.get("passed"):
        raise ReviewError("cannot approve a website that failed automated QC")
    review = db.scalar(select(ReviewRecord).where(ReviewRecord.website_id == site.id,
                                                  ReviewRecord.decision == ReviewDecision.pending))
    if review is None:
        review = ReviewRecord(website_id=site.id, qc_report=site.qc_report)
        db.add(review)
    t = datetime.now(timezone.utc)
    review.decision = ReviewDecision.approved if approve else ReviewDecision.rejected
    review.reviewer_id = admin.id
    review.notes = notes
    review.decided_at = t
    if approve:
        if price_cents is not None:
            site.price_cents = price_cents
        site.status = WebsiteStatus.listed
        site.listed_at = t
    else:
        site.status = WebsiteStatus.rejected
    db.add(AuditLog(actor_id=admin.id, action="website.approved" if approve else "website.rejected",
                    entity="website", entity_id=site.id, data={"notes": notes}))
    db.commit()
    return site


def archive(db: Session, admin: User, website_id: str) -> Website:
    site = db.execute(select(Website).where(Website.id == website_id).with_for_update()).scalar_one_or_none()
    if site is None or site.status not in (WebsiteStatus.listed, WebsiteStatus.in_review):
        raise ReviewError("only listed or in-review websites can be archived")
    site.status = WebsiteStatus.archived
    db.add(AuditLog(actor_id=admin.id, action="website.archived", entity="website", entity_id=site.id))
    db.commit()
    return site
