# Architecture

```
frontend/ (Next.js, React, TypeScript, Tailwind, dnd-kit)
   |  /api/* rewrite
backend/app (FastAPI, SQLAlchemy 2, PostgreSQL)
   api/         public (auth, catalog, listings, previews), commerce (checkout, webhooks,
                owned sites, editors, export, subscription), admin, dev (mock payments)
   services/    marketplace (exclusive purchase), subscriptions, review, payments/*
   ai/          router + providers (Claude, LM Studio, Gemini, procedural)
   generation/  spec, catalog, steps, procedural, assets, renderer, qc, similarity, pipeline
   editor/      ops (shared edit operations), ai_editor
   worker.py    Celery tasks: generate_website, expire_reservations
```

## Core idea: the SiteSpec

AI never writes HTML. Every website is a validated JSON document (`generation/spec.py`):
meta, theme (palette, typography, shape, effects) and pages made of typed sections with
layout variants. A deterministic renderer turns it into static, script-free, responsive HTML.

Consequences:
- generation is testable and every output can be checked by QC before a human sees it;
- the visual editor and the AI editor emit the same small set of validated operations, so
  an AI edit can never break a page or inject markup;
- a sold website's original spec is frozen, and the buyer edits a private copy.

## Exclusive ownership (Rule A)

1. `start_checkout`: row lock + conditional `UPDATE ... WHERE status='listed'` reserves the
   site for 15 minutes and hides it from inventory.
2. `complete_purchase` (verified webhook only): conditional update to `sold`, then inserts
   `ownerships` (UNIQUE website_id) and the buyer's `customer_sites` copy in one transaction.
3. Database guarantees: one `paid` order per website (partial unique index), one ownership
   per website, trigger blocking any change to a sold website's status/owner/spec, trigger
   blocking deletion of ownership rows.
4. A payment that arrives after the site went to someone else is refunded automatically.

## Subscription separation (Rule B)

`subscriptions` and `usage_events` reference only the user. No code path in
`services/subscriptions.py` touches `websites`, `ownerships` or `customer_sites`. The AI edit
endpoint checks the subscription; the visual editor and export never do.

## Quality gate (Rule C)

Pipeline -> automated QC (contrast, structure, headings, alt text, labels, links, no scripts,
size) -> similarity against all non-rejected inventory including sold -> `in_review` ->
admin approval -> `listed`. A site that fails QC or similarity is rejected automatically and
cannot be approved.

## AI routing

| Task | Order |
|---|---|
| classify, brief, copywriting, summarize, SEO | LM Studio -> Gemini -> Claude |
| site architecture, visual direction, AI edit | Claude -> Gemini |
| code review | Claude |

Unconfigured providers are skipped. Every response is validated against a Pydantic schema,
retried once, then falls back. In `mock` mode a seeded procedural engine implements each step.

## Security notes

- Previews are served with a strict CSP (no scripts, no forms) and `noindex`; non-public
  previews need a short-lived signed token.
- Webhooks are signature-verified and idempotent.
- JWT bearer auth; admin routes require the admin role.
