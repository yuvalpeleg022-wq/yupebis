"""Plays JARVIS's voice directly through Windows (no browser codecs involved).

Edge voices arrive as MP3. With `miniaudio` installed the MP3 is decoded to WAV, played with
winsound and its loudness envelope drives the reactor; without it, Windows MCI plays the MP3.
"""
from __future__ import annotations

import array
import math
import queue
import sys
import threading
import time
import wave
from pathlib import Path
from typing import Callable

IS_WIN = sys.platform == "win32"
FPS = 30


class Player:
    """Speaks queued clips one after another; on_idle() fires when nothing is left to say."""

    def __init__(self, log, on_level: Callable[[float], None], on_idle: Callable[[], None]):
        self.log = log
        self.on_level = on_level
        self.on_idle = on_idle
        self._q: queue.Queue = queue.Queue()
        self._stop = threading.Event()
        threading.Thread(target=self._loop, name="voice", daemon=True).start()

    @staticmethod
    def available() -> bool:
        return IS_WIN

    def play(self, mp3: Path):
        self._q.put(mp3)

    def stop(self):
        while not self._q.empty():
            try:
                self._q.get_nowait()
            except queue.Empty:
                break
        self._stop.set()
        if IS_WIN:
            try:
                import winsound
                winsound.PlaySound(None, winsound.SND_PURGE)
            except Exception:
                pass

    def _loop(self):
        while True:
            mp3 = self._q.get()
            self._stop.clear()
            try:
                wav, env = _to_wav(mp3)
                if wav:
                    self._play_wav(wav, env, self.on_level, self._stop)
                else:
                    self._play_mci(mp3, self.on_level, self._stop)
            except Exception as e:
                self.log(f"voice playback failed: {e}", "warn")
            self.on_level(0.0)
            if self._q.empty():
                self.on_idle()

    def _play_wav(self, wav: Path, env: list[float], on_level, stop):
        import winsound
        winsound.PlaySound(str(wav), winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_NODEFAULT)
        start = time.perf_counter()
        env = env + [0.0] * 6  # let the tail of the clip finish
        for i, v in enumerate(env):
            if stop.is_set():
                break
            on_level(v)
            delay = start + (i + 1) / FPS - time.perf_counter()
            if delay > 0:
                time.sleep(delay)

    def _play_mci(self, mp3: Path, on_level, stop):
        import ctypes
        mci = ctypes.windll.winmm.mciSendStringW
        buf = ctypes.create_unicode_buffer(64)
        alias = f"jv{int(time.time() * 1000) % 100000}"
        mci(f'open "{mp3}" type mpegvideo alias {alias}', None, 0, None)
        try:
            mci(f"play {alias}", None, 0, None)
            t0 = time.perf_counter()
            while not stop.is_set():
                mci(f"status {alias} mode", buf, 64, None)
                if buf.value not in ("playing", "seeking", ""):
                    break
                t = time.perf_counter() - t0
                on_level(.35 + .3 * abs(math.sin(t * 9)) * abs(math.sin(t * 2.3)))
                time.sleep(1 / FPS)
        finally:
            mci(f"close {alias}", None, 0, None)


def _to_wav(mp3: Path) -> tuple[Path | None, list[float]]:
    """Decode to a cached 24 kHz mono WAV and compute a 30 fps loudness envelope."""
    try:
        import miniaudio
    except ImportError:
        return None, []
    wav = mp3.with_suffix(".wav")
    rate = 24000
    if wav.exists():
        with wave.open(str(wav), "rb") as w:
            samples = array.array("h", w.readframes(w.getnframes()))
    else:
        dec = miniaudio.decode_file(str(mp3), output_format=miniaudio.SampleFormat.SIGNED16,
                                    nchannels=1, sample_rate=rate)
        samples = array.array("h", dec.samples)
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(samples.tobytes())
    win = rate // FPS
    env = []
    for i in range(0, len(samples), win):
        chunk = samples[i:i + win]
        if not chunk:
            break
        rms = math.sqrt(sum(x * x for x in chunk[::4]) / max(1, len(chunk[::4]))) / 32768
        env.append(min(1.0, rms * 4.5))
    return wav, env
