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
| Payment provider abstraction + mock provider with signed webhooks, idempotency, auto-refund on conflict | Done |
| PayPlus adapter: hosted payment page, monthly recurring, refunds, invoice links, verified callbacks | Written from the official API reference and tested against a faked PayPlus; not yet run against a real PayPlus account |
| Publishing an owned site to its own Cloudflare Pages project (or local hosting in dev) | Project creation and upload token verified against the real Cloudflare API; asset upload tested with fakes only |
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

## Deploy

### Render (one file, connects to GitHub)

`render.yaml` at the repository root describes the database, the API and the website.

1. In Render choose **New > Blueprint**, select this repository and the branch to deploy.
2. Enter `TRIAD_ADMIN_EMAIL` and `TRIAD_ADMIN_PASSWORD` when asked (your admin login).
3. Apply. On first start the API creates the tables, the admin user and 12 approved websites.
4. Open the `triad-web` URL.

The blueprint starts in `staging` with the test payment provider and the offline generation
engine, so the whole flow can be tried without real money. Anyone can complete a test
"payment" in this mode, so do not treat it as a live shop. To go live, add the PayPlus,
AI and Cloudflare variables to `triad-api`, then set `TRIAD_PAYMENT_PROVIDER=payplus`,
`TRIAD_HOSTING_PROVIDER=cloudflare`, `TRIAD_AI_MODE=live` and finally `TRIAD_ENV=production`.

### GitHub Pages (static demo catalog only)

GitHub Pages serves static files, so it cannot run the API, accounts, payments or editors.
`python -m app.cli export-showcase ../../triad` writes a static catalog of generated websites
(filters, search, every page of every site, desktop/mobile preview) to `/triad` at the
repository root. Enable Pages for the branch (Settings > Pages > Deploy from a branch, root
folder) and open `https://<user>.github.io/<repo>/triad/`.

### Any server with Docker

```bash
TRIAD_ADMIN_PASSWORD='choose-a-strong-password' docker compose up --build
```

Then open http://localhost:3000. Both images were built and run together during development.

## Going live

Set the variables in `backend/.env` (see `.env.example`), then run:

```bash
cd backend
python -m app.cli check-live
```

It makes one real call to each configured service (Claude, Gemini, LM Studio, PayPlus,
Cloudflare Pages) and prints what works. Switch on each piece with
`TRIAD_AI_MODE=live`, `TRIAD_PAYMENT_PROVIDER=payplus`, `TRIAD_HOSTING_PROVIDER=cloudflare`.
PayPlus needs `TRIAD_PUBLIC_API_URL` to be reachable from the internet for callbacks; keep
`TRIAD_PAYPLUS_SANDBOX=true` until a full sandbox purchase, refund and renewal have passed.

## Secrets

All credentials come from environment variables (`backend/.env.example`). Nothing secret is
stored in the repository. `TRIAD_AI_MODE=mock` runs fully offline; `live` uses
`ANTHROPIC_API_KEY`, a local LM Studio server and, optionally, `TRIAD_GEMINI_API_KEY`.

## Design references

The Orbital and Abyssal design directions were written from scratch, inspired by the mood of
two licensed reference templates. No source files, images, video or fonts from those
templates are included or redistributed.
