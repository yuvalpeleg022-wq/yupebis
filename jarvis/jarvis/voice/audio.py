"""Microphone capture + energy-based speech segmentation (16 kHz mono float32)."""
from __future__ import annotations

import collections
import queue
import threading
import time
from typing import Callable

import numpy as np

RATE = 16000
BLOCK = 480  # 30 ms


class Listener:
    """Streams the mic, emits whole utterances via on_utterance(np.ndarray).

    on_level(float 0..1) is called ~20x/s for the HUD; on_speech_start() when speech begins.
    """

    def __init__(self, cfg: dict, on_utterance: Callable, on_level: Callable, on_speech_start: Callable,
                 log: Callable):
        self.cfg = cfg
        self.on_utterance = on_utterance
        self.on_level = on_level
        self.on_speech_start = on_speech_start
        self.log = log
        self.paused = False
        self._q: queue.Queue = queue.Queue(maxsize=200)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._stream = None

    def start(self):
        import sounddevice as sd
        dev = self.cfg.get("input_device")
        self._stream = sd.InputStream(samplerate=RATE, channels=1, dtype="float32", blocksize=BLOCK,
                                      device=dev, callback=self._cb)
        self._stream.start()
        self._thread = threading.Thread(target=self._run, name="listener", daemon=True)
        self._thread.start()
        name = sd.query_devices(dev if dev is not None else sd.default.device[0])["name"]
        self.log(f"mic: {name}")

    def stop(self):
        self._stop.set()
        if self._stream:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass

    def _cb(self, data, frames, t, status):
        try:
            self._q.put_nowait(data[:, 0].copy())
        except queue.Full:
            pass

    def _run(self):
        sens = float(self.cfg.get("vad_sensitivity", 3.0))
        silence_blocks = int(self.cfg.get("silence_ms", 700) / 30)
        max_blocks = int(float(self.cfg.get("max_utterance_s", 15)) * 1000 / 30)
        pre = collections.deque(maxlen=10)  # 300 ms pre-roll
        noise = 0.003
        speech: list[np.ndarray] = []
        in_speech, quiet, loud_run = False, 0, 0
        last_level = 0.0
        while not self._stop.is_set():
            try:
                block = self._q.get(timeout=0.5)
            except queue.Empty:
                continue
            rms = float(np.sqrt(np.mean(block * block)) + 1e-9)
            now = time.time()
            if now - last_level > 0.05:
                self.on_level(min(1.0, rms / max(noise * 12, 0.02)))
                last_level = now
            if self.paused:
                speech, in_speech, quiet, loud_run = [], False, 0, 0
                pre.clear()
                continue
            thresh = max(noise * sens, 0.006)
            loud = rms > thresh
            if not in_speech:
                noise = 0.95 * noise + 0.05 * rms if not loud else noise
                pre.append(block)
                loud_run = loud_run + 1 if loud else 0
                if loud_run >= 3:  # 90 ms of sound
                    in_speech, quiet = True, 0
                    speech = list(pre)
                    self.on_speech_start()
            else:
                speech.append(block)
                quiet = 0 if loud else quiet + 1
                if quiet >= silence_blocks or len(speech) >= max_blocks:
                    audio = np.concatenate(speech)
                    in_speech, loud_run = False, 0
                    speech = []
                    pre.clear()
                    if len(audio) > RATE * 0.45:
                        self.on_utterance(audio)


def record_seconds(seconds: float, device=None) -> np.ndarray:
    import sounddevice as sd
    data = sd.rec(int(seconds * RATE), samplerate=RATE, channels=1, dtype="float32", device=device)
    sd.wait()
    return data[:, 0]
