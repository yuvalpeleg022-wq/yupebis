"""The assistant: voice pipeline, command dispatch, confirmations, hot reload."""
from __future__ import annotations

import importlib
import queue
import threading
import time
import traceback
from dataclasses import dataclass
from typing import Callable

from . import config as C
from . import hotreload, plugin, stats
from .actions import apps, installer, system, web
from .brain import intents, skills
from .brain import text as textmod
from .server import Hub

RELOADABLE = [textmod, web, apps, installer, system, intents, skills]

ENROLL_PHRASES = [
    "ג'רוויס, פתח לי את גוגל כרום בבקשה.",
    "היום אני רוצה לשמוע מוזיקה ולראות סרטון ביוטיוב.",
    "ג'רוויס, תתקין את דיסקורד ותפתח את ספוטיפיי.",
    "השמיים כחולים, השמש זורחת, והמחשב שלי עובד מצוין.",
    "זה הקול שלי, ורק לי מותר לתת לך פקודות.",
]


@dataclass
class Pending:
    question: str
    on_yes: Callable[[], str | None]
    expires: float


class Assistant:
    def __init__(self, hub: Hub, cfg: dict, voice: bool = True):
        self.hub = hub
        self.cfg = cfg
        self.voice_wanted = voice
        self.theme = cfg.get("theme", "gold")
        self.app_index = apps.AppIndex()
        self.commands: list = []
        self.plugin_cmds: list = []
        self.pending: Pending | None = None
        self.awake_until = 0.0
        self.last_stats: dict = {}
        self.ui_callback: Callable[[str], None] = lambda cmd: None
        self.listener = None
        self.stt = None
        self.speaker = None
        self.tts = None
        self.enrolling: dict | None = None
        self.voice_ready = False
        self._work: queue.Queue = queue.Queue()
        self._stop = threading.Event()
        self._speaking_until = 0.0
        self._status = "boot"
        self._warned_unlocked = False

    # ================================================================ lifecycle
    def start(self):
        self.publish_static()
        self._load_commands()
        self._load_plugins()
        threading.Thread(target=self._worker, name="worker", daemon=True).start()
        threading.Thread(target=stats.sampler, args=(self._on_stats, self._stop), name="stats", daemon=True).start()
        threading.Thread(target=self._boot_background, name="boot", daemon=True).start()
        if (self.cfg.get("dev") or {}).get("hot_reload", True):
            threading.Thread(target=hotreload.watch, args=(self.on_file_change, self._stop),
                             name="hotreload", daemon=True).start()

    def stop(self):
        self._stop.set()
        if self.listener:
            self.listener.stop()

    def _boot_background(self):
        n = self.app_index.refresh()
        self.log(f"indexed {n} apps")
        if not installer.available() and C.IS_WINDOWS:
            self.log("winget not found – installs disabled", "warn")
        from .voice.tts import TTS
        self.tts = TTS(self.cfg.get("tts") or {}, self.log)
        self.status("idle")
        if self.voice_wanted and (self.cfg.get("voice") or {}).get("enabled", True):
            self.start_voice()
        else:
            self.publish_voice_info()
        self.say(self._greeting())

    def _greeting(self) -> str:
        h = time.localtime().tm_hour
        part = "בוקר טוב" if 5 <= h < 12 else "צהריים טובים" if h < 17 else "ערב טוב" if h < 22 else "לילה טוב"
        return f"{part}, {self.cfg.get('user_name', '')}. כל המערכות מוכנות."

    def start_voice(self):
        vcfg = self.cfg.get("voice") or {}
        try:
            from .voice.audio import Listener
            from .voice.speaker import SpeakerVerifier
            from .voice.stt import STT
            self.stt = STT(vcfg, self.log)
            self.stt.load()
            if (self.cfg.get("speaker") or {}).get("require_match", True):
                self.speaker = SpeakerVerifier(self.log)
                try:
                    self.speaker.load_model()
                except Exception as e:
                    self.speaker = None
                    self.log(f"voice-ID unavailable ({e}). Install speechbrain+torch to lock JARVIS to your voice.", "warn")
            self.listener = Listener(vcfg, self._on_utterance, self._on_level, self._on_speech_start, self.log)
            self.listener.start()
            self.voice_ready = True
            self.log("voice online")
        except Exception as e:
            self.voice_ready = False
            self.log(f"voice offline: {e}", "error")
            self.log(traceback.format_exc(limit=2), "error")
        self.publish_voice_info()
        if self.speaker and not self.speaker.enrolled:
            self.start_enroll()

    def restart_voice(self):
        if self.listener:
            self.listener.stop()
        self.listener = None
        self.voice_ready = False
        threading.Thread(target=self.start_voice, daemon=True).start()

    # ================================================================ events → HUD
    def log(self, msg: str, level: str = "info"):
        entry = {"t": time.strftime("%H:%M:%S"), "level": level, "msg": str(msg)}
        self.hub.publish("log", entry)
        try:
            with open(C.LOG_FILE, "a", encoding="utf-8") as f:
                f.write(f"{entry['t']} [{level}] {msg}\n")
        except OSError:
            pass

    def status(self, s: str):
        self._status = s
        self.hub.publish("status", s, keep=True)

    def progress(self, label, pct=None, line: str | None = None):
        self.hub.publish("progress", None if label is None else {"label": label, "pct": pct, "line": line})
        if line:
            self.log(line)

    def publish_static(self):
        self.hub.publish("theme", self.theme, keep=True)
        self.hub.publish("dock", self.cfg.get("dock") or {}, keep=True)
        self.hub.publish("user", self.cfg.get("user_name", ""), keep=True)

    def publish_voice_info(self):
        vcfg = self.cfg.get("voice") or {}
        self.hub.publish("voice", {
            "ready": self.voice_ready,
            "engine": vcfg.get("stt_engine"),
            "wake": (vcfg.get("wake_words") or ["jarvis"])[0],
            "locked": bool(self.speaker and self.speaker.enrolled),
            "voice_id": bool(self.speaker),
        }, keep=True)

    def _on_stats(self, s):
        self.last_stats = s
        self.hub.publish("stats", s, keep=True)

    def _on_level(self, lvl):
        self.hub.publish("level", round(lvl, 3))

    def _on_speech_start(self):
        if not self.enrolling and time.time() > self._speaking_until:
            self.status("listening")

    def _on_utterance(self, audio):
        if time.time() < self._speaking_until:
            return
        self._work.put(("audio", audio))

    # ================================================================ speaking
    def say(self, text: str | None):
        if not text:
            return
        self.hub.publish("reply", text)
        self.log(f"JARVIS: {text}")
        if not self.tts:
            return
        self.status("speaking")
        est = 1.5 + len(text) * 0.085
        self._speaking_until = time.time() + est
        if self.listener:
            self.listener.paused = True
        name = self.tts.render(text)
        if name:
            self._speaking_until = time.time() + est + 1
            self.hub.publish("tts", {"url": f"/tts/{name}", "text": text})
            threading.Thread(target=self._speech_watchdog, args=(self._speaking_until,), daemon=True).start()
        else:
            self._tts_finished()

    def _speech_watchdog(self, until):
        while time.time() < until:
            time.sleep(0.2)
            if self._speaking_until != until:
                return
        if self._speaking_until == until:
            self._tts_finished()

    def _tts_finished(self):
        self._speaking_until = time.time() + 0.3  # swallow the echo tail
        if self.listener:
            self.listener.paused = False
        if self._status == "speaking":
            self.status("enrolling" if self.enrolling else "idle")

    def stop_speaking(self):
        self.hub.publish("tts_stop")
        self._tts_finished()

    # ================================================================ helpers for skills
    def confirm(self, question: str, on_yes: Callable[[], str | None], detail: str = ""):
        self.pending = Pending(question, on_yes, time.time() + 25)
        self.awake_until = time.time() + 25
        self.hub.publish("confirm", {"question": question, "detail": detail})
        self.say(question)

    def background(self, fn: Callable):
        def run():
            try:
                fn()
            except Exception:
                self.log(traceback.format_exc(limit=4), "error")
        threading.Thread(target=run, daemon=True).start()

    def ui(self, cmd: str):
        self.ui_callback(cmd)

    def set_theme(self, theme: str):
        if theme == "toggle":
            theme = "cyan" if self.theme == "gold" else "gold"
        self.theme = theme
        self.hub.publish("theme", theme, keep=True)

    def go_sleep(self):
        self.awake_until = 0

    # ================================================================ command pipeline
    def _worker(self):
        while not self._stop.is_set():
            try:
                kind, payload = self._work.get(timeout=0.5)
            except queue.Empty:
                if self.pending and time.time() > self.pending.expires:
                    self.pending = None
                    self.hub.publish("confirm", None)
                continue
            try:
                if kind == "audio":
                    self._handle_audio(payload)
                elif kind == "text":
                    self.handle_text(payload, "typed")
                elif kind == "open":
                    self.say(skills.open_target(payload, self))
                elif kind == "intent":
                    self.say(skills.handle(intents.Intent(payload), self))
                elif kind == "call":
                    payload()
            except Exception:
                self.log(traceback.format_exc(limit=6), "error")
                self.say("משהו השתבש. הפרטים ביומן.")
            finally:
                if self._status in ("thinking", "listening", "denied"):
                    self.status("enrolling" if self.enrolling else "idle")

    def _handle_audio(self, audio):
        if self.enrolling is not None:
            return self._enroll_sample(audio)
        if self.speaker and self.speaker.enrolled:
            self.status("verifying")
            ok, score = self.speaker.verify(audio, (self.cfg.get("speaker") or {}).get("threshold"))
            self.hub.publish("verify", {"ok": ok, "score": round(score, 3)})
            if not ok:
                self.status("denied")
                self.log(f"voice rejected (match {score:.2f})", "warn")
                time.sleep(0.6)
                return
        elif self.speaker and not self.speaker.enrolled and not self._warned_unlocked:
            self._warned_unlocked = True  # enrollment was skipped: work unlocked until the user enrolls
            self.log("voice ID not set up – responding to any voice (say 'למד את הקול שלי')", "warn")
        self.status("thinking")
        text = self.stt.transcribe(audio)
        if not text:
            return
        self.handle_text(text, "voice")

    def handle_text(self, text: str, source: str):
        vcfg = self.cfg.get("voice") or {}
        rest, has_wake = textmod.strip_wake(text, vcfg.get("wake_words") or ["jarvis"])
        now = time.time()
        awake = now < self.awake_until
        need_wake = source == "voice" and vcfg.get("require_wake_word", True)
        if need_wake and not has_wake and not awake and not self.pending:
            self.hub.publish("transcript", {"text": text, "ignored": True})
            return
        self.hub.publish("transcript", {"text": text, "ignored": False})
        self.log(f"YOU: {text}")
        self.awake_until = now + float(vcfg.get("follow_up_seconds", 10))
        if has_wake and not rest.strip():
            self.say(f"כן, {self.cfg.get('user_name', '')}?")
            return

        if self.pending:
            ans = intents.answer_yes_no(rest)
            pending, self.pending = self.pending, None
            self.hub.publish("confirm", None)
            if ans is True:
                self.say(pending.on_yes())
                return
            if ans is False:
                self.say("בוטל.")
                return

        self.status("thinking")
        custom = skills.match_custom(rest, self.commands)
        if custom:
            self.log(f"custom command: {custom.get('say')}")
            self.say(skills.run_custom(custom, self))
            return
        pcmd = self._match_plugin(rest)
        if pcmd:
            self.log(f"plugin {pcmd.source}.{pcmd.func.__name__}")
            self.say(pcmd.func(skills.PluginCtx(self), rest))
            return
        intent = intents.parse(rest)
        self.log(f"intent: {intent.name} {intent.args or ''}")
        self.say(skills.handle(intent, self))

    def _match_plugin(self, text):
        t = textmod.key(text)
        for pc in self.plugin_cmds:
            for p in pc.phrases:
                k = textmod.key(p)
                if k and (k == t or k in t or textmod.ratio(k, t) >= 88):
                    return pc
        return None

    # ================================================================ enrollment
    def start_enroll(self):
        if not self.speaker:
            self.say("זיהוי קול לא זמין. צריך להתקין את speechbrain ו-torch.")
            return
        self.enrolling = {"i": 0, "samples": []}
        self.status("enrolling")
        self._publish_enroll()
        self.say("בוא נלמד את הקול שלך. תקרא בקול את המשפט שמופיע על המסך.")

    def _publish_enroll(self, done=False):
        e = self.enrolling
        self.hub.publish("enroll", None if e is None and not done else {
            "step": e["i"] + 1 if e else len(ENROLL_PHRASES), "total": len(ENROLL_PHRASES),
            "phrase": ENROLL_PHRASES[e["i"]] if e else "", "done": done})

    def _enroll_sample(self, audio):
        if len(audio) < 16000 * 1.2:
            self.log("too short – read the whole sentence", "warn")
            return
        self.enrolling["samples"].append(audio)
        self.enrolling["i"] += 1
        if self.enrolling["i"] < len(ENROLL_PHRASES):
            self._publish_enroll()
            return
        samples = self.enrolling["samples"]
        self.enrolling = None
        thr = self.speaker.enroll(samples)
        self.log(f"voiceprint saved (threshold {thr:.2f})")
        self._publish_enroll(done=True)
        self.publish_voice_info()
        self.status("idle")
        self.say("מעולה. מעכשיו אני מגיב רק לקול שלך.")

    def cancel_enroll(self):
        self.enrolling = None
        self.hub.publish("enroll", None)
        self.status("idle")

    # ================================================================ HUD API
    def handle_api(self, path: str, body: dict) -> dict:
        if path == "/api/command":
            text = str(body.get("text", "")).strip()
            if text:
                self._work.put(("text", text))
        elif path == "/api/open":
            self._work.put(("open", str(body.get("target", ""))))
        elif path == "/api/action":
            self._work.put(("intent", str(body.get("name", ""))))
        elif path == "/api/confirm":
            ans = bool(body.get("yes"))
            self._work.put(("text", "כן" if ans else "לא"))
        elif path == "/api/tts_done":
            self._tts_finished()
        elif path == "/api/ui":
            self.ui(str(body.get("cmd", "")))
        elif path == "/api/enroll":
            if body.get("cancel"):
                self.cancel_enroll()
            else:
                self._work.put(("call", self.start_enroll))
        elif path == "/api/theme":
            self.set_theme(str(body.get("theme", "toggle")))
        elif path == "/api/reload":
            self._work.put(("call", self.reload_all))
        return {"ok": True}

    # ================================================================ hot reload
    def on_file_change(self, kind: str, files: list[str]):
        if kind == "hud":
            self.log("HUD changed → refreshing display")
            self.hub.publish("reload_hud")
        elif kind == "config":
            self.reload_config()
        elif kind == "commands":
            self._load_commands(announce=True)
        elif kind == "plugins":
            self._load_plugins(announce=True)
        elif kind == "code":
            self.reload_code(files)

    def reload_config(self):
        try:
            new = C.load_config()
        except Exception as e:
            self.log(f"config.yaml has an error – keeping the previous settings:\n{e}", "error")
            self.hub.publish("toast", {"level": "error", "text": "שגיאה ב-config.yaml"})
            return
        old, self.cfg = self.cfg, new
        if self.tts:
            self.tts.cfg = new.get("tts") or {}
        if new.get("theme") != old.get("theme"):
            self.set_theme(new.get("theme", "gold"))
        self.publish_static()
        self.log("config reloaded ✓")
        self.hub.publish("toast", {"level": "ok", "text": "ההגדרות נטענו"})
        if self.voice_wanted and (new.get("voice") != old.get("voice") or new.get("speaker") != old.get("speaker")):
            self.log("voice settings changed → restarting voice")
            self.restart_voice()
        self.ui("apply_window")

    def _load_commands(self, announce=False):
        try:
            self.commands = C.load_commands()
            if announce:
                self.log(f"commands.yaml reloaded ✓ ({len(self.commands)} commands)")
                self.hub.publish("toast", {"level": "ok", "text": "הפקודות נטענו"})
        except Exception as e:
            self.log(f"commands.yaml has an error – keeping the previous commands:\n{e}", "error")
            self.hub.publish("toast", {"level": "error", "text": "שגיאה ב-commands.yaml"})

    def _load_plugins(self, announce=False):
        cmds, errors = plugin.load_plugins(C.PLUGINS_DIR)
        for e in errors:
            self.log(f"plugin error: {e}", "error")
        if not errors or cmds:
            self.plugin_cmds = cmds
        if announce:
            self.log(f"plugins reloaded ✓ ({len(cmds)} commands)")
            self.hub.publish("toast", {"level": "error" if errors else "ok",
                                       "text": "שגיאה בתוסף" if errors else "התוספים נטענו"})

    def reload_code(self, files: list[str] | None = None):
        for f in files or []:
            if f.endswith(".py"):
                try:
                    with open(f, encoding="utf-8") as fh:
                        compile(fh.read(), f, "exec")
                except SyntaxError as e:
                    self.log(f"syntax error, not reloading: {e.filename}:{e.lineno} {e.msg}", "error")
                    self.hub.publish("toast", {"level": "error", "text": f"שגיאת תחביר בשורה {e.lineno}"})
                    return
                except OSError:
                    pass
        try:
            for mod in RELOADABLE:
                importlib.reload(mod)
            self.app_index = apps.AppIndex.from_existing(self.app_index)
            self.log("code reloaded ✓")
            self.hub.publish("toast", {"level": "ok", "text": "הקוד נטען מחדש"})
        except Exception:
            self.log(traceback.format_exc(limit=4), "error")
            self.hub.publish("toast", {"level": "error", "text": "שגיאה בטעינת הקוד"})

    def reload_all(self):
        self.reload_config()
        self._load_commands(True)
        self._load_plugins(True)
        self.reload_code()
        self.hub.publish("reload_hud")
