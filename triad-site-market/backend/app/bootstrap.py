"""Schema creation and database-level safety nets.

For production, schema changes should be managed with Alembic migrations (planned in
Milestone 2); ``init_db`` is used for development and tests.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app import models  # noqa: F401  (register models)
from app.db import Base

PG_SOLD_GUARD = """
CREATE OR REPLACE FUNCTION triad_guard_sold_website() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'sold' AND (NEW.status <> 'sold' OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
      OR NEW.spec_hash IS DISTINCT FROM OLD.spec_hash) THEN
    RAISE EXCEPTION 'website % is sold: status, owner and original spec are immutable', OLD.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_guard_sold_website ON websites;
CREATE TRIGGER trg_guard_sold_website BEFORE UPDATE ON websites
  FOR EACH ROW EXECUTE FUNCTION triad_guard_sold_website();
CREATE OR REPLACE FUNCTION triad_block_delete() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'ownership and paid order records are permanent'; END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_ownership_no_delete ON ownerships;
CREATE TRIGGER trg_ownership_no_delete BEFORE DELETE ON ownerships FOR EACH ROW EXECUTE FUNCTION triad_block_delete();
"""

SQLITE_SOLD_GUARD = """
CREATE TRIGGER IF NOT EXISTS trg_guard_sold_website BEFORE UPDATE ON websites
WHEN OLD.status = 'sold' AND (NEW.status <> 'sold' OR NEW.owner_id IS NOT OLD.owner_id OR NEW.spec_hash <> OLD.spec_hash)
BEGIN SELECT RAISE(ABORT, 'website is sold: status, owner and original spec are immutable'); END;
"""


# Columns added after the first release. Interim until Alembic migrations (Milestone 2).
ADDED_COLUMNS = [("orders", "provider_txn_ref", "VARCHAR(200)"), ("orders", "invoice_url", "VARCHAR(1000)"),
                 ("orders", "checkout_url", "VARCHAR(1000)")]


def _ensure_columns(engine: Engine) -> None:
    from sqlalchemy import inspect

    insp = inspect(engine)
    with engine.begin() as conn:
        for table, col, ddl in ADDED_COLUMNS:
            if insp.has_table(table) and col not in {c["name"] for c in insp.get_columns(table)}:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))


def init_db(engine: Engine) -> None:
    Base.metadata.create_all(engine)
    _ensure_columns(engine)
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            conn.execute(text(PG_SOLD_GUARD))
        elif engine.dialect.name == "sqlite":
            conn.execute(text(SQLITE_SOLD_GUARD))
