# TRIAD SITE MARKET

A premium marketplace where AI generates professional websites and each website is sold
to exactly one customer. Buyers customize their site with a free visual editor or a
subscription-based AI chat editor.

Status: **Milestone 1 - working vertical slice** (see `docs/MILESTONES.md`).

## What works today

| Area | State |
|---|---|
| Exclusive one-of-one purchase (row locks, conditional updates, DB unique constraints and triggers) | Done, concurrency-tested on PostgreSQL |
| Purchase separate from AI subscription (canceling never affects ownership) | Done, tested |
| 12-step AI generation pipeline with QC, similarity check and admin approval gate | Done (offline procedural engine; live AI providers wired but not yet run against real APIs) |
| AI model router: Claude + LM Studio + optional Gemini, schema validation, retry, fallback, call logs | Done, tested with fakes |
| 11 categories x 8 design directions, original generated artwork | Done |
| Visual editor (dnd-kit) and AI chat editor sharing one validated operation format, revisions, restore | Done |
| Static export (zip) of an owned site | Done |
| Payment provider abstraction + mock provider with signed webhooks, idempotency, auto-refund on conflict | Done; no real provider connected |
| Admin control center (generate, review queue, approve/reject, stats) | Done |
| Next.js frontend (marketplace, detail + desktop/mobile preview, checkout, dashboard, editor, admin) | Done |

## Run locally

```bash
# backend
cd backend
pip install -r requirements.txt
cp .env.example .env            # set TRIAD_DATABASE_URL (PostgreSQL recommended)
python -m app.cli create-admin admin@example.com 'a-strong-password'
python -m app.cli seed 12 --approve
uvicorn app.main:app --port 8000
```

```bash
# frontend
cd frontend
npm install
npm run build && npm start      # http://localhost:3000
```

Tests:

```bash
cd backend
pytest -q                                                   # SQLite
TRIAD_TEST_DATABASE_URL=postgresql+psycopg://user:pass@localhost/triad_test pytest -q   # + concurrency tests
node ../e2e/smoke.mjs                                       # end-to-end, needs both servers running
```

## Secrets

All credentials come from environment variables (`backend/.env.example`). Nothing secret is
stored in the repository. `TRIAD_AI_MODE=mock` runs fully offline; `live` uses
`ANTHROPIC_API_KEY`, a local LM Studio server and, optionally, `TRIAD_GEMINI_API_KEY`.

## Design references

The Orbital and Abyssal design directions were written from scratch, inspired by the mood of
two licensed reference templates. No source files, images, video or fonts from those
templates are included or redistributed.
