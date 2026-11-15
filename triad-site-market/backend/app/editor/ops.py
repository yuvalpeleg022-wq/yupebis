"""Structured edit operations shared by the visual editor and the AI chat editor.

Both editors produce the same validated operation list; the AI never edits HTML directly.
Every successful batch is validated as a full SiteSpec and stored as a new revision.
"""

from __future__ import annotations

import copy
import re
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

from app.generation.spec import SECTION_VARIANTS, Item, Link, SectionType, SiteSpec


class _Op(BaseModel):
    model_config = ConfigDict(extra="forbid")


class UpdateSection(_Op):
    op: Literal["update_section"]
    page: str
    section_id: str
    eyebrow: str | None = None
    heading: str | None = None
    body: str | None = None
    variant: str | None = None
    background: Literal["default", "surface", "primary", "inverse"] | None = None
    items: list[Item] | None = None
    links: list[Link] | None = None


class MoveSection(_Op):
    op: Literal["move_section"]
    page: str
    section_id: str
    to_index: int = Field(ge=0)


class AddSection(_Op):
    op: Literal["add_section"]
    page: str
    type: SectionType
    variant: str
    at_index: int = Field(ge=0)
    heading: str = ""
    body: str = ""
    eyebrow: str = ""
    items: list[Item] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)


class RemoveSection(_Op):
    op: Literal["remove_section"]
    page: str
    section_id: str


class UpdateTheme(_Op):
    op: Literal["update_theme"]
    palette: dict[str, str] | None = None
    typography: dict[str, Any] | None = None
    radius_px: int | None = None
    spacing: Literal["compact", "comfortable", "airy"] | None = None
    button_style: Literal["solid", "outline", "pill", "underline"] | None = None
    image_treatment: Literal["none", "grayscale", "duotone", "rounded", "framed"] | None = None


class UpdateMeta(_Op):
    op: Literal["update_meta"]
    business_name: str | None = None
    tagline: str | None = None


class UpdatePage(_Op):
    op: Literal["update_page"]
    page: str
    title: str | None = None
    description: str | None = None


Operation = Annotated[
    Union[UpdateSection, MoveSection, AddSection, RemoveSection, UpdateTheme, UpdateMeta, UpdatePage],
    Field(discriminator="op"),
]


class OperationBatch(_Op):
    operations: list[Operation] = Field(min_length=1, max_length=50)


class AIEditPlan(_Op):
    """What the AI chat editor returns."""

    summary: str = Field(max_length=600)
    operations: list[Operation] = Field(max_length=50)


class EditError(ValueError):
    pass


PROTECTED = {"navbar", "footer"}


def _page(spec: dict, slug: str) -> dict:
    for p in spec["pages"]:
        if p["slug"] == slug:
            return p
    raise EditError(f"page '{slug}' not found")


def _section_idx(page: dict, sid: str) -> int:
    for i, s in enumerate(page["sections"]):
        if s["id"] == sid:
            return i
    raise EditError(f"section '{sid}' not found on page '{page['slug']}'")


def _new_id(page: dict, t: str) -> str:
    ids = {s["id"] for s in page["sections"]}
    n = 1
    while (cand := t if n == 1 else f"{t}-{n}") in ids:
        n += 1
    return re.sub(r"[^a-z0-9-]", "", cand)[:48]


def apply_operations(spec_dict: dict, operations: list[Any]) -> dict:
    spec = copy.deepcopy(spec_dict)
    for op in operations:
        if isinstance(op, UpdateSection):
            page = _page(spec, op.page)
            sec = page["sections"][_section_idx(page, op.section_id)]
            for f in ("eyebrow", "heading", "body", "background"):
                if getattr(op, f) is not None:
                    sec[f] = getattr(op, f)
            if op.variant is not None:
                if op.variant not in SECTION_VARIANTS[sec["type"]]:
                    raise EditError(f"variant '{op.variant}' not allowed for {sec['type']}")
                sec["variant"] = op.variant
            if op.items is not None:
                sec["items"] = [i.model_dump(mode="json") for i in op.items]
            if op.links is not None:
                sec["links"] = [l.model_dump(mode="json") for l in op.links]
        elif isinstance(op, MoveSection):
            page = _page(spec, op.page)
            i = _section_idx(page, op.section_id)
            secs = page["sections"]
            if secs[i]["type"] in PROTECTED:
                raise EditError("navbar/footer cannot be moved")
            s = secs.pop(i)
            to = min(max(1, op.to_index), len(secs) - 1)  # keep navbar first, footer last
            secs.insert(to, s)
        elif isinstance(op, AddSection):
            if op.type in PROTECTED:
                raise EditError("pages already have a navbar and footer")
            if op.variant not in SECTION_VARIANTS[op.type]:
                raise EditError(f"variant '{op.variant}' not allowed for {op.type}")
            page = _page(spec, op.page)
            secs = page["sections"]
            secs.insert(min(max(1, op.at_index), len(secs) - 1), {
                "id": _new_id(page, op.type), "type": op.type, "variant": op.variant, "eyebrow": op.eyebrow,
                "heading": op.heading, "body": op.body, "background": "default",
                "items": [i.model_dump(mode="json") for i in op.items],
                "links": [l.model_dump(mode="json") for l in op.links],
            })
        elif isinstance(op, RemoveSection):
            page = _page(spec, op.page)
            i = _section_idx(page, op.section_id)
            if page["sections"][i]["type"] in PROTECTED:
                raise EditError("navbar/footer cannot be removed")
            page["sections"].pop(i)
        elif isinstance(op, UpdateTheme):
            th = spec["theme"]
            if op.palette:
                th["palette"].update(op.palette)
            if op.typography:
                th["typography"].update(op.typography)
            for f in ("radius_px", "spacing", "button_style", "image_treatment"):
                if getattr(op, f) is not None:
                    th[f] = getattr(op, f)
        elif isinstance(op, UpdateMeta):
            if op.business_name is not None:
                spec["meta"]["business_name"] = op.business_name
            if op.tagline is not None:
                spec["meta"]["tagline"] = op.tagline
        elif isinstance(op, UpdatePage):
            page = _page(spec, op.page)
            if op.title is not None:
                page["title"] = op.title
            if op.description is not None:
                page["description"] = op.description
        else:  # pragma: no cover
            raise EditError(f"unsupported operation {op!r}")
    try:
        return SiteSpec.model_validate(spec).model_dump(mode="json")
    except Exception as e:  # pydantic ValidationError
        raise EditError(f"resulting site is invalid: {e}") from e
