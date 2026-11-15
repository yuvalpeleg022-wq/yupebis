"""Celery worker: background generation and reservation expiry.

Run:  celery -A app.worker worker -B --loglevel=info
"""

from celery import Celery

from app.config import get_settings
from app.db import SessionLocal

s = get_settings()
celery = Celery("triad", broker=s.redis_url, backend=s.redis_url)
celery.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={"expire-reservations": {"task": "app.worker.expire_reservations", "schedule": 60.0}},
)


@celery.task(name="app.worker.generate_website", bind=True, max_retries=2)
def generate_website(self, category=None, direction=None, requested_by_id=None):
    from app.generation import pipeline

    with SessionLocal() as db:
        job, site = pipeline.generate(db, category=category, direction=direction, requested_by_id=requested_by_id)
        return {"job_id": job.id, "website_id": site.id if site else None, "status": job.status.value}


@celery.task(name="app.worker.expire_reservations")
def expire_reservations():
    from app.services.marketplace import expire_reservations as run

    with SessionLocal() as db:
        return run(db)
