"""AI Model Router.

Routes each task type to the cheapest provider that can do it well, validates every
response against a Pydantic schema, retries once on invalid output and falls back along
a configured chain. Every call is logged (provider, latency, tokens, success).
"""

from __future__ import annotations

import enum
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.ai.providers import (
    ClaudeProvider,
    Completion,
    GeminiProvider,
    LMStudioProvider,
    ProceduralProvider,
    Provider,
    ProviderError,
)
from app.config import Settings, get_settings
from app.models import AICallLog

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class Task(str, enum.Enum):
    # local-first (cheap, high volume)
    classify = "classify"
    brief = "brief"
    copywriting = "copywriting"
    summarize = "summarize"
    seo_metadata = "seo_metadata"
    # claude-first (complex reasoning / code / design)
    site_architecture = "site_architecture"
    visual_direction = "visual_direction"
    ai_edit = "ai_edit"
    code_review = "code_review"


# Preferred provider order per task. "procedural" is the deterministic offline engine.
# Gemini is optional: a mid-cost tier for simple tasks when the local model is unavailable,
# and a fallback for Claude tasks. Providers that are not configured are skipped.
ROUTES: dict[Task, tuple[str, ...]] = {
    Task.classify: ("lmstudio", "gemini", "claude"),
    Task.brief: ("lmstudio", "gemini", "claude"),
    Task.copywriting: ("lmstudio", "gemini", "claude"),
    Task.summarize: ("lmstudio", "gemini", "claude"),
    Task.seo_metadata: ("lmstudio", "gemini", "claude"),
    Task.site_architecture: ("claude", "gemini"),
    Task.visual_direction: ("claude", "gemini"),
    Task.ai_edit: ("claude", "gemini"),
    Task.code_review: ("claude",),
}

MAX_TOKENS: dict[Task, int] = {
    Task.classify: 512,
    Task.site_architecture: 16000,
    Task.visual_direction: 8000,
    Task.ai_edit: 16000,
}


class RoutingError(RuntimeError):
    pass


@dataclass
class RouteResult:
    value: BaseModel
    completion: Completion
    attempts: list[dict[str, Any]] = field(default_factory=list)


class AIRouter:
    def __init__(
        self,
        settings: Settings | None = None,
        providers: dict[str, Provider] | None = None,
        db: Session | None = None,
    ):
        self.settings = settings or get_settings()
        self.db = db
        if providers is not None:
            self.providers = providers
        elif self.settings.ai_mode == "live":
            self.providers = {
                "claude": ClaudeProvider(self.settings),
                "lmstudio": LMStudioProvider(self.settings),
                "procedural": ProceduralProvider(),
            }
            if self.settings.gemini_api_key:
                self.providers["gemini"] = GeminiProvider(self.settings)
        else:
            self.providers = {"procedural": ProceduralProvider()}

    def chain_for(self, task: Task, allow_procedural: bool) -> list[str]:
        chain = [p for p in ROUTES[task] if p in self.providers]
        if allow_procedural and "procedural" in self.providers:
            chain.append("procedural")
        return chain

    def run(
        self,
        task: Task,
        *,
        system: str,
        prompt: str,
        schema: type[T],
        context: dict[str, Any] | None = None,
        procedural: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
        allow_procedural: bool = True,
        validator: Callable[[T], None] | None = None,
    ) -> RouteResult:
        ctx = dict(context or {})
        if procedural:
            ctx["_procedural"] = procedural
        attempts: list[dict[str, Any]] = []
        chain = self.chain_for(task, allow_procedural and procedural is not None)
        if not chain:
            raise RoutingError(f"no provider available for task {task.value}")

        for name in chain:
            provider = self.providers[name]
            for attempt in range(2):  # one retry on invalid output per provider
                try:
                    completion = provider.complete_json(
                        system=system,
                        prompt=prompt if attempt == 0 else prompt + "\n\nYour previous output was invalid. "
                        "Return ONLY JSON that matches the schema exactly.",
                        schema=schema,
                        context=ctx,
                        max_tokens=MAX_TOKENS.get(task, 4096),
                    )
                    value = schema.model_validate(completion.data)
                    if validator:
                        validator(value)
                except ProviderError as e:
                    attempts.append({"provider": name, "error": str(e)})
                    self._log(task, name, getattr(provider, "model", "?"), False, 0, error=str(e))
                    if not e.retryable:
                        break
                    continue
                except (ValidationError, ValueError) as e:
                    attempts.append({"provider": name, "error": f"invalid output: {e}"[:500]})
                    self._log(task, name, getattr(provider, "model", "?"), False, completion.latency_ms,
                              error=f"validation: {e}"[:1000])
                    continue
                attempts.append({"provider": name, "ok": True})
                self._log(task, name, completion.model, True, completion.latency_ms,
                          completion.input_tokens, completion.output_tokens)
                return RouteResult(value=value, completion=completion, attempts=attempts)
        raise RoutingError(f"all providers failed for {task.value}: {attempts}")

    def _log(self, task, provider, model, success, latency_ms, in_tok=0, out_tok=0, error=None):
        log.info("ai_call task=%s provider=%s ok=%s ms=%s", task.value, provider, success, latency_ms)
        if self.db is not None:
            self.db.add(AICallLog(task=task.value, provider=provider, model=str(model), success=success,
                                  latency_ms=latency_ms, input_tokens=in_tok, output_tokens=out_tok, error=error))
