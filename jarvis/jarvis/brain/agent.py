"""JARVIS's AI brain: Claude understands free speech and drives the PC through tools.

Hot-reloads like the rest of brain/. Needs an Anthropic API key (config `ai.api_key`
or the ANTHROPIC_API_KEY environment variable); without one JARVIS uses the fast
local command parser only.
"""
from __future__ import annotations

import json
import re
import threading
import time
import traceback

from ..actions import apps, control, system, web
from ..config import DATA
from . import skills
from .intents import Intent

MEMORY_FILE = DATA / "memory.json"
FALLBACK_BETA = "server-side-fallback-2026-07-01"
MAX_STEPS = 10
IDLE_RESET_S = 15 * 60
MAX_MESSAGES = 60

# Commands the local parser handles instantly and reliably; everything else goes to the AI.
LOCAL_FAST = {"open", "folder", "close", "search", "youtube", "youtube_search", "install", "uninstall", "volume",
              "mute", "media", "time", "date", "lock", "screenshot", "shutdown", "restart_pc", "theme", "hide",
              "show", "reload", "restart_self", "edit_config", "edit_commands", "open_plugins", "open_source",
              "enroll", "sleep", "stop_speaking", "show_desktop", "empty"}
RECENCY = re.compile(r"חדש|אחרון|האחרון|הכי|שיצא|היום|new|latest|newest|recent", re.I)
CONNECTORS = re.compile(r"(?:^|\s)(?:ואז|וגם|אחרי ש|אחר כך|and then|then|after that)(?:\s|$)|\s[ו][תפשסה]\w+")

SYSTEM = """You are J.A.R.V.I.S., the personal AI assistant running on the user's Windows PC, modelled on Tony Stark's JARVIS: calm, precise, quietly witty, unfailingly loyal.

Everything you write is spoken aloud by a text-to-speech voice and shown as one line on a HUD:
- Reply in the language the user spoke (usually Hebrew). Keep replies to one or two short sentences.
- No markdown, lists, emojis, URLs or code in replies. Spell numbers naturally.
- Act first, then confirm briefly ("פותח את הסרטון של מיסטר ביסט."). Don't narrate tool mechanics.

You control the PC through your tools. Use them whenever the user wants something done, chaining several in one turn when a request has several parts. Guidelines:
- A specific video, song, clip, trailer or episode → play_youtube with the most precise query you can form (artist + title, channel + topic; add "official" for music). For "the latest/new video of X" include the creator's name plus "new video".
- Facts, news, weather, scores, prices, "what is / who is" → answer yourself with web_search, then reply in a sentence. Use google only when the user wants a search page opened.
- Apps, sites and folders → open. Installing → install_app (it asks the user to confirm by voice). Never claim something happened if a tool reported an error; say what went wrong in plain words.
- Shutdown, restart, uninstall and PowerShell commands go through the user's spoken confirmation; the tool tells you when it is waiting for that.
- remember stores lasting facts about the user (preferences, names, plans) when they ask you to remember something or clearly would want it remembered.
- When a tool says it is waiting for the user's spoken confirmation, the question was already asked aloud: reply with at most a couple of words, or nothing.
- If a request is ambiguous in a way that matters, ask one short question instead of guessing."""


def _tool(name, description, props=None, required=None):
    props = props or {}
    return {"name": name, "description": description, "strict": True,
            "input_schema": {"type": "object", "properties": props,
                             "required": list(props) if required is None else required,
                             "additionalProperties": False}}


