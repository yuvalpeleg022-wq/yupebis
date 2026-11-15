"""AI chat editor: natural-language instruction -> validated edit operations (Claude)."""

from __future__ import annotations

import json
from typing import Any

from app.ai.router import AIRouter, Task
from app.editor.ops import AIEditPlan, UpdateMeta, UpdateSection, apply_operations
from app.generation.spec import SECTION_VARIANTS

SYSTEM = (
    "You are TRIAD's AI website editor. You edit a customer's website by returning structured "
    "operations against its JSON specification. Only use section ids and page slugs that exist. "
    "Preserve the site's design quality and accessibility (WCAG AA contrast). Never invent "
    "testimonials attributed to real people. If the request is impossible with the available "
    "operations, return no operations and explain why in the summary. Return only JSON."
)


def _prompt(spec: dict, instruction: str) -> str:
    return (
        f"Customer instruction: {instruction}\n\n"
        f"Allowed section variants: {json.dumps(SECTION_VARIANTS)}\n\n"
        f"Current site specification:\n{json.dumps(spec, ensure_ascii=False)}"
    )


def _procedural(ctx: dict[str, Any]) -> dict[str, Any]:
    """Offline stand-in: understands a few simple instruction patterns (dev/tests only)."""
    instr: str = ctx["instruction"].strip()
    spec = ctx["spec"]
    low = instr.lower()
    ops: list[dict[str, Any]] = []
    if low.startswith("rename to "):
        ops.append(UpdateMeta(op="update_meta", business_name=instr[10:].strip()).model_dump(exclude_none=True))
    elif low.startswith("headline:"):
        hero = next(s for s in spec["pages"][0]["sections"] if s["type"] == "hero")
        ops.append(UpdateSection(op="update_section", page="index", section_id=hero["id"],
                                 heading=instr.split(":", 1)[1].strip()).model_dump(exclude_none=True))
    return {"summary": f"Applied {len(ops)} change(s)." if ops else "No supported change found (offline mode).",
            "operations": ops}


def plan_edit(router: AIRouter, spec: dict, instruction: str) -> tuple[AIEditPlan, dict]:
    def _validate(plan: AIEditPlan) -> None:
        if plan.operations:
            apply_operations(spec, plan.operations)  # raises EditError -> router retries/falls back

    r = router.run(Task.ai_edit, system=SYSTEM, prompt=_prompt(spec, instruction), schema=AIEditPlan,
                   context={"spec": spec, "instruction": instruction}, procedural=_procedural,
                   validator=_validate, allow_procedural=router.settings.ai_mode != "live")
    plan: AIEditPlan = r.value  # type: ignore[assignment]
    new_spec = apply_operations(spec, plan.operations) if plan.operations else spec
    return plan, new_spec
