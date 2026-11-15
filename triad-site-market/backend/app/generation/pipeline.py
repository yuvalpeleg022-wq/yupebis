"""The 12-step website generation workflow.

 1. Select category            7. Select/create licensed assets
 2. Business concept & brief    8. Implement (assemble SiteSpec + render)
 3. Information architecture    9. Automated QC
 4. Visual direction           10. Similarity vs. existing AND sold inventory
 5. Layouts & design system    11. Create admin review record
 6. Content                    12. Publish only after admin approval (see services.review)
"""

from __future__ import annotations

import random
import re
import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.router import AIRouter, Task
from app.config import get_settings
from app.generation import procedural, steps
from app.generation.assets import GENERATED_LICENSE
from app.generation.catalog import CATEGORIES, DIRECTIONS
from app.generation.color import contrast
from app.generation.qc import run_qc
from app.generation.similarity import fingerprint, most_similar
from app.generation.spec import Image, Item, SiteSpec, Theme, spec_hash
from app.models import (
    AuditLog,
    GenerationJob,
    GenerationStatus,
    ReviewDecision,
    ReviewRecord,
    Website,
    WebsiteAsset,
    WebsiteStatus,
)


class GenerationFailed(RuntimeError):
    pass


def _theme_validator(theme: Theme) -> None:
    p = theme.palette
    if contrast(p.text, p.background) < 4.5 or contrast(p.on_primary, p.primary) < 4.5:
        raise ValueError("theme fails WCAG AA contrast for text or primary button")


def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:80]


def create_job(db: Session, category: str | None = None, direction: str | None = None,
               seed: int | None = None, requested_by_id: str | None = None) -> GenerationJob:
    rng = random.SystemRandom()
    category = category or rng.choice(list(CATEGORIES))
    direction = direction or rng.choice(list(DIRECTIONS))
    if category not in CATEGORIES:
        raise ValueError(f"unknown category {category}")
    if direction not in DIRECTIONS:
        raise ValueError(f"unknown design direction {direction}")
    job = GenerationJob(category=category, design_direction=direction,
                        seed=seed if seed is not None else rng.randint(1, 2**31 - 1),
                        requested_by_id=requested_by_id)
    db.add(job)
    db.flush()
    return job


def _assign_assets(spec_dict: dict[str, Any], seed: int, business_name: str,
                   art_styles: tuple[str, ...] = ()) -> list[dict[str, str]]:
    """Step 7: attach original generated artwork wherever a layout needs imagery."""
    assets: list[dict[str, str]] = []
    n = 0

    def gen(alt: str) -> dict[str, str]:
        nonlocal n
        n += 1
        src = f"gen:{seed}:{n}" + (f":{art_styles[n % len(art_styles)]}" if art_styles else "")
        assets.append({"uri": src, "alt": alt})
        return {"src": src, "alt": alt, "license": GENERATED_LICENSE}

    for page in spec_dict["pages"]:
        for s in page["sections"]:
            t, v = s["type"], s["variant"]
            if t == "hero" and v in ("split", "fullbleed", "editorial", "centered", "porthole", "immersive"):
                s["image"] = gen(f"Abstract artwork representing {business_name}")
            elif t == "about" and v == "split":
                s["image"] = gen(f"Abstract composition for the story of {business_name}")
            elif t == "gallery":
                for i, it in enumerate(s["items"]):
                    it["image"] = gen(it.get("title") or f"Gallery artwork {i + 1}")
            elif t == "team" and v == "grid":
                for it in s["items"]:
                    it["image"] = gen(f"Portrait artwork for {it.get('title') or 'team member'}")
            elif t in ("features", "services") and v == "alternating":
                for it in s["items"]:
                    it["image"] = gen(f"Illustration for {it.get('title') or 'feature'}")
    return assets