S = {"type": "string"}
TOOLS = [
    _tool("open", "Open an installed app (any language/name, e.g. 'chrome', 'וורד'), a website by name or URL, or a known folder (downloads, documents, pictures, desktop, music, videos, recycle bin, this pc).",
          {"target": S}),
    _tool("play_youtube", "Find the best matching YouTube video for the query and start playing it in the browser. Returns the video title.", {"query": S}),
    _tool("youtube_results", "Open the YouTube search results page for a query (when the user wants to browse, not a specific video).", {"query": S}),
    _tool("google", "Open a Google search results page in the browser.", {"query": S}),
    _tool("open_url", "Open an exact URL in the default browser.", {"url": S}),
    _tool("install_app", "Download and install an app with winget (no Microsoft Store window). Asks the user to confirm by voice first.", {"name": S}),
    _tool("uninstall_app", "Uninstall an app with winget after the user confirms by voice.", {"name": S}),
    _tool("close_app", "Close a running app by name.", {"name": S}),
    _tool("media", "Volume and media keys. steps: how many volume steps (1 step = 2%), use 1 for non-volume actions.",
          {"action": {"type": "string", "enum": ["volume_up", "volume_down", "mute", "play_pause", "next", "previous"]},
           "steps": {"type": "integer"}}),
    _tool("system", "System actions. shutdown/restart ask the user to confirm first.",
          {"action": {"type": "string", "enum": ["lock", "screenshot", "show_desktop", "shutdown", "restart"]}}),
    _tool("window", "Control windows. 'focus' brings the window whose title best matches `target` to the front (use target '' for other actions).",
          {"action": {"type": "string", "enum": ["focus", "minimize", "maximize", "close", "switch", "snap_left", "snap_right", "task_view"]},
           "target": S}),
    _tool("keyboard", "Type text into the focused window, or press a key combination like 'ctrl+s', 'enter', 'alt+f4', 'ctrl+shift+t'.",
          {"action": {"type": "string", "enum": ["type", "press"]}, "text": S}),
    _tool("find_files", "Search the user's Desktop/Documents/Downloads/Pictures/Videos/Music by file or folder name. Returns full paths.", {"query": S}),
    _tool("open_path", "Open a file or folder by full path with its default app.", {"path": S}),
    _tool("clipboard", "Read the clipboard (action 'get', text '') or put text on it (action 'set').",
          {"action": {"type": "string", "enum": ["get", "set"]}, "text": S}),
    _tool("run_powershell", "Run a PowerShell command on the PC for anything the other tools can't do. The user must confirm by voice; the output is shown to them afterwards. Explain in `purpose` (Hebrew, one short sentence) what it does.",
          {"command": S, "purpose": S}),
    _tool("system_status", "Current CPU, memory, disk, battery, uptime, heaviest processes and open windows."),
    _tool("set_timer", "Set a timer/reminder; JARVIS speaks `message` when it fires.",
          {"seconds": {"type": "integer"}, "message": S}),
    _tool("remember", "Store a lasting fact about the user.", {"fact": S}),
    _tool("forget", "Delete remembered facts that contain this text.", {"text": S}),
    _tool("jarvis", "Control JARVIS itself.",
          {"action": {"type": "string", "enum": ["hide", "show", "sleep", "theme_green", "theme_gold", "theme_cyan", "reload",
                                                  "learn_my_voice", "open_settings", "open_commands"]}}),
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 3},
]


# ------------------------------------------------------------------ memory
def load_memory() -> list[str]:
    try:
        return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_memory(items: list[str]) -> None:
    MEMORY_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")


