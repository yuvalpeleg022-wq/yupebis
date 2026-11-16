# Per-version sound pass: VO (priority) + ducked music + bundled CC0 SFX placed on the version's own transitions.
# usage: mix_ep.py <episode> <music_id> [lead_seconds]   (cues from episodes/<ep>/plan/cues.py)
import json, os, subprocess, sys
import numpy as np, librosa, soundfile as sf
from scipy.signal import butter, sosfiltfilt, find_peaks

EP, MID = sys.argv[1], sys.argv[2]; V = EP; SPLICE = False; LEAD = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, "..", ".claude", "skills", "sound-effects", "sfx")
MUSIC = os.path.join(ROOT, f"assets/music/mixkit_{MID}.mp3")
vo_wav = os.path.join(ROOT, f"episodes/{EP}/cache/vo_clean.wav")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(ROOT, f"episodes/{EP}/source/voice.m4a"), "-af",
  f"adelay={int(LEAD*1000)}:all=1,highpass=f=85,lowpass=f=15000,afftdn=nf=-30,acompressor=threshold=-21dB:ratio=3:attack=6:release=140:makeup=3,loudnorm=I=-16:TP=-3:LRA=7", "-ar", str(SR), "-ac", "1", vo_wav])
vo, _ = librosa.load(vo_wav, sr=SR, mono=True)
DUR = float(open(os.path.join(ROOT, f"episodes/{EP}/plan/duration.txt")).read()); N = int(DUR * SR)
vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]

