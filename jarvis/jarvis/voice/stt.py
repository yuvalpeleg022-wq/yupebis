"""Speech-to-text: faster-whisper (offline) or Google (online)."""
from __future__ import annotations

import numpy as np

from ..config import MODELS_DIR

PROMPT = "ג'רוויס, פתח את גוגל. תנגן ביוטיוב. תתקין את כרום. Jarvis, open Spotify."


class STT:
    def __init__(self, cfg: dict, log):
        self.cfg = cfg
        self.log = log
        self.engine = cfg.get("stt_engine", "whisper")
        self.model = None

    def load(self):
        if self.engine != "whisper":
            import speech_recognition  # noqa: F401  (fail early if missing)
            return
        from faster_whisper import WhisperModel
        name = self.cfg.get("whisper_model", "small")
        device = self.cfg.get("whisper_device", "auto")
        if device == "auto":
            device = "cuda" if _has_cuda() else "cpu"
        compute = "float16" if device == "cuda" else "int8"
        self.log(f"loading whisper '{name}' on {device} (first run downloads the model)…")
        self.model = WhisperModel(name, device=device, compute_type=compute,
                                  download_root=str(MODELS_DIR / "whisper"))
        self.log("whisper ready")

    def transcribe(self, audio: np.ndarray) -> str:
        lang = self.cfg.get("language") or None
        if self.engine == "whisper":
            segs, _ = self.model.transcribe(audio, language=lang, beam_size=1, best_of=1,
                                            initial_prompt=PROMPT, condition_on_previous_text=False,
                                            vad_filter=False, without_timestamps=True)
            text = " ".join(s.text for s in segs if s.no_speech_prob < 0.7).strip()
            return "" if _hallucination(text) else text
        import speech_recognition as sr
        pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes()
        data = sr.AudioData(pcm, 16000, 2)
        try:
            return sr.Recognizer().recognize_google(data, language={"he": "he-IL", "en": "en-US"}.get(lang, "he-IL"))
        except sr.UnknownValueError:
            return ""


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
