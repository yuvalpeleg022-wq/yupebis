"""Schemas and prompts for each AI step of the generation workflow."""

from __future__ import annotations

import json

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.generation.catalog import CATEGORIES, DIRECTIONS
from app.generation.spec import SECTION_VARIANTS, Link, SectionType, Theme


class _S(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Brief(_S):
    business_name: str = Field(min_length=2, max_length=80)
    tagline: str = Field(min_length=5, max_length=160)
    audience: str = Field(max_length=300)
    tone: str = Field(max_length=120)
    value_props: list[str] = Field(min_length=3, max_length=6)
    location: str = Field(max_length=80)


class PlannedSection(_S):
    type: SectionType
    variant: str

    @model_validator(mode="after")
    def _check(self):
        if self.variant not in SECTION_VARIANTS[self.type]:
            raise ValueError(f"variant {self.variant} invalid for {self.type}")
        return self


class PlannedPage(_S):
    slug: str = Field(pattern=r"^(index|[a-z0-9][a-z0-9-]{0,40})$")
    title: str = Field(min_length=1, max_length=80)
    description: str = Field(max_length=300)
    sections: list[PlannedSection] = Field(min_length=3, max_length=14)

    @model_validator(mode="after")
    def _frame(self):
        types = [s.type for s in self.sections]
        if types[0] != "navbar" or types[-1] != "footer":
            raise ValueError("each page must start with navbar and end with footer")
        if types.count("navbar") != 1 or types.count("footer") != 1:
            raise ValueError("exactly one navbar and one footer per page")
        return self


class SitePlan(_S):
    pages: list[PlannedPage] = Field(min_length=2, max_length=8)

    @model_validator(mode="after")
    def _index(self):
        slugs = [p.slug for p in self.pages]
        if slugs[0] != "index" or len(set(slugs)) != len(slugs):
            raise ValueError("first page must be 'index' and slugs unique")
        if "contact" not in slugs:
            raise ValueError("a 'contact' page is required")
        return self


class ItemCopy(_S):
    title: str = Field(default="", max_length=200)
    text: str = Field(default="", max_length=1200)
    meta: str = Field(default="", max_length=120)


class SectionCopy(_S):
    eyebrow: str = Field(default="", max_length=80)
    heading: str = Field(default="", max_length=200)
    body: str = Field(default="", max_length=2000)
    items: list[ItemCopy] = Field(default_factory=list, max_length=24)
    links: list[Link] = Field(default_factory=list, max_length=12)


class PageCopy(_S):
    sections: list[SectionCopy]


SYSTEM_BASE = (
    "You are part of TRIAD SITE MARKET's website generation engine. You produce original, "
    "professional, production-quality website material for a fictional but realistic business. "
    "Never copy existing brands, trademarks, real people or copyrighted text. "
    "Write in clear, natural English with concrete, specific details. Return only JSON matching the schema."
)


def brief_prompt(category: str, direction: str, avoid_names: list[str]) -> str:
    c = CATEGORIES[category]
    return (
        f"Create a business concept and website brief.\nCategory: {c.label}\n"
        f"Design direction: {DIRECTIONS[direction].label}\n"
        f"Example services for this category: {json.dumps([s[0] for s in c.services])}\n"
        f"Do NOT use any of these existing business names: {json.dumps(avoid_names[:200])}"
    )


def plan_prompt(category: str, direction: str, brief: Brief) -> str:
    return (
        "Plan the information architecture of the website.\n"
        f"Brief: {brief.model_dump_json()}\nCategory: {CATEGORIES[category].label}; "
        f"direction: {DIRECTIONS[direction].label}.\n"
        "Rules: 3-6 pages; the first page slug is 'index' and a 'contact' page exists; each page "
        "starts with a navbar and ends with a footer; pick section variants for genuine layout "
        "variety (avoid repeating the same variant consecutively).\n"
        f"Allowed section variants: {json.dumps(SECTION_VARIANTS)}"
    )


def visual_prompt(category: str, direction: str, brief: Brief) -> str:
    d = DIRECTIONS[direction]
    return (
        "Design a unique visual system (theme) for this website.\n"
        f"Brief: {brief.model_dump_json()}\nDirection: {d.label}. Reference fonts: "
        f"{', '.join(d.heading_fonts + d.body_fonts)} (Google Fonts only).\n"
        "Requirements: WCAG AA contrast (4.5:1) between text and background, on_primary and "
        "primary, muted and background. Hex colors only (#rrggbb). Make it distinctive - not a "
        "recolor of a generic template."
    )


def copy_prompt(brief: Brief, page: PlannedPage, category: str) -> str:
    return (
        "Write the content for every section of this page, in order. Return exactly one entry per "
        f"section ({len(page.sections)} total).\nBrief: {brief.model_dump_json()}\n"
        f"Page: {page.model_dump_json()}\nCategory: {CATEGORIES[category].label}\n"
        "Guidance: navbar links = page labels; services/features 3-6 items; testimonials are "
        "clearly fictional first-name + initial; contact uses placeholder details (example.com, "
        "+972-3-000-0000). No lorem ipsum."
    )


def theme_schema() -> type[Theme]:
    return Theme
