"""Structured website specification (the "source project").

AI never writes raw HTML/JS directly. It produces a validated ``SiteSpec``; a deterministic
renderer turns that into a static site. This makes generation testable, editing safe
(visual and AI editors manipulate the same structured document) and output auditable.
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

SectionType = Literal[
    "navbar",
    "hero",
    "features",
    "about",
    "services",
    "menu",
    "gallery",
    "stats",
    "testimonials",
    "pricing",
    "team",
    "faq",
    "cta",
    "contact",
    "footer",
]

SECTION_VARIANTS: dict[str, tuple[str, ...]] = {
    "navbar": ("inline", "centered", "split"),
    "hero": ("split", "centered", "fullbleed", "editorial", "stacked"),
    "features": ("grid", "list", "alternating"),
    "about": ("split", "quote", "timeline"),
    "services": ("cards", "rows", "numbered"),
    "menu": ("columns", "list"),
    "gallery": ("masonry", "grid", "strip"),
    "stats": ("row", "boxed"),
    "testimonials": ("cards", "single", "wall"),
    "pricing": ("cards", "table"),
    "team": ("grid", "list"),
    "faq": ("accordion", "two_column"),
    "cta": ("banner", "split", "minimal"),
    "contact": ("form", "split", "simple"),
    "footer": ("columns", "minimal", "big"),
}

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Palette(Strict):
    background: str
    surface: str
    text: str
    muted: str
    primary: str
    on_primary: str
    accent: str

    @field_validator("*")
    @classmethod
    def _hex(cls, v: str) -> str:
        if not HEX.match(v):
            raise ValueError(f"invalid hex color: {v}")
        return v.lower()


class Typography(Strict):
    heading_font: str = Field(max_length=60)
    body_font: str = Field(max_length=60)
    heading_weight: int = Field(ge=300, le=900)
    scale: float = Field(ge=1.1, le=1.6)
    heading_case: Literal["none", "uppercase"] = "none"
    letter_spacing: float = Field(ge=-0.05, le=0.3, default=0.0)


class Theme(Strict):
    palette: Palette
    typography: Typography
    radius_px: int = Field(ge=0, le=40)
    spacing: Literal["compact", "comfortable", "airy"]
    max_width_px: int = Field(ge=960, le=1600)
    button_style: Literal["solid", "outline", "pill", "underline"]
    image_treatment: Literal["none", "grayscale", "duotone", "rounded", "framed"]


class Image(Strict):
    src: str = Field(max_length=1000)
    alt: str = Field(min_length=1, max_length=300)
    license: str = Field(default="generated", max_length=120)


class Item(Strict):
    title: str = Field(default="", max_length=200)
    text: str = Field(default="", max_length=1200)
    meta: str = Field(default="", max_length=120)
    image: Image | None = None


class Link(Strict):
    label: str = Field(min_length=1, max_length=60)
    href: str = Field(max_length=500)


class Section(Strict):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{0,47}$")
    type: SectionType
    variant: str
    eyebrow: str = Field(default="", max_length=80)
    heading: str = Field(default="", max_length=200)
    body: str = Field(default="", max_length=2000)
    items: list[Item] = Field(default_factory=list, max_length=24)
    links: list[Link] = Field(default_factory=list, max_length=12)
    image: Image | None = None
    background: Literal["default", "surface", "primary", "inverse"] = "default"

    @field_validator("variant")
    @classmethod
    def _variant(cls, v: str, info) -> str:
        t = info.data.get("type")
        if t and v not in SECTION_VARIANTS[t]:
            raise ValueError(f"variant '{v}' not allowed for section '{t}'")
        return v


class Page(Strict):
    slug: str = Field(pattern=r"^(index|[a-z0-9][a-z0-9-]{0,40})$")
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=300)
    sections: list[Section] = Field(min_length=1, max_length=30)


class SiteMeta(Strict):
    business_name: str = Field(min_length=1, max_length=120)
    tagline: str = Field(default="", max_length=200)
    category: str
    design_direction: str
    language: str = "en"
    direction: Literal["ltr", "rtl"] = "ltr"


class SiteSpec(Strict):
    schema_version: Literal[1] = 1
    meta: SiteMeta
    theme: Theme
    pages: list[Page] = Field(min_length=1, max_length=12)

    @field_validator("pages")
    @classmethod
    def _unique_slugs(cls, pages: list[Page]) -> list[Page]:
        slugs = [p.slug for p in pages]
        if len(set(slugs)) != len(slugs):
            raise ValueError("page slugs must be unique")
        if "index" not in slugs:
            raise ValueError("an 'index' page is required")
        for p in pages:
            ids = [s.id for s in p.sections]
            if len(set(ids)) != len(ids):
                raise ValueError(f"duplicate section ids on page '{p.slug}'")
        return pages

    def page(self, slug: str) -> Page | None:
        return next((p for p in self.pages if p.slug == slug), None)


def spec_hash(spec: dict[str, Any] | SiteSpec) -> str:
    data = spec.model_dump(mode="json") if isinstance(spec, SiteSpec) else spec
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
