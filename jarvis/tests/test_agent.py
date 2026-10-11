"""Agent loop with a scripted fake client – no network or API key needed."""
import os
import sys
import tempfile
import unittest
from types import SimpleNamespace as NS
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("JARVIS_HOME", tempfile.mkdtemp())

import anthropic  # noqa: E402

from jarvis.brain import agent, intents  # noqa: E402


def text(t):
    return NS(type="text", text=t)


def tool(id_, name, inp):
    return NS(type="tool_use", id=id_, name=name, input=inp)


class FakeMessages:
    def __init__(self, script):
        self.script, self.calls = list(script), []

    def create(self, **kw):
        self.calls.append({**kw, "messages": list(kw["messages"])})
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


class Ctx:
    cfg = {"ai": {"api_key": "x", "mode": "auto"}, "user_name": "בוס"}
    last_stats = {}

    def __init__(self):
        self.logs, self.cards = [], []

    def log(self, m, level="info"):
        self.logs.append(m)

    def card(self, *a):
        self.cards.append(a)


def make_agent(script):
    a = agent.Agent({"ai": {"api_key": "sk-test", "mode": "auto"}, "user_name": "בוס"}, print)
    fake = FakeMessages(script)
    a.client = NS(beta=NS(messages=fake))
    return a, fake


class AgentTests(unittest.TestCase):
    def test_tool_chain(self):
        a, fake = make_agent([
            NS(stop_reason="tool_use", content=[tool("t1", "play_youtube", {"query": "MrBeast new video"}),
                                                tool("t2", "media", {"action": "volume_down", "steps": 5})]),
            NS(stop_reason="end_turn", content=[text("מנגן את הסרטון החדש ומנמיך.")]),
        ])
        ctx = Ctx()
        with mock.patch.object(agent.web, "play_youtube", return_value="I Built A City") as yt, \
                mock.patch.object(agent.system, "volume") as vol:
            reply = a.run("תכניס לי את הסרטון החדש של מיסטר ביסט ותנמיך", ctx)
        self.assertEqual(reply, "מנגן את הסרטון החדש ומנמיך.")
        yt.assert_called_once_with("MrBeast new video")
        vol.assert_called_once_with("down", 5)
        # both results go back in ONE user message, matched by id
        results = fake.calls[1]["messages"][-1]["content"]
        self.assertEqual([r["tool_use_id"] for r in results], ["t1", "t2"])
        self.assertIn("I Built A City", results[0]["content"])
        self.assertEqual(fake.calls[0]["fallbacks"], "default")
        self.assertEqual(fake.calls[0]["betas"], ["server-side-fallback-2026-07-01"])
        self.assertEqual(fake.calls[0]["model"], "claude-opus-5-5")
        # history is append-only: user, assistant, user(tool results), assistant
        self.assertEqual([m["role"] for m in a.messages], ["user", "assistant", "user", "assistant"])

    def test_tool_error_is_reported_not_raised(self):
        a, fake = make_agent([
            NS(stop_reason="tool_use", content=[tool("t1", "open_path", {"path": "C:/nope.txt"})]),
            NS(stop_reason="end_turn", content=[text("לא מצאתי את הקובץ.")]),
        ])
        with mock.patch.object(agent.apps, "open_path", side_effect=FileNotFoundError("missing")):
            reply = a.run("פתח את הקובץ", Ctx())
        self.assertEqual(reply, "לא מצאתי את הקובץ.")
        r = fake.calls[1]["messages"][-1]["content"][0]
        self.assertTrue(r["is_error"])

    def test_connection_error_falls_back(self):
        req = mock.Mock()
        a, _ = make_agent([anthropic.APIConnectionError(request=req)])
        self.assertIsNone(a.run("מה מזג האוויר", Ctx()))
        self.assertEqual(a.messages, [])  # reset so the next turn starts clean

    def test_refusal(self):
        a, _ = make_agent([NS(stop_reason="refusal", content=[])])
        self.assertTrue(a.run("...", Ctx()))
        self.assertEqual(a.messages, [])

    def test_routing(self):
        a, _ = make_agent([])
        self.assertFalse(a.wants(intents.parse("פתח כרום"), "פתח כרום"))
        self.assertFalse(a.wants(intents.parse("מה השעה"), "מה השעה"))
        for t in ["תכניס לי את הסרטון החדש של מיסטר ביסט", "מה מזג האוויר מחר בתל אביב",
                  "תפתח ספוטיפיי ותגביר את הווליום", "תזכיר לי בעוד עשר דקות להוציא את הפיצה"]:
            self.assertTrue(a.wants(intents.parse(t), t), t)
        off = agent.Agent({"ai": {"mode": "off"}}, print)
        self.assertFalse(off.ready)

    def test_tools_schema(self):
        names = [t["name"] for t in agent.TOOLS]
        self.assertEqual(len(names), len(set(names)))
        for t in agent.TOOLS:
            if "input_schema" in t:
                sch = t["input_schema"]
                self.assertFalse(sch["additionalProperties"])
                self.assertEqual(sorted(sch["required"]), sorted(sch["properties"]))


if __name__ == "__main__":
    unittest.main()
