#!/usr/bin/env python3
"""Hebrew transcription with word timestamps + low-confidence flags.

    python3 transcribe.py <video> <model: large-v3 | path/to/ct2-model> <out.json> [--prompt "..."]

Writes segments/words JSON and prints a review view where words with
probability < 0.6 are marked with '?'. Never trust the draft blindly:
review flagged words and put the corrected text into project.json captions.
"""
import argparse, json, subprocess, tempfile, wave, os
import numpy as np
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("model"); ap.add_argument("out")
ap.add_argument("--prompt", default="מארוול, הנוקמים, אוונג'רס, טריילר, שמועות, מדליף")
ap.add_argument("--beam", type=int, default=8)
a = ap.parse_args()

with tempfile.TemporaryDirectory() as td:
    wav = os.path.join(td, "a.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-ac", "1", "-ar", "16000", wav], check=True)
    w = wave.open(wav); audio = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768

m = WhisperModel(a.model, device="cpu", compute_type="int8")
segs, _ = m.transcribe(audio, language="he", word_timestamps=True, beam_size=a.beam, initial_prompt=a.prompt)
out = []
for s in segs:
    words = [{"w": x.word.strip(), "s": round(x.start, 2), "e": round(x.end, 2), "p": round(x.probability, 2)} for x in s.words]
    out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(), "words": words})
    print(f"[{s.start:6.2f}] " + " ".join(f"{x['w']}{'' if x['p'] >= 0.6 else '(?)'}" for x in words))
json.dump(out, open(a.out, "w"), ensure_ascii=False, indent=1)
