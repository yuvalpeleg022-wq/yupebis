"""Automated quality control run on every generated website before admin review."""

from __future__ import annotations

from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Any

from app.generation.color import contrast
from app.generation.renderer import render_page
from app.generation.spec import SiteSpec

PAGE_BUDGET_BYTES = 600_000
PLACEHOLDER_MARKERS = ("lorem ipsum", "todo", "tbd", "[insert", "{{", "}}")


@dataclass
class Check:
    name: str
    passed: bool
    severity: str  # error | warning
    detail: str = ""


@dataclass
class QCReport:
    checks: list[Check] = field(default_factory=list)

    def add(self, name: str, passed: bool, severity: str = "error", detail: str = "") -> None:
        self.checks.append(Check(name, passed, severity, detail))

    @property
    def errors(self) -> list[Check]:
        return [c for c in self.checks if not c.passed and c.severity == "error"]

    @property
    def passed(self) -> bool:
        return not self.errors

    @property
    def score(self) -> float:
        if not self.checks:
            return 0.0
        weights = {"error": 3.0, "warning": 1.0}
        total = sum(weights[c.severity] for c in self.checks)
        got = sum(weights[c.severity] for c in self.checks if c.passed)
        return round(100 * got / total, 1)

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "score": self.score,
            "checks": [c.__dict__ for c in self.checks],
        }


class _Collector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tags: list[str] = []
        self.headings: list[int] = []
        self.imgs_without_alt = 0
        self.links: list[str] = []
        self.has_viewport = False
        self.has_lang = False
        self.inputs_without_label: set[str] = set()
        self.labels_for: set[str] = set()
        self.scripts = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append(tag)
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.headings.append(int(tag[1]))
        elif tag == "img" and not (a.get("alt") or "").strip():
            self.imgs_without_alt += 1
        elif tag == "a" and a.get("href"):
            self.links.append(a["href"])
        elif tag == "meta" and a.get("name") == "viewport":
            self.has_viewport = True
        elif tag == "html" and a.get("lang"):
            self.has_lang = True
        elif tag in ("input", "textarea") and a.get("id"):
            self.inputs_without_label.add(a["id"])
        elif tag == "label" and a.get("for"):
            self.labels_for.add(a["for"])
        elif tag == "script":
            self.scripts += 1


def run_qc(spec: SiteSpec) -> QCReport:
    rep = QCReport()
    p = spec.theme.palette

    # Accessibility: color contrast (WCAG AA)
    for name, fg, bg, need in [
        ("contrast_text", p.text, p.background, 4.5),
        ("contrast_muted", p.muted, p.background, 4.5),
        ("contrast_primary_button", p.on_primary, p.primary, 4.5),
        ("contrast_text_on_surface", p.text, p.surface, 4.5),
    ]:
        ratio = contrast(fg, bg)
        rep.add(name, ratio >= need, "error" if name != "contrast_muted" else "warning", f"{ratio:.2f}:1 (need {need})")

    slugs = {pg.slug for pg in spec.pages}
    rep.add("has_contact_page", "contact" in slugs, "warning")

    for page in spec.pages:
        types = [s.type for s in page.sections]
        rep.add(f"{page.slug}:has_hero", "hero" in types)
        rep.add(f"{page.slug}:has_nav_and_footer", types[0] == "navbar" and types[-1] == "footer")

        # Content completeness
        for s in page.sections:
            if s.type in ("features", "services", "testimonials", "stats", "faq", "team", "menu", "pricing", "gallery"):
                rep.add(f"{page.slug}:{s.id}:has_items", len(s.items) >= 2, detail=f"{len(s.items)} items")
            if s.type in ("hero", "cta") and not s.heading:
                rep.add(f"{page.slug}:{s.id}:heading", False, detail="missing heading")
            text = " ".join([s.heading, s.body, *(i.title + " " + i.text for i in s.items)]).lower()
            bad = [m for m in PLACEHOLDER_MARKERS if m in text]
            if bad:
                rep.add(f"{page.slug}:{s.id}:no_placeholders", False, detail=", ".join(bad))

        html = render_page(spec, page.slug)
        rep.add(f"{page.slug}:size_budget", len(html.encode()) <= PAGE_BUDGET_BYTES, "warning", f"{len(html.encode())} bytes")
        c = _Collector()
        c.feed(html)
        rep.add(f"{page.slug}:viewport_meta", c.has_viewport)
        rep.add(f"{page.slug}:html_lang", c.has_lang)
        rep.add(f"{page.slug}:single_h1", c.headings.count(1) == 1, detail=f"{c.headings.count(1)} h1")
        skips = [b for a, b in zip(c.headings, c.headings[1:]) if b - a > 1]
        rep.add(f"{page.slug}:heading_order", not skips, "warning", f"skips: {skips}" if skips else "")
        rep.add(f"{page.slug}:img_alt", c.imgs_without_alt == 0, detail=f"{c.imgs_without_alt} missing")
        unlabeled = c.inputs_without_label - c.labels_for
        rep.add(f"{page.slug}:form_labels", not unlabeled, detail=", ".join(sorted(unlabeled)))
        rep.add(f"{page.slug}:no_scripts", c.scripts == 0, detail=f"{c.scripts} scripts")
        broken = [h for h in c.links if h.endswith(".html") and h[:-5] not in slugs]
        rep.add(f"{page.slug}:internal_links", not broken, detail=", ".join(broken[:5]))
    return rep
