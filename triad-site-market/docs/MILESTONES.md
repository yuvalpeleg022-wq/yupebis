# Milestones

## M1 - Vertical slice (done)
Backend, generation engine, purchase flow, editors, admin, frontend, tests. See README.

## M2 - Live AI and production data layer
- Run the pipeline against real Claude / LM Studio / Gemini and tune prompts and QC
- Alembic migrations, Docker Compose (API, worker, Postgres, Redis)
- Celery in real use for generation; scheduled generation
- Real photography with license tracking (object storage)

## M3 - Payments (needs approval: provider choice and account)
- Adapter for an Israeli processor with recurring billing, refunds, invoices
- Checkout, subscription renewal and dunning flows, receipts by email

## M4 - Delivery and hosting (needs approval: hosting costs)
- One-click publish to an isolated per-customer deployment, custom domains
- Optional hosting/maintenance plan

## M5 - Hardening
- Playwright visual + accessibility (axe) + Lighthouse checks inside QC
- Sentry, OpenTelemetry, rate limiting, password reset, email verification
- Legal: license terms, terms of sale, privacy policy
- Hebrew / RTL for the platform UI and for generated sites

## Decisions waiting for the owner
1. Payment provider.
2. Hosting target (Cloudflare or Vercel) and domain.
3. Pricing: site price ranges and the AI plan price/allowance (currently placeholders).
4. Whether the platform UI should be Hebrew, English or both.