def _assemble(category: str, direction: str, brief: steps.Brief, plan: steps.SitePlan,
              theme: Theme, copies: list[steps.PageCopy], seed: int) -> tuple[SiteSpec, list[dict[str, str]]]:
    pages = []
    for page, copy in zip(plan.pages, copies):
        if len(copy.sections) != len(page.sections):
            raise GenerationFailed(f"content/section count mismatch on page {page.slug}")
        sections = []
        counters: dict[str, int] = {}
        n_mid = 0
        for ps, sc in zip(page.sections, copy.sections):
            counters[ps.type] = counters.get(ps.type, 0) + 1
            sid = ps.type if counters[ps.type] == 1 else f"{ps.type}-{counters[ps.type]}"
            bg = "default"
            if ps.type not in ("navbar", "footer", "hero", "cta"):
                n_mid += 1
                bg = "surface" if n_mid % 2 == 0 else "default"
            sections.append({
                "id": sid, "type": ps.type, "variant": ps.variant, "eyebrow": sc.eyebrow,
                "heading": sc.heading, "body": sc.body, "background": bg,
                "items": [i.model_dump() for i in sc.items], "links": [l.model_dump() for l in sc.links],
            })
        pages.append({"slug": page.slug, "title": page.title,
                      "description": page.description or brief.tagline, "sections": sections})
    spec_dict = {
        "schema_version": 1,
        "meta": {"business_name": brief.business_name, "tagline": brief.tagline,
                 "category": category, "design_direction": direction},
        "theme": theme.model_dump(),
        "pages": pages,
    }
    assets = _assign_assets(spec_dict, seed, brief.business_name, DIRECTIONS[direction].art_styles
                            if direction in ("orbital", "abyssal") else ())
    return SiteSpec.model_validate(spec_dict), assets


def _price(category: str, direction: str, spec: SiteSpec) -> int:
    base = CATEGORIES[category].base_price_cents * DIRECTIONS[direction].price_multiplier
    base *= 1 + 0.05 * max(0, len(spec.pages) - 3)
    return int(round(base / 1000) * 1000)


