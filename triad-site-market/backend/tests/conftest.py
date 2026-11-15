import os
import tempfile

_db = os.environ.get("TRIAD_TEST_DATABASE_URL") or f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["TRIAD_DATABASE_URL"] = _db
os.environ.setdefault("TRIAD_AI_MODE", "mock")
os.environ.setdefault("TRIAD_ENV", "test")

import uuid  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.bootstrap import init_db  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.generation.pipeline import generate  # noqa: E402
from app.models import User, UserRole  # noqa: E402
from app.security import create_token, hash_password  # noqa: E402
from app.services.payments.registry import get_provider  # noqa: E402

IS_PG = engine.dialect.name == "postgresql"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    init_db(engine)
    get_provider.cache_clear()
    yield


@pytest.fixture
def db():
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


def make_user(db, role=UserRole.customer, email=None) -> User:
    u = User(email=email or f"u{uuid.uuid4().hex[:8]}@example.com", password_hash=hash_password("password123"),
             role=role)
    db.add(u)
    db.commit()
    return u


def auth(u: User) -> dict:
    return {"Authorization": f"Bearer {create_token(u)}"}


def listed_site(db, admin=None, **kw):
    from app.services.review import decide

    admin = admin or make_user(db, UserRole.admin)
    _, site = generate(db, **kw)
    assert site is not None and site.status.value == "in_review", site and site.qc_report
    return decide(db, admin, site.id, True)
