"""Design fingerprinting and similarity against existing and sold inventory.

Similarity combines structure (section/variant sequences), visual system (palette,
fonts, shape) and content (business name/tagline tokens). Websites too similar to
anything already in inventory - including sold websites - are blocked from listing.
"""

from __future__ import annotations

from typing import Any

from app.generation.color import hex_to_rgb
from app.generation.spec import SiteSpec


def fingerprint(spec: SiteSpec) -> dict[str, Any]:
    t = spec.theme
    structure = [f"{pg.slug}/{s.type}:{s.variant}" for pg in spec.pages for s in pg.sections]
    words = (spec.meta.business_name + " " + spec.meta.tagline).lower().split()
    return {
        "category": spec.meta.category,
        "direction": spec.meta.design_direction,
        "structure": structure,
        "palette": [t.palette.background, t.palette.primary, t.palette.accent, t.palette.text],
        "fonts": [t.typography.heading_font, t.typography.body_font],
        "shape": [t.radius_px, t.spacing, t.button_style, t.image_treatment],
        "words": sorted(set(words)),
        "name": spec.meta.business_name.lower(),
    }


def _jaccard(a: list, b: list) -> float:
    sa, sb = set(a), set(b)
    return len(sa & sb) / len(sa | sb) if sa | sb else 1.0


def _seq_sim(a: list[str], b: list[str]) -> float:
    """Normalized LCS similarity - order matters for layouts."""
    if not a or not b:
        return 0.0
    prev = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(prev[j] + 1 if x == y else max(prev[j + 1], cur[j]))
        prev = cur
    return 2 * prev[-1] / (len(a) + len(b))


def _palette_sim(a: list[str], b: list[str]) -> float:
    dists = []
    for ca, cb in zip(a, b):
        ra, rb = hex_to_rgb(ca), hex_to_rgb(cb)
        dists.append(sum((x - y) ** 2 for x, y in zip(ra, rb)) ** 0.5 / 3 ** 0.5)
    return 1 - sum(dists) / len(dists)


def similarity(a: dict[str, Any], b: dict[str, Any]) -> float:
    if a.get("name") and a.get("name") == b.get("name"):
        return 1.0
    s = (
        0.40 * _seq_sim(a["structure"], b["structure"])
        + 0.25 * _palette_sim(a["palette"], b["palette"])
        + 0.10 * _jaccard(a["fonts"], b["fonts"])
        + 0.10 * _jaccard([str(x) for x in a["shape"]], [str(x) for x in b["shape"]])
        + 0.15 * _jaccard(a["words"], b["words"])
    )
    return round(s, 4)


def most_similar(fp: dict[str, Any], others: list[tuple[str, dict[str, Any]]]) -> tuple[str | None, float]:
    best_id, best = None, 0.0
    for oid, ofp in others:
        if not ofp:
            continue
        s = similarity(fp, ofp)
        if s > best:
            best_id, best = oid, s
    return best_id, best
