"""Admin CLI.

python -m app.cli create-admin EMAIL PASSWORD
python -m app.cli seed N [--approve]
python -m app.cli bootstrap       # admin + first inventory from TRIAD_ADMIN_EMAIL/PASSWORD, TRIAD_SEED_COUNT
python -m app.cli export-showcase OUT_DIR   # static demo catalog for GitHub Pages or any static host
python -m app.cli check-live      # verify the real AI, payment and hosting integrations
"""

import sys

from sqlalchemy import select

from app.bootstrap import init_db
from app.db import SessionLocal, engine
from app.models import User, UserRole
from app.security import hash_password


def _seed(db, n: int, approve: bool) -> None:
    from app.generation.pipeline import generate
    from app.services.review import decide

    admin = db.scalar(select(User).where(User.role == UserRole.admin))
    for _ in range(n):
        _, site = generate(db, requested_by_id=admin.id if admin else None)
        if site and admin and approve and site.status.value == "in_review":
            decide(db, admin, site.id, True, "seed approval")
    print(f"generated {n} websites")


def check_live() -> None:
    """Calls each configured external service once and reports what works."""
    from pydantic import BaseModel

    from app.config import get_settings

    s = get_settings()

    class Ping(BaseModel):
        answer: str

    def run(label: str, fn) -> None:
        try:
            print(f"[ OK ] {label}: {fn()}")
        except Exception as e:  # noqa: BLE001 - diagnostic tool
            print(f"[FAIL] {label}: {type(e).__name__}: {str(e)[:300]}")

    def ai(provider_cls):
        c = provider_cls(s).complete_json(system="Return JSON only.", prompt='Answer with the word "ok".',
                                          schema=Ping, context={}, max_tokens=2000)
        return f"{c.model} replied {c.data} in {c.latency_ms} ms"

    from app.ai.providers import ClaudeProvider, GeminiProvider, LMStudioProvider

    run("Claude", lambda: ai(ClaudeProvider))
    run("Gemini", lambda: ai(GeminiProvider))
    run("LM Studio", lambda: ai(LMStudioProvider))

    def payplus():
        from app.services.payments.payplus import PayPlusProvider

        c = PayPlusProvider(s).create_checkout(
            order_id="live-check", amount_cents=100, currency="ILS", description="TRIAD connectivity check",
            customer_email="check@example.com", success_url=s.public_base_url, cancel_url=s.public_base_url)
        return f"payment page created ({'sandbox' if s.payplus_sandbox else 'PRODUCTION'}): {c.redirect_url}"

    run("PayPlus", payplus)

    def cloudflare():
        from app.services.hosting.cloudflare import CloudflarePagesHosting

        d = CloudflarePagesHosting(s.cloudflare_api_token or "", s.cloudflare_account_id or "").publish(
            "triad-live-check", {"index.html": b"<!doctype html><title>TRIAD</title><h1>TRIAD hosting works</h1>"})
        return f"deployed {d.url} (delete the 'triad-live-check' project when done)"

    run("Cloudflare Pages", cloudflare)


def main(argv: list[str]) -> None:
    cmd = argv[0] if argv else ""
    if cmd == "export-showcase":  # self-contained: uses its own in-memory database
        from app.showcase import export

        print(f"exported {export(argv[1])} websites to {argv[1]}")
        return
    init_db(engine)
    with SessionLocal() as db:
        if cmd == "create-admin":
            email, pw = argv[1].lower(), argv[2]
            u = db.scalar(select(User).where(User.email == email))
            if u:
                u.role = UserRole.admin
            else:
                db.add(User(email=email, password_hash=hash_password(pw), role=UserRole.admin))
            db.commit()
            print(f"admin ready: {email}")
        elif cmd == "seed":
            n = int(argv[1]) if len(argv) > 1 else 12
            _seed(db, n, "--approve" in argv)
        elif cmd == "bootstrap":
            # Used by the container entrypoint: create the admin and first inventory from env vars.
            import os

            from app.models import Website

            email, pw = os.environ.get("TRIAD_ADMIN_EMAIL", "").lower(), os.environ.get("TRIAD_ADMIN_PASSWORD", "")
            if email and pw and not db.scalar(select(User).where(User.email == email)):
                db.add(User(email=email, password_hash=hash_password(pw), role=UserRole.admin))
                db.commit()
                print(f"admin created: {email}")
            n = int(os.environ.get("TRIAD_SEED_COUNT", "0") or 0)
            if n and db.scalar(select(Website.id).limit(1)) is None:
                _seed(db, n, approve=True)
        elif cmd == "check-live":
            check_live()
        else:
            print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