def run_job(db: Session, job: GenerationJob, router: AIRouter | None = None) -> Website | None:
    settings = get_settings()
    router = router or AIRouter(db=db)
    job.status = GenerationStatus.running
    log: list[dict[str, Any]] = []

    def step(n: int, name: str, **info: Any) -> None:
        log.append({"step": n, "name": name, "at": datetime.now(timezone.utc).isoformat(), **info})

    try:
        cat, direction = job.category, job.design_direction
        step(1, "select_category", category=cat, direction=direction)
        ctx: dict[str, Any] = {"seed": job.seed, "category": cat, "direction": direction}

        existing_names = list(db.scalars(select(Website.title)))
        ctx["avoid_names"] = existing_names
        r = router.run(Task.brief, system=steps.SYSTEM_BASE, prompt=steps.brief_prompt(cat, direction, existing_names),
                       schema=steps.Brief, context=ctx, procedural=procedural.brief)
        brief: steps.Brief = r.value  # type: ignore[assignment]
        if brief.business_name in existing_names:
            brief.business_name = f"{brief.business_name} {job.seed % 97 + 2}"
        step(2, "brief", provider=r.completion.provider, business_name=brief.business_name)

        ctx["brief"] = brief.model_dump()
        r = router.run(Task.site_architecture, system=steps.SYSTEM_BASE, prompt=steps.plan_prompt(cat, direction, brief),
                       schema=steps.SitePlan, context=ctx, procedural=procedural.plan)
        plan: steps.SitePlan = r.value  # type: ignore[assignment]
        step(3, "information_architecture", provider=r.completion.provider, pages=[p.slug for p in plan.pages])

        r = router.run(Task.visual_direction, system=steps.SYSTEM_BASE, prompt=steps.visual_prompt(cat, direction, brief),
                       schema=Theme, context=ctx, procedural=procedural.visual, validator=_theme_validator)
        theme: Theme = r.value  # type: ignore[assignment]
        step(4, "visual_direction", provider=r.completion.provider,
             fonts=[theme.typography.heading_font, theme.typography.body_font])
        step(5, "layouts_and_design_system",
             layouts={p.slug: [f"{s.type}:{s.variant}" for s in p.sections] for p in plan.pages})

        copies: list[steps.PageCopy] = []
        pages_ctx = [{"slug": p.slug, "title": p.title} for p in plan.pages]
        for page in plan.pages:
            pctx = {**ctx, "page": page.model_dump(), "pages": pages_ctx}
            n_sections = len(page.sections)

            def _count(pc: steps.PageCopy, n: int = n_sections) -> None:
                if len(pc.sections) != n:
                    raise ValueError(f"expected {n} sections, got {len(pc.sections)}")

            r = router.run(Task.copywriting, system=steps.SYSTEM_BASE, prompt=steps.copy_prompt(brief, page, cat),
                           schema=steps.PageCopy, context=pctx, procedural=procedural.page_copy, validator=_count)
            copies.append(r.value)  # type: ignore[arg-type]
        step(6, "content", pages=len(copies))

        spec, assets = _assemble(cat, direction, brief, plan, theme, copies, job.seed)
        step(7, "assets", count=len(assets), license=GENERATED_LICENSE)
        step(8, "implementation", spec_hash=spec_hash(spec))

        qc = run_qc(spec)
        step(9, "quality_control", passed=qc.passed, score=qc.score, errors=[c.name for c in qc.errors][:20])

        fp = fingerprint(spec)
        others = [(w.id, w.fingerprint) for w in db.scalars(
            select(Website).where(Website.status != WebsiteStatus.rejected))]
        sim_id, sim = most_similar(fp, others)
        too_similar = sim >= settings.similarity_threshold
        step(10, "similarity", most_similar=sim_id, score=sim, threshold=settings.similarity_threshold)

        sku = "TSM-" + secrets.token_hex(4).upper()
        site = Website(
            sku=sku, slug=f"{_slugify(brief.business_name)}-{sku[-8:].lower()}", title=brief.business_name,
            tagline=brief.tagline, category=cat, design_direction=direction,
            status=WebsiteStatus.in_review if qc.passed and not too_similar else WebsiteStatus.rejected,
            price_cents=_price(cat, direction, spec), currency=settings.default_currency,
            spec=spec.model_dump(mode="json"), spec_hash=spec_hash(spec), fingerprint=fp,
            quality_score=qc.score, qc_report=qc.to_dict(), generation_job_id=job.id,
        )
        db.add(site)
        db.flush()
        for a in assets:
            db.add(WebsiteAsset(website_id=site.id, kind="illustration", uri=a["uri"], license=GENERATED_LICENSE,
                                source="triad-generator", attribution=None))
        review = ReviewRecord(website_id=site.id, qc_report=qc.to_dict(),
                              similarity={"most_similar_id": sim_id, "score": sim, "blocked": too_similar})
        if site.status == WebsiteStatus.rejected:
            review.decision = ReviewDecision.rejected
            review.notes = "Automatically rejected: " + ("QC errors" if not qc.passed else "too similar to existing inventory")
            review.decided_at = datetime.now(timezone.utc)
        db.add(review)
        step(11, "review_record", status=site.status.value)

        job.website_id = site.id
        job.status = GenerationStatus.succeeded
        db.add(AuditLog(actor_id=job.requested_by_id, action="website.generated", entity="website",
                        entity_id=site.id, data={"job_id": job.id, "status": site.status.value}))
        return site
    except Exception as exc:  # noqa: BLE001 - job must record any failure
        job.status = GenerationStatus.failed
        job.error = f"{type(exc).__name__}: {exc}"[:4000]
        step(-1, "failed", error=job.error)
        return None
    finally:
        job.steps = log
        job.finished_at = datetime.now(timezone.utc)
        db.flush()


def generate(db: Session, **kwargs: Any) -> tuple[GenerationJob, Website | None]:
    router = kwargs.pop("router", None)
    job = create_job(db, **kwargs)
    site = run_job(db, job, router=router)
    db.commit()
    return job, site