# ------------------------------------------------------------------ tool execution
def execute(name: str, a: dict, ctx) -> str:
    if name == "open":
        reply = skills.open_target(a["target"], ctx)
        ctx.card("open", a["target"], reply)
        return reply
    if name == "play_youtube":
        title = web.play_youtube(a["query"])
        ctx.card("youtube", title or a["query"], "YouTube")
        return f"Playing: {title}" if title else "No exact video found; opened the YouTube results page instead."
    if name == "youtube_results":
        web.youtube_search_page(a["query"])
        ctx.card("youtube", a["query"], "YouTube search")
        return "Opened YouTube results."
    if name == "google":
        web.google(a["query"])
        ctx.card("search", a["query"], "Google")
        return "Opened Google results."
    if name == "open_url":
        web.open_url(a["url"])
        ctx.card("open", a["url"], "browser")
        return "Opened."
    if name == "install_app":
        reply = skills.do_install(a["name"], ctx)
        return reply or "Asked the user to confirm the installation by voice; it starts if they say yes."
    if name == "uninstall_app":
        skills.do_uninstall(a["name"], ctx)
        return "Asked the user to confirm by voice; it proceeds if they say yes."
    if name == "close_app":
        closed = apps.close_app(skills.resolve_alias(a["name"], ctx.cfg), ctx.app_index)
        return f"Closed {closed[0]}." if closed else f"{a['name']} is not running."
    if name == "media":
        act, steps = a["action"], max(1, min(int(a.get("steps") or 1), 50))
        if act in ("volume_up", "volume_down"):
            system.volume("up" if act == "volume_up" else "down", steps)
        else:
            system.press({"mute": "mute", "play_pause": "playpause", "next": "next", "previous": "prev"}[act])
        return "Done."
    if name == "system":
        act = a["action"]
        if act == "lock":
            ctx.background(lambda: (time.sleep(1.5), system.lock()))
            return "Locking in a moment."
        if act == "screenshot":
            path = system.screenshot()
            ctx.card("screenshot", path.name, "Pictures/JARVIS")
            return f"Saved {path}."
        if act == "show_desktop":
            system.show_desktop()
            return "Done."
        restart = act == "restart"
        ctx.confirm("להפעיל מחדש את המחשב?" if restart else "לכבות את המחשב?",
                    lambda: (system.shutdown(restart), "בעוד עשר שניות.")[1])
        return "Asked the user to confirm by voice."
    if name == "window":
        if a["action"] == "focus":
            title = control.focus_window(a["target"])
            return f"Focused: {title}" if title else "No matching window. Open windows: " + "; ".join(control.list_windows()[:15])
        control.window_action(a["action"])
        return "Done."
    if name == "keyboard":
        if a["action"] == "type":
            control.type_text(a["text"])
        else:
            control.press_keys(a["text"])
        return "Done."
    if name == "find_files":
        found = control.find_files(a["query"])
        return "\n".join(found) if found else "Nothing found."
    if name == "open_path":
        apps.open_path(a["path"])
        ctx.card("open", a["path"].replace("\\", "/").rsplit("/", 1)[-1], "file")
        return "Opened."
    if name == "clipboard":
        if a["action"] == "get":
            return control.get_clipboard()[:3000] or "(clipboard is empty)"
        control.set_clipboard(a["text"])
        return "Copied."
    if name == "run_powershell":
        cmd = a["command"]

        def go():
            def work():
                out = control.run_powershell(cmd)
                ctx.log(f"PS> {cmd}\n{out}")
                ctx.card("terminal", a["purpose"], out[:160])
                ctx.say("בוצע. הפלט מופיע ביומן.")
            ctx.background(work)
            return "מריץ."
        ctx.confirm(f"{a['purpose']} להריץ?", go, detail=cmd[:140])
        return "Waiting for the user's spoken confirmation; the result will be shown to them."
    if name == "system_status":
        s = ctx.last_stats or {}
        bat = s.get("battery") or {}
        return json.dumps({
            "cpu_percent": round(s.get("cpu", 0)), "ram_percent": round(s.get("ram", 0)),
            "disk_percent": (s.get("disk") or {}).get("pct"), "battery": bat.get("pct"), "charging": bat.get("plugged"),
            "uptime_hours": round(s.get("uptime", 0) / 3600, 1),
            "heaviest_processes": control.top_processes(), "open_windows": control.list_windows()[:20],
        }, ensure_ascii=False)
    if name == "set_timer":
        secs, msg = max(1, int(a["seconds"])), a["message"]

        def ring():
            ctx.hub.publish("toast", {"level": "ok", "text": f"⏰ {msg}"})
            ctx.card("timer", msg, "תזכורת")
            ctx.say(msg)
        t = threading.Timer(secs, ring)
        t.daemon = True
        t.start()
        ctx.card("timer", msg, f"בעוד {secs // 60} דק׳" if secs >= 60 else f"בעוד {secs} שנ׳")
        return f"Timer set for {secs} seconds."
    if name == "remember":
        mem = load_memory()
        mem.append(a["fact"])
        save_memory(mem[-100:])
        return "Remembered."
    if name == "forget":
        mem = load_memory()
        keep = [m for m in mem if a["text"] not in m]
        save_memory(keep)
        return f"Forgot {len(mem) - len(keep)} item(s)."
    if name == "jarvis":
        act = a["action"]
        mapping = {"hide": "hide", "show": "show", "sleep": "sleep", "reload": "reload", "learn_my_voice": "enroll",
                   "open_settings": "edit_config", "open_commands": "edit_commands"}
        if act.startswith("theme_"):
            ctx.set_theme(act.split("_", 1)[1])
            return "Done."
        skills.handle(Intent(mapping[act]), ctx)
        return "Done."
    return f"Unknown tool {name}"


