"""AI providers: Claude (Anthropic API), LM Studio (local, OpenAI-compatible) and a
deterministic procedural provider used for development, tests and as a last resort."""

from __future__ import annotations

import json
import time
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import httpx
from pydantic import BaseModel

from app.config import Settings


class ProviderError(RuntimeError):
    def __init__(self, message: str, retryable: bool = True):
        super().__init__(message)
        self.retryable = retryable


@dataclass
class Completion:
    data: dict[str, Any]
    provider: str
    model: str
    latency_ms: int
    input_tokens: int = 0
    output_tokens: int = 0


class Provider(ABC):
    name: str

    @abstractmethod
    def complete_json(
        self,
        *,
        system: str,
        prompt: str,
        schema: type[BaseModel],
        context: dict[str, Any],
        max_tokens: int,
    ) -> Completion: ...

    def healthy(self) -> bool:
        return True


def _strict_schema(model: type[BaseModel]) -> dict[str, Any]:
    """Pydantic JSON schema adapted for structured outputs: every object closed."""
    schema = model.model_json_schema()

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            if node.get("type") == "object" or "properties" in node:
                node["additionalProperties"] = False
                props = node.get("properties", {})
                node["required"] = list(props.keys())
            for key in ("title", "default"):
                node.pop(key, None)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(schema)
    return schema


class ClaudeProvider(Provider):
    name = "claude"

    def __init__(self, settings: Settings):
        import anthropic  # local import keeps tests free of the dependency at import time

        self._anthropic = anthropic
        self.model = settings.claude_model
        self.effort = settings.claude_effort
        self.client = anthropic.Anthropic(timeout=settings.ai_request_timeout_s, max_retries=2)

    def complete_json(self, *, system, prompt, schema, context, max_tokens) -> Completion:
        a = self._anthropic
        started = time.monotonic()
        try:
            with self.client.beta.messages.stream(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                thinking={"type": "adaptive"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                output_config={
                    "effort": self.effort,
                    "format": {"type": "json_schema", "schema": _strict_schema(schema)},
                },
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                msg = stream.get_final_message()
        except a.RateLimitError as e:
            raise ProviderError(f"claude rate limited: {e}") from e
        except a.APIStatusError as e:
            raise ProviderError(f"claude HTTP {e.status_code}: {e}", retryable=e.status_code >= 500) from e
        except a.APIConnectionError as e:
            raise ProviderError(f"claude connection error: {e}") from e

        if msg.stop_reason == "refusal":
            raise ProviderError("claude refused the request", retryable=False)
        if msg.stop_reason == "max_tokens":
            raise ProviderError("claude output truncated (max_tokens)")
        text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            raise ProviderError(f"claude returned invalid JSON: {e}") from e
        return Completion(
            data=data,
            provider=self.name,
            model=self.model,
            latency_ms=int((time.monotonic() - started) * 1000),
            input_tokens=getattr(msg.usage, "input_tokens", 0) or 0,
            output_tokens=getattr(msg.usage, "output_tokens", 0) or 0,
        )


class LMStudioProvider(Provider):
    """LM Studio exposes an OpenAI-compatible local server (default http://localhost:1234/v1)."""

    name = "lmstudio"

    def __init__(self, settings: Settings, transport: httpx.BaseTransport | None = None):
        self.base_url = settings.lmstudio_base_url.rstrip("/")
        self.model = settings.lmstudio_model
        self.http = httpx.Client(timeout=settings.ai_request_timeout_s, transport=transport)

    def healthy(self) -> bool:
        try:
            return self.http.get(f"{self.base_url}/models", timeout=2.0).status_code == 200
        except httpx.HTTPError:
            return False

    def complete_json(self, *, system, prompt, schema, context, max_tokens) -> Completion:
        started = time.monotonic()
        body = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": schema.__name__, "strict": True, "schema": _strict_schema(schema)},
            },
        }
        try:
            r = self.http.post(f"{self.base_url}/chat/completions", json=body)
        except httpx.HTTPError as e:
            raise ProviderError(f"lmstudio unreachable: {e}") from e
        if r.status_code != 200:
            raise ProviderError(f"lmstudio HTTP {r.status_code}: {r.text[:300]}", retryable=r.status_code >= 500)
        payload = r.json()
        try:
            content = payload["choices"][0]["message"]["content"]
            data = json.loads(content)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise ProviderError(f"lmstudio returned unparseable output: {e}") from e
        usage = payload.get("usage") or {}
        return Completion(
            data=data,
            provider=self.name,
            model=self.model,
            latency_ms=int((time.monotonic() - started) * 1000),
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
        )


class GeminiProvider(Provider):
    """Google Gemini via the REST generateContent endpoint with a JSON response schema."""

    name = "gemini"

    def __init__(self, settings: Settings, transport: httpx.BaseTransport | None = None):
        if not settings.gemini_api_key:
            raise ValueError("TRIAD_GEMINI_API_KEY is not set")
        self.base_url = settings.gemini_base_url.rstrip("/")
        self.model = settings.gemini_model
        self._key = settings.gemini_api_key
        self.http = httpx.Client(timeout=settings.ai_request_timeout_s, transport=transport)

    def complete_json(self, *, system, prompt, schema, context, max_tokens) -> Completion:
        started = time.monotonic()
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
                "responseJsonSchema": _strict_schema(schema),
            },
        }
        try:
            r = self.http.post(f"{self.base_url}/models/{self.model}:generateContent", json=body,
                               headers={"x-goog-api-key": self._key})
        except httpx.HTTPError as e:
            raise ProviderError(f"gemini unreachable: {e}") from e
        if r.status_code != 200:
            raise ProviderError(f"gemini HTTP {r.status_code}: {r.text[:300]}",
                                retryable=r.status_code in (429,) or r.status_code >= 500)
        payload = r.json()
        try:
            cand = payload["candidates"][0]
            if cand.get("finishReason") not in (None, "STOP"):
                raise ProviderError(f"gemini finished with {cand.get('finishReason')}",
                                    retryable=cand.get("finishReason") == "MAX_TOKENS")
            text = "".join(p.get("text", "") for p in cand["content"]["parts"])
            data = json.loads(text)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise ProviderError(f"gemini returned unparseable output: {e}") from e
        usage = payload.get("usageMetadata") or {}
        return Completion(data=data, provider=self.name, model=self.model,
                          latency_ms=int((time.monotonic() - started) * 1000),
                          input_tokens=usage.get("promptTokenCount", 0),
                          output_tokens=usage.get("candidatesTokenCount", 0))


ProceduralFn = Callable[[dict[str, Any]], dict[str, Any]]


class ProceduralProvider(Provider):
    """Deterministic, offline implementation of each task (seeded by the context)."""

    name = "procedural"
    model = "procedural-v1"

    def complete_json(self, *, system, prompt, schema, context, max_tokens) -> Completion:
        fn: ProceduralFn | None = context.get("_procedural")
        if fn is None:
            raise ProviderError("no procedural implementation for this task", retryable=False)
        started = time.monotonic()
        data = fn({k: v for k, v in context.items() if not k.startswith("_")})
        return Completion(data=data, provider=self.name, model=self.model,
                          latency_ms=int((time.monotonic() - started) * 1000))