# ---- music: beat grid + offset that lands key hits on beats ----
y, _ = librosa.load(MUSIC, sr=SR, mono=True)
tempo, bf = librosa.beat.beat_track(y=y, sr=SR); beats = librosa.frames_to_time(bf, sr=SR); period = float(np.median(np.diff(beats)))
low = sosfiltfilt(butter(4, 120, "low", fs=SR, output="sos"), y); hop = 480
env = np.abs(low)[: len(low) // hop * hop].reshape(-1, hop).max(1); te = np.arange(len(env)) * hop / SR
pk, _ = find_peaks(env, height=env.max() * .5, distance=int(period * .6 * SR / hop)); kicks = te[pk]
med = float(np.median([kicks[np.argmin(np.abs(kicks - b))] - b for b in beats])) if kicks.size else 0
grid = beats + med if abs(med) > .03 else beats
import importlib.util as _iu
_sp = _iu.spec_from_file_location("cues", os.path.join(ROOT, f"episodes/{EP}/plan/cues.py")); _m = _iu.module_from_spec(_sp); _sp.loader.exec_module(_m); EPC = _m.CUES
KEY = {t: 2 for k, t in EPC if k == "b"}
tlen = len(y) / SR
if MID == "676": mstart = 13.075
else:
    best = None
    lo, hi = (2.0, min(25.0, max(2.01, tlen - DUR - 1.0)))
    for s in np.arange(lo, hi, .005):
        e = sum(w * np.min(np.abs((grid - s) - t)) for t, w in KEY.items())
        if best is None or e < best[0]: best = (e, s)
    mstart = float(best[1])
ys, _ = librosa.load(MUSIC, sr=SR, mono=False); ys = np.atleast_2d(ys); ys = np.vstack([ys, ys]) if ys.shape[0] == 1 else ys
if SPLICE:
    gi = int(np.argmin(np.abs(grid - (71.0 + mstart)))); src_s, dst_s = float(grid[gi]), float(grid[gi + 8]); xf = int(.06 * SR)
    a1 = ys[:, int(mstart * SR): int(src_s * SR) + xf].copy(); a2 = ys[:, int(dst_s * SR): int(dst_s * SR) + N]
    r = np.linspace(0, 1, xf); a1[:, -xf:] = a1[:, -xf:] * (1 - r) + a2[:, :xf] * r; mus = np.concatenate([a1, a2[:, xf:]], 1)[:, :N].T
else: mus = ys[:, int(mstart * SR): int(mstart * SR) + N].T
mus = np.pad(mus, ((0, max(0, N - len(mus))), (0, 0)))
fo = int((.9 if SPLICE else 2.2) * SR); mus[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
fi = int(.15 * SR); mus[:fi] *= np.linspace(0, 1, fi)[:, None]
mus = mus / (np.sqrt(np.mean(mus ** 2)) + 1e-9) * 10 ** (-20 / 20)
resid = {t: round(float(np.min(np.abs((grid - mstart) - t))) * 1000) for t in KEY}

# ---- ducking ----
win = int(.03 * SR); rms = np.sqrt(np.convolve(vo ** 2, np.ones(win) / win, mode="same")); act = (rms > 10 ** (-38 / 20)).astype(np.float32)
duck = np.empty_like(act); g = 0.0; a_up, a_dn = 1 - np.exp(-1 / (.06 * SR)), 1 - np.exp(-1 / (.45 * SR))
for i in range(N): g += (act[i] - g) * (a_up if act[i] > g else a_dn); duck[i] = g
MUSIC_DB = -11.0; DUCK_DB = -11.0
mg = 10 ** ((MUSIC_DB + DUCK_DB * duck) / 20)

# ---- SFX ----
def sfx(path):
    a, _ = librosa.load(os.path.join(SFX, path), sr=SR, mono=False); a = np.atleast_2d(a); return (np.vstack([a, a]) if a.shape[0] == 1 else a).T
def anchors(a):
    e = np.abs(a).max(1); k = int(.005 * SR); e = np.convolve(e, np.ones(k) / k, mode="same"); return {"onset": int(np.argmax(e > e.max() * .3)), "peak": int(np.argmax(e)), "end": len(a)}
C = []; cue = lambda t, f, gdb, al="onset": C.append((t, f, gdb, al))
LVL = 0
WH = ["whoosh/fs-683101-quick-woosh.ogg", "whoosh/fs393811.ogg", "transition/fs-786514-swoosh-v2.ogg", "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", "transition/fs-816262-broomstick-whoosh-3-quiet-okm1.ogg"]
POP = ["pop/fs-824189-pop-in-sfx.ogg", "pop/fs527522.ogg", "pop/kenney-interface-drop-001.ogg", "pop/fs202230.ogg", "pop/kenney-interface-pluck-001.ogg"]
DING = "ding/kenney-interface-confirmation-001.ogg"; BIG = "impact/fs-347561-micheal-bay-hit.ogg"; SUB = "impact/kenney-sci-lowfrequency-explosion-000.ogg"; DROP = "impact/fs-222517-dramatic-hit.ogg"
w = lambda t, g=-11, i=0: cue(t, WH[i % len(WH)], g, "peak"); p = lambda t, g=-12, i=0: cue(t, POP[i % len(POP)], g)
KIND = {"w": lambda t, i: cue(t, WH[i % len(WH)], -13, "peak"), "p": lambda t, i: cue(t, POP[i % len(POP)], -14), "d": lambda t, i: cue(t, DING, -15),
  "x": lambda t, i: cue(t, "ui-blip/kenney-digital-twotone2.ogg", -13), "b": lambda t, i: (cue(t, BIG, -6), cue(t, SUB, -13)), "s": lambda t, i: cue(t, DROP, -10),
  "r": lambda t, i: cue(t, "riser/fs867126.ogg", -12, "end"), "k": lambda t, i: cue(t, "tick/fs721514.ogg", -17), "c": lambda t, i: cue(t, "click/kenney-interface-toggle-001.ogg", -8)}
for i, (k, t) in enumerate(EPC): KIND[k](t, i)
fx = np.zeros((N, 2), np.float32); cache = {}; used = {}
for t, fpath, gdb, al in C:
    if fpath not in cache: a = sfx(fpath); cache[fpath] = (a, anchors(a))
    a, an = cache[fpath]; st = int(t * SR) - an[al]; a = a * 10 ** (gdb / 20)
    if st < 0: a = a[-st:]; st = 0
    n = min(len(a), N - st); fx[st: st + n] += a[:n]; used[fpath] = used.get(fpath, 0) + 1
fx *= (10 ** (-3 * duck / 20))[:, None]
mix = np.stack([vo, vo], 1) * 10 ** (-1.0 / 20) + mus * mg[:, None] + fx
out = os.path.join(ROOT, f"audio/mix_{EP}.wav"); sf.write(out, mix.astype(np.float32), SR, subtype="FLOAT")
json.dump({"version": V, "music": MID, "music_start": mstart, "tempo": float(np.atleast_1d(tempo)[0]), "key_hit_beat_error_ms": resid, "cues": len(C), "sfx_used": used},
          open(os.path.join(ROOT, f"audio/mix_{EP}.json"), "w"), indent=1)
print(f"{V}: music #{MID} start {mstart:.2f}s tempo {float(np.atleast_1d(tempo)[0]):.0f} | cues {len(C)} | key-hit beat error ms {resid}")