# ------------------------------------------------------------------ the agent
class Agent:
    def __init__(self, cfg: dict, log):
        self.cfg = cfg
        self.log = log
        self.messages: list = []
        self.last_used = 0.0
        self.client = None
        self.error = ""
        ai = cfg.get("ai") or {}
        if ai.get("mode", "auto") == "off":
            self.error = "off"
            return
        import os
        key_ = (ai.get("api_key") or "").strip()
        if not key_ and not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
            self.error = "no API key"
            return
        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=key_) if key_ else anthropic.Anthropic()
            self._anthropic = anthropic
        except Exception as e:  # package missing or no credentials
            self.client = None
            self.error = str(e)

    @property
    def ready(self) -> bool:
        return self.client is not None

    def wants(self, intent: Intent, text: str) -> bool:
        """Should this utterance go to the AI rather than the instant local parser?"""
        if not self.ready:
            return False
        mode = (self.cfg.get("ai") or {}).get("mode", "auto")
        if mode == "always":
            return True
        if intent.name not in LOCAL_FAST:
            return True
        if intent.name == "youtube" and RECENCY.search(text):
            return True  # "the newest video of X" needs a web search, not just the top match
        return len(text.split()) > 9 or bool(CONNECTORS.search(" " + text))

    def reset(self):
        self.messages = []

    def _context(self) -> str:
        now = time.localtime()
        days = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"]
        mem = load_memory()
        lines = [f"[{time.strftime('%d/%m/%Y %H:%M', now)}, יום {days[now.tm_wday]}. User name/title: {self.cfg.get('user_name', '')}."]
        if mem:
            lines.append("Things you remember about the user: " + " | ".join(mem[-40:]))
        return " ".join(lines) + "]"

    def run(self, text: str, ctx) -> str | None:
        """Returns the reply to speak, or None when the AI is unavailable (caller falls back)."""
        if not self.ready:
            return None
        ai = self.cfg.get("ai") or {}
        if time.time() - self.last_used > IDLE_RESET_S or len(self.messages) > MAX_MESSAGES:
            self.reset()  # start fresh instead of trimming: the history stays append-only
        self.last_used = time.time()
        self.messages.append({"role": "user", "content": f"{self._context()}\n{text}"})
        an = self._anthropic
        resp = None
        try:
            for _ in range(MAX_STEPS):
                resp = self.client.beta.messages.create(
                    model=ai.get("model") or "claude-opus-5-5",
                    max_tokens=16000,
                    system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
                    tools=TOOLS,
                    messages=self.messages,
                    output_config={"effort": ai.get("effort") or "low"},
                    betas=[FALLBACK_BETA],
                    fallbacks="default",
                )
                if resp.stop_reason == "refusal":
                    self.reset()
                    return "את זה אני לא יכול לעשות."
                self.messages.append({"role": "assistant", "content": resp.content})
                if resp.stop_reason == "pause_turn":
                    continue  # server-side web search paused mid-turn; resend to let it finish
                uses = [b for b in resp.content if b.type == "tool_use"]
                if not uses:
                    break
                results = []
                for b in uses:
                    ctx.log(f"🛠 {b.name} {json.dumps(b.input, ensure_ascii=False)[:160]}")
                    try:
                        out, err = execute(b.name, b.input, ctx), False
                    except Exception as e:
                        out, err = f"Error: {e}", True
                        ctx.log(traceback.format_exc(limit=3), "error")
                    results.append({"type": "tool_result", "tool_use_id": b.id, "content": str(out)[:4000],
                                    **({"is_error": True} if err else {})})
                self.messages.append({"role": "user", "content": results})
            else:
                self.reset()  # ran out of steps with tool calls still open
                return "זה לקח יותר מדי צעדים. נסה לפרק את הבקשה."
        except an.AuthenticationError:
            self.client, self.error = None, "invalid API key"
            ctx.log("Anthropic API key is invalid – check ai.api_key in config.yaml", "error")
            self.reset()
            return None
        except (an.APIConnectionError, an.APITimeoutError):
            ctx.log("AI unreachable (no internet?) – using local commands", "warn")
            self.reset()
            return None
        except an.APIStatusError as e:
            ctx.log(f"AI error {e.status_code}: {e.message}", "error")
            self.reset()
            return None
        if resp is None:
            return None
        return " ".join(b.text for b in resp.content if b.type == "text").strip() or None
