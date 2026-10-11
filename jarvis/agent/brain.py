"""Conversation: the model when there is one, honest keyword routing when there isn't.

Keeps the last ~10 turns so follow-ups resolve.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import deque
from pathlib import Path

import data
import memory
import tools

API_URL = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com").rstrip("/") + "/v1/messages"
MODEL = os.environ.get("JARVIS_MODEL", "claude-opus-5-5")
EFFORT = os.environ.get("JARVIS_EFFORT", "low")          # low = fast replies for voice
WEB_SEARCH = os.environ.get("JARVIS_WEB_SEARCH", "0") == "1"
HISTORY_TURNS = 10
HERE = Path(__file__).resolve().parent

LANG_NAMES = {"he": "Hebrew", "en": "English", "es": "Spanish", "ar": "Arabic", "ru": "Russian", "fr": "French",
              "de": "German", "it": "Italian", "pt": "Portuguese", "ja": "Japanese", "zh": "Chinese"}


class ModelError(Exception):
    pass


def _tool(name, desc, props=None, required=()):
    return {"name": name, "description": desc,
            "input_schema": {"type": "object", "properties": props or {}, "required": list(required)}}


TOOL_DEFS = [
    _tool("search_brain", "Search the user's own files (notes, PDFs, text) for a specific fact. Returns matching files with text.",
          {"query": {"type": "string", "description": "What to look for, in the words likely used in the notes"}}, ["query"]),
    _tool("read_inbox", "Read the user's email inbox (read-only). Marks which senders already exist in the user's files.",
          {"only_unread": {"type": "boolean"}}),
    _tool("brief_me", "Today's brief: calendar for today and tomorrow, unread mail, and what slipped recently."),
    _tool("plan_day", "Build today's plan: at most five items, ordered by what moves money first."),
    _tool("remember", "Save one fact to long-term memory as a dated file. Always tell the user exactly what was saved.",
          {"fact": {"type": "string", "description": "The fact, as one self-contained sentence"}}, ["fact"]),
    _tool("open_web", "Open something in the user's web browser: a site (youtube, instagram, x, tiktok, whatsapp, gmail, "
          "linkedin, netflix, spotify, maps…), a YouTube search, or play the top YouTube result (play=true).",
          {"site": {"type": "string"}, "query": {"type": "string"}, "play": {"type": "boolean"}}),
    _tool("control_pc", "Do one action on the user's computer from a fixed list. shutdown/restart/sleep ask the user to confirm on screen.",
          {"action": {"type": "string", "enum": tools.ACTIONS},
           "target": {"type": "string", "description": "App name for open_app (e.g. notepad, calculator, chrome, spotify, "
                                                       "settings, explorer, whatsapp, vscode) or folder name for open_folder"}},
          ["action"]),
    _tool("draft_post", "Write a draft post or message for the user to send themselves. Never sends.",
          {"platform": {"type": "string", "description": "x, linkedin, instagram, facebook, whatsapp, email…"},
           "text": {"type": "string", "description": "The full draft text"}}, ["platform", "text"]),
]


class Brain:
    def __init__(self, vault):
        self.vault = vault
        self.history = deque(maxlen=HISTORY_TURNS * 2)

    # ------------------------------------------------------------------ status
    @staticmethod
    def model_status():
        if not os.environ.get("ANTHROPIC_API_KEY"):
            return {"ok": False, "label": "NO MODEL", "reason": "No ANTHROPIC_API_KEY in .env."}
        label = MODEL.replace("claude-", "").replace("-", " ").upper()
        label = re.sub(r"(\d) (\d)", r"\1.\2", label)
        return {"ok": True, "label": label, "model": MODEL}

    # ------------------------------------------------------------------ entry
    def ask(self, text, lang="auto"):
        result, warning = None, None
        if self.model_status()["ok"]:
            try:
                result = self._ask_model(text, lang)
            except ModelError as e:
                warning = f"Model unreachable ({e}). Answered by keyword routing instead."
                print("model error:", e, file=sys.stderr)
        if result is None:
            result = self._ask_keywords(text)
        if warning:
            result["warning"] = warning
        self._remember_turn(text, result)
        return result

    def _remember_turn(self, text, result):
        self.history.append({"role": "user", "content": text})
        shown = ""
        card = result.get("card") or {}
        if card:
            items = [r.get("title", "") for r in card.get("rows", [])][:6]
            shown = f"\n\n[On screen: {card.get('title', '')}" + (": " + " | ".join(
                f"{i + 1}) {t}" for i, t in enumerate(items)) if items else "") + "]"
        self.history.append({"role": "assistant", "content": (result["say"] or "…") + shown})

    # ------------------------------------------------------------------ model path
    def _system(self):
        parts = [(HERE / "prompt.md").read_text(encoding="utf-8")]
        about = data.ROOT / "CLAUDE.md"
        if about.exists():
            parts.append("# Who you're talking to (CLAUDE.md)\n\n" + about.read_text(encoding="utf-8"))
        facts = memory.entries(80)
        if facts:
            parts.append("# Memory (things the user asked you to remember)\n\n" +
                         "\n".join(f"- {f['fact']}  ({f['file']})" for f in facts))
        plat = "Windows" if tools.IS_WIN else "macOS" if tools.IS_MAC else "Linux (computer control is simulated)"
        parts.append(f"# Now\n\nToday is {data.today():%A %d %B %Y}. Data mode: {data.mode()}"
                     f"{' (invented demo data)' if data.mode() == 'demo' else ''}. Computer: {plat}. "
                     f"Web search: {'available' if WEB_SEARCH else 'off — offer open_web with a Google search instead'}.")
        return "\n\n".join(parts)

    def _call(self, messages):
        tool_defs = list(TOOL_DEFS)
        if WEB_SEARCH:
            tool_defs.append({"type": "web_search_20260209", "name": "web_search", "max_uses": 3})
        body = {
            "model": MODEL, "max_tokens": 4096,
            "system": [{"type": "text", "text": self._system(), "cache_control": {"type": "ephemeral"}}],
            "thinking": {"type": "adaptive"}, "output_config": {"effort": EFFORT},
            "tools": tool_defs, "messages": messages, "fallbacks": "default",
        }
        req = urllib.request.Request(API_URL, data=json.dumps(body).encode(), method="POST", headers={
            "content-type": "application/json", "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01"})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            raise ModelError(f"HTTP {e.code}: {detail}") from None
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise ModelError(str(getattr(e, "reason", e))) from None

    def _ask_model(self, text, lang):
        content = [{"type": "text", "text": text}]
        if lang in LANG_NAMES:
            content.append({"type": "text", "text": f"(Reply-language setting: {LANG_NAMES[lang]}.)"})
        messages = list(self.history) + [{"role": "user", "content": content}]
        card, tool_name, said_extra = None, None, []
        for _ in range(8):
            resp = self._call(messages)
            stop = resp.get("stop_reason")
            blocks = resp.get("content", [])
            if stop == "refusal":
                return {"say": "I can't help with that one.", "card": None, "tool": "conversation", "routed_by": "model"}
            messages.append({"role": "assistant", "content": blocks})     # verbatim, thinking blocks included
            web = [b for b in blocks if b.get("type") == "web_search_tool_result" and isinstance(b.get("content"), list)]
            if web and card is None:
                card = {"title": "From the web", "rows": [{"title": r.get("title", ""), "sub": r.get("url", "")}
                                                         for b in web for r in b["content"]][:6]}
                tool_name = "research_web"
            if stop == "pause_turn":
                continue
            if stop != "tool_use":
                break
            results = []
            for b in blocks:
                if b.get("type") != "tool_use":
                    continue
                out = self._run_tool(b["name"], b.get("input") or {})
                if out.get("card"):
                    card, tool_name = out["card"], b["name"]
                if b["name"] == "remember":
                    said_extra.append((b.get("input") or {}).get("fact", ""))
                payload = {"spoken_hint": out["say"], **(out.get("data") or {})}
                results.append({"type": "tool_result", "tool_use_id": b["id"],
                                "content": json.dumps(payload, ensure_ascii=False, default=str)[:12000]})
            messages.append({"role": "user", "content": results})
        say = " ".join(b["text"] for b in blocks if b.get("type") == "text").strip()
        say = re.sub(r"[*_#`]+", "", say) or "Done."
        for fact in said_extra:                       # never write to memory silently
            if fact and fact.lower()[:30] not in say.lower():
                say += f" Saved to memory: “{fact}”."
        return {"say": say, "card": card, "tool": tool_name or "conversation", "routed_by": "model"}

    def _run_tool(self, name, args):
        try:
            if name == "search_brain":
                return tools.search_brain(self.vault, args.get("query", ""))
            if name == "read_inbox":
                return tools.read_inbox(self.vault, bool(args.get("only_unread")))
            if name == "brief_me":
                return tools.brief_me(self.vault)
            if name == "plan_day":
                return tools.plan_day(self.vault)
            if name == "remember":
                return tools.remember(args.get("fact", ""))
            if name == "open_web":
                return tools.open_web(args.get("site"), args.get("query"), bool(args.get("play")))
            if name == "control_pc":
                return tools.control_pc(args.get("action", ""), args.get("target"))
            if name == "draft_post":
                return tools.draft_post(args.get("platform", "post"), args.get("text", ""))
        except Exception as e:
            return {"say": f"The {name} tool failed.", "card": {"title": name, "body": str(e)}, "data": {"error": str(e)}}
        return {"say": "Unknown tool.", "card": None, "data": {"error": "unknown tool"}}

    # ------------------------------------------------------------------ no-model path
    def _ask_keywords(self, text):
        out = self._route(text.strip())
        out["routed_by"] = "keywords"
        return out

    def _route(self, t):
        low = t.lower().strip(" ?!.,")
        lang = "he" if re.search(r"[֐-׿]", t) else "es" if re.search(
            r"\b(hola|qué|que tal|gracias|oye|puedes|tengo)\b|[¿¡ñ]", low) else "en"

        def tool(name, out):
            out["tool"] = name
            return out

        # remember
        m = re.match(r"^(?:please\s+)?(?:remember|note)(?:\s+that)?[:,]?\s+(.+)$", t, re.I) or \
            re.match(r"^(?:תזכור|זכור|תרשום|רשום)(?:\s+ש|\s+כי|:)?\s*(.+)$", t) or \
            re.match(r"^recuerda(?:\s+que)?\s+(.+)$", t, re.I)
        if m:
            return tool("remember", tools.remember(m.group(1)))
        if re.search(r"what do you remember|מה אתה זוכר|qué recuerdas", low):
            return tool("memory", tools.list_memory())

        # computer control
        for pattern, action in [
            (r"volume up|louder|turn (it )?up|תגביר|הגבר|תעלה (את )?(ה)?ווליום|sube el volumen", "volume_up"),
            (r"volume down|quieter|turn (it )?down|תנמיך|הנמך|תוריד (את )?(ה)?ווליום|baja el volumen", "volume_down"),
            (r"\bmute (the )?(sound|computer|pc|volume)\b|השתק|silencia", "mute"),
            (r"^(pause|resume)( the)? (music|song|video)|עצור את המוזיקה|pausa", "play_pause"),
            (r"next (song|track)|השיר הבא|siguiente canción", "next_track"),
            (r"lock (the )?(screen|computer|pc)|תנעל|נעל את", "lock"),
            (r"shut ?down|turn off the (pc|computer)|כבה את המחשב|תכבה את המחשב|apaga el", "shutdown"),
            (r"\b(restart|reboot)\b|הפעל מחדש|תפעיל מחדש|reinicia", "restart"),
            (r"go to sleep|sleep mode|מצב שינה", "sleep"),
        ]:
            if re.search(pattern, low):
                return tool("control_pc", tools.control_pc(action))

        # YouTube / web
        m = re.match(r"^(?:play|נגן|תנגן|תשים|pon|reproduce)\s+(.+?)(?:\s+(?:on|in|en)\s+youtube|\s+ב?יוטיוב)?$", t, re.I)
        if m:
            return tool("open_web", tools.open_web("youtube", m.group(1), play=True))
        m = re.match(r"^(?:search\s+)?(?:youtube|יוטיוב)\s+(?:for\s+)?(.+)$", t, re.I) or \
            re.match(r"^(?:search|חפש|תחפש)\s+(?:on\s+|ב)?(?:youtube|יוטיוב)\s+(?:for\s+)?(.+)$", t, re.I)
        if m:
            return tool("open_web", tools.open_web("youtube", m.group(1)))
        m = re.match(r"^(?:open|launch|start|go to|פתח|תפתח|תפעיל|תיכנס ל|abre)\s+(?:את\s+)?(?:the\s+)?(.+)$", t, re.I)
        if m:
            target = m.group(1).strip(" ?!.").lower()
            if target in tools.APPS:
                return tool("control_pc", tools.control_pc("open_app", target))
            return tool("open_web", tools.open_web(target))
        m = re.match(r"^(?:research|look up|google|search the web for|חפש באינטרנט|תחפש באינטרנט|busca en internet)\s+(.+)$", t, re.I)
        if m:
            return tool("research_web", tools.research_web_offline(m.group(1)))
        if re.search(r"(draft|write).{0,12}(post|tweet|message)|פוסט|ציוץ|publicación", low):
            return tool("draft_post", {"say": "Drafting needs the model. Your words are on screen as a starting draft.",
                                       "card": {"title": "Draft (not sent)", "body": t,
                                                "actions": [{"type": "copy", "text": t, "label": "Copy text"}]}})

        # inbox / brief / plan
        if re.search(r"brief|what'?s on today|תדריך|מה יש לי היום|מה קורה היום|resumen|qué tengo hoy", low):
            return tool("brief_me", tools.brief_me(self.vault))
        if re.search(r"plan (my|the) day|^plan$|תכנן|תכנון|planifica", low):
            return tool("plan_day", tools.plan_day(self.vault))
        if re.search(r"inbox|e-?mails?|\bmail\b|who (wrote|emailed)|מייל|דואר|correo", low):
            return tool("read_inbox", tools.read_inbox(self.vault))

        # small talk — conversation, never a search
        if re.search(r"^(hi|hey|hello|yo|good (morning|evening|afternoon)|thanks|thank you|who are you|how are you)\b|"
                     r"can you hear me|are you there|what do you think|^(why|what|really|ok|okay|cool)$|"
                     r"^(שלום|היי|הי|אהלן|בוקר טוב|ערב טוב|תודה|מי אתה|מה נשמע|מה קורה|למה|באמת)|אתה שומע|אתה שם|מה דעתך|"
                     r"^(hola|buenos|buenas|gracias|quién eres|qué tal|por qué)|me oyes|qué opinas", low):
            hear = bool(re.search(r"hear me|שומע|me oyes|there|שם", low))
            follow = bool(re.search(r"^(why|what|really|למה|באמת|por qué)$|what do you think|מה דעתך|qué opinas", low))
            if follow:
                hear = None
            pre = {"en": ("Loud and clear. " if hear else "I'm here. ") if hear is not None else "",
                   "he": ("שומע אותך מצוין. " if hear else "אני כאן. ") if hear is not None else "",
                   "es": ("Te oigo perfectamente. " if hear else "Aquí estoy. ") if hear is not None else ""}
            lines = {
                "en": pre["en"] + (
                    "Reasoning about that needs my model, which isn't connected yet." if follow else
                    "My model isn't connected yet, so right now I can search your files, read mail, brief you, plan, remember, and open things."),
                "he": pre["he"] + (
                    "בשביל לחשוב על זה אני צריך את המודל, והוא עוד לא מחובר." if follow else
                    "המודל שלי עוד לא מחובר, אז כרגע אני יכול לחפש בקבצים, לקרוא מיילים, לתדרך, לתכנן, לזכור ולפתוח דברים."),
                "es": pre["es"] + (
                    "Para razonar sobre eso necesito el modelo, que aún no está conectado." if follow else
                    "Mi modelo aún no está conectado; ahora mismo puedo buscar en tus archivos, leer correo, resumir tu día, planificar, recordar y abrir cosas."),
            }
            return tool("conversation", {"say": lines[lang], "card": None})

        # a question about my files?
        hits = self.vault.search(t, 3)
        if hits and hits[0]["score"] >= 3.0:
            return tool("search_brain", tools.search_brain(self.vault, t))
        lines = {"en": "I can't answer that without my model, and your files don't cover it.",
                 "he": "בלי המודל אני לא יכול לענות על זה, וזה גם לא מופיע בקבצים שלך.",
                 "es": "No puedo responder eso sin el modelo, y tus archivos no lo cubren."}
        return tool("conversation", {"say": lines[lang], "card": None})
