"""Text-to-speech. Edge neural voices render to mp3 which the HUD plays (and visualizes)."""
from __future__ import annotations

import asyncio
import hashlib
import threading

from ..config import TTS_DIR


class TTS:
    def __init__(self, cfg: dict, log):
        self.cfg = cfg
        self.log = log
        self._sys = None
        self._sys_lock = threading.Lock()
        self._edge_missing = False
        self._sys_missing = False

    def render(self, text: str) -> str | None:
        """Return an mp3 filename in TTS_DIR, or None if the HUD shouldn't play audio."""
        engine = self.cfg.get("engine", "edge")
        if not self.cfg.get("enabled", True) or engine == "none":
            return None
        if engine == "edge" and not self._edge_missing:
            try:
                return self._edge(text)
            except ImportError:
                self._edge_missing = True
                self.log("edge-tts not installed; using the system voice", "warn")
            except Exception as e:  # usually no internet
                self.log(f"edge-tts failed ({e}); using system voice", "warn")
        self._system(text)
        return None

    def _edge(self, text: str) -> str:
        import edge_tts
        voice = self.cfg.get("voice", "he-IL-AvriNeural")
        rate = self.cfg.get("rate", "+0%")
        name = hashlib.sha1(f"{voice}|{rate}|{text}".encode()).hexdigest()[:20] + ".mp3"
        path = TTS_DIR / name
        if not path.exists():
            async def go():
                await edge_tts.Communicate(text, voice, rate=rate).save(str(path))
            asyncio.run(go())
        self._prune()
        return name

    def _prune(self, keep: int = 300):
        files = sorted([*TTS_DIR.glob("*.mp3"), *TTS_DIR.glob("*.wav")], key=lambda p: p.stat().st_mtime)
        for p in files[:-keep]:
            p.unlink(missing_ok=True)

    def _system(self, text: str):
        if self._sys_missing:
            return
        with self._sys_lock:
            try:
                import pyttsx3
                if self._sys is None:
                    self._sys = pyttsx3.init()
                self._sys.say(text)
                self._sys.runAndWait()
            except Exception as e:
                self._sys_missing = True
                self.log(f"system TTS unavailable ({e}); replies are text-only", "warn")
