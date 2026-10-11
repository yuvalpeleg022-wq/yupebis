"""Speech-to-text.

engine "auto" (default): Google first – about a second and very good at Hebrew – and
faster-whisper as an offline fallback when there is no internet.
engine "google" / "whisper": only that one.
"""
from __future__ import annotations

import os
import threading

import numpy as np

from ..config import MODELS_DIR

PROMPT = "ג'רוויס, פתח את גוגל. תנגן ביוטיוב. תתקין את כרום. Jarvis, open Spotify."
LANGS = {"he": "he-IL", "en": "en-US"}


class STT:
    def __init__(self, cfg: dict, log):
        self.cfg = cfg
        self.log = log
        self.engine = cfg.get("stt_engine", "auto")
        self.model = None
        self._sr = None
        self._whisper_lock = threading.Lock()

    def load(self):
        if self.engine in ("auto", "google"):
            import speech_recognition as sr
            self._sr = sr
        if self.engine == "whisper":
            self._load_whisper()
        elif self.engine == "auto":
            # the offline fallback loads quietly in the background; voice is usable right away
            threading.Thread(target=self._load_whisper_safe, name="whisper-load", daemon=True).start()

    def _load_whisper_safe(self):
        try:
            self._load_whisper()
        except Exception as e:
            self.log(f"offline speech model unavailable ({e}); online recognition only", "warn")

    def _load_whisper(self):
        with self._whisper_lock:
            if self.model is not None:
                return
            from faster_whisper import WhisperModel
            name = self.cfg.get("whisper_model", "small")
            device = self.cfg.get("whisper_device", "auto")
            if device == "auto":
                device = "cuda" if _has_cuda() else "cpu"
            compute = "float16" if device == "cuda" else "int8"
            self.log(f"loading whisper '{name}' on {device}…")
            self.model = WhisperModel(name, device=device, compute_type=compute, cpu_threads=os.cpu_count() or 4,
                                      download_root=str(MODELS_DIR / "whisper"))
            self.log("whisper ready")

    def transcribe(self, audio: np.ndarray) -> str:
        if self.engine in ("auto", "google"):
            try:
                return self._google(audio)
            except Exception as e:
                if self.engine == "google" or self.model is None:
                    raise
                self.log(f"online recognition failed ({type(e).__name__}); using offline model", "warn")
        return self._whisper(audio)

    def _google(self, audio: np.ndarray) -> str:
        sr = self._sr
        pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes()
        data = sr.AudioData(pcm, 16000, 2)
        lang = LANGS.get(self.cfg.get("language") or "he", "he-IL")
        try:
            return sr.Recognizer().recognize_google(data, language=lang)
        except sr.UnknownValueError:
            return ""

    def _whisper(self, audio: np.ndarray) -> str:
        lang = self.cfg.get("language") or None
        segs, _ = self.model.transcribe(audio, language=lang, beam_size=1, best_of=1,
                                        initial_prompt=PROMPT, condition_on_previous_text=False,
                                        vad_filter=False, without_timestamps=True)
        text = " ".join(s.text for s in segs if s.no_speech_prob < 0.7).strip()
        return "" if _hallucination(text) else text


def _has_cuda() -> bool:
    try:
        import ctranslate2
        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False


_JUNK = {"תודה רבה", "תודה", "thank you", "thanks for watching", "כתוביות", "you", "תודה שצפיתם"}


def _hallucination(text: str) -> bool:
    t = text.strip(" .!?,").lower()
    return not t or t in _JUNK or t.startswith("כתוביות") or "subtitles" in t
