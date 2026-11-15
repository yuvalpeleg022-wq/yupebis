"""Admin CLI.  python -m app.cli create-admin EMAIL PASSWORD | seed N"""

import sys

from sqlalchemy import select

from app.bootstrap import init_db
from app.db import SessionLocal, engine
from app.models import User, UserRole
from app.security import hash_password


def main(argv: list[str]) -> None:
    init_db(engine)
    cmd = argv[0] if argv else ""
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
            from app.generation.pipeline import generate
            from app.services.review import decide

            admin = db.scalar(select(User).where(User.role == UserRole.admin))
            n = int(argv[1]) if len(argv) > 1 else 12
            for _ in range(n):
                _, site = generate(db, requested_by_id=admin.id if admin else None)
                if site and admin and site.status.value == "in_review" and "--approve" in argv:
                    decide(db, admin, site.id, True, "seed approval")
            print(f"generated {n} websites")
        else:
            print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
