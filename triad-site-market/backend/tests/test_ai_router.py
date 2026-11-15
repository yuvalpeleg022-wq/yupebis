import httpx
from pydantic import BaseModel

from app.ai.providers import Completion, LMStudioProvider, ProceduralProvider, Provider, ProviderError
from app.ai.router import AIRouter, Task
from app.config import Settings


class Out(BaseModel):
    answer: str


class Flaky(Provider):
    name = "lmstudio"
    model = "flaky"

    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = 0

    def complete_json(self, **kw):
        self.calls += 1
        o = self.outputs.pop(0)
        if isinstance(o, Exception):
            raise o
        return Completion(data=o, provider=self.name, model=self.model, latency_ms=1)


def test_retries_invalid_output_then_succeeds():
    p = Flaky([{"wrong": 1}, {"answer": "ok"}])
    r = AIRouter(Settings(), providers={"lmstudio": p}).run(Task.brief, system="s", prompt="p", schema=Out)
    assert r.value.answer == "ok" and p.calls == 2


def test_falls_back_to_claude_then_procedural():
    local = Flaky([ProviderError("down"), ProviderError("down")])
    claude = Flaky([ProviderError("refused", retryable=False)])
    claude.name = "claude"
    router = AIRouter(Settings(), providers={"lmstudio": local, "claude": claude, "procedural": ProceduralProvider()})
    r = router.run(Task.brief, system="s", prompt="p", schema=Out, procedural=lambda ctx: {"answer": "proc"})
    assert r.value.answer == "proc" and r.completion.provider == "procedural"
    assert [a["provider"] for a in r.attempts] == ["lmstudio", "lmstudio", "claude", "procedural"]


def test_claude_only_tasks_skip_local_model():
    local = Flaky([{"answer": "local"}])
    router = AIRouter(Settings(), providers={"lmstudio": local, "procedural": ProceduralProvider()})
    r = router.run(Task.site_architecture, system="s", prompt="p", schema=Out, procedural=lambda c: {"answer": "p"})
    assert local.calls == 0 and r.completion.provider == "procedural"


def test_lmstudio_provider_parses_openai_compatible_response():
    def handler(req: httpx.Request):
        assert req.url.path.endswith("/chat/completions")
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"answer": "hi"}'}}],
                                         "usage": {"prompt_tokens": 3, "completion_tokens": 2}})

    p = LMStudioProvider(Settings(), transport=httpx.MockTransport(handler))
    c = p.complete_json(system="s", prompt="p", schema=Out, context={}, max_tokens=50)
    assert c.data == {"answer": "hi"} and c.output_tokens == 2


def test_gemini_provider_request_and_parse():
    from app.ai.providers import GeminiProvider

    seen = {}

    def handler(req: httpx.Request):
        seen["key"] = req.headers.get("x-goog-api-key")
        seen["path"] = req.url.path
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": '{"answer": "g"}'}]}}],
            "usageMetadata": {"promptTokenCount": 5, "candidatesTokenCount": 3}})

    p = GeminiProvider(Settings(gemini_api_key="test-key"), transport=httpx.MockTransport(handler))
    c = p.complete_json(system="s", prompt="p", schema=Out, context={}, max_tokens=50)
    assert c.data == {"answer": "g"} and seen["key"] == "test-key" and seen["path"].endswith(":generateContent")


def test_gemini_used_as_fallback_for_claude_tasks():
    claude = Flaky([ProviderError("overloaded", retryable=False)])
    claude.name = "claude"
    gem = Flaky([{"answer": "from gemini"}])
    gem.name = "gemini"
    r = AIRouter(Settings(), providers={"claude": claude, "gemini": gem}).run(
        Task.site_architecture, system="s", prompt="p", schema=Out)
    assert r.value.answer == "from gemini"
