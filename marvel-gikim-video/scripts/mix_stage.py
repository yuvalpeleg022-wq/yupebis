# Per-version sound pass: VO (priority) + ducked music + bundled CC0 SFX placed on the version's own transitions.
# usage: mix_stage.py <theme> <music_id> - [--splice]   (stage-engine cue list)
import json, os, subprocess, sys
import numpy as np, librosa, soundfile as sf
from scipy.signal import butter, sosfiltfilt, find_peaks

V, MID, EDLP = sys.argv[1], sys.argv[2], sys.argv[3]; SPLICE = "--splice" in sys.argv
SR, DUR, N = 48000, 79.5, int(79.5 * 48000)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, "..", ".claude", "skills", "sound-effects", "sfx")
MUSIC = os.path.join(ROOT, f"assets/music/mixkit_{MID}.mp3")
vo, _ = librosa.load(os.path.join(ROOT, "audio/vo_clean.wav"), sr=SR, mono=True); vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]

# ---- music: beat grid + offset that lands key hits on beats ----
y, _ = librosa.load(MUSIC, sr=SR, mono=True)
tempo, bf = librosa.beat.beat_track(y=y, sr=SR); beats = librosa.frames_to_time(bf, sr=SR); period = float(np.median(np.diff(beats)))
low = sosfiltfilt(butter(4, 120, "low", fs=SR, output="sos"), y); hop = 480
env = np.abs(low)[: len(low) // hop * hop].reshape(-1, hop).max(1); te = np.arange(len(env)) * hop / SR
pk, _ = find_peaks(env, height=env.max() * .5, distance=int(period * .6 * SR / hop)); kicks = te[pk]
med = float(np.median([kicks[np.argmin(np.abs(kicks - b))] - b for b in beats])) if kicks.size else 0
grid = beats + med if abs(med) > .03 else beats
KEY = {1.03: 3, 16.33: 2, 22.47: 2, 28.75: 3, 42.95: 2, 62.31: 3, 65.21: 3, 71.5: 2, 77.57: 2}
tlen = len(y) / SR
if MID == "676": mstart = 13.075
else:
    best = None
    lo, hi = (30.0, 50.0) if MID == "614" else (2.0, max(2.01, tlen - DUR - 1.0))
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
MUSIC_DB = {"brand": -9.0, "blue": -9.0, "gold": -10.0, "crimson": -9.0}.get(V, -9.0); DUCK_DB = -11.0
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
cue(.12, "click/kenney-interface-toggle-001.ogg", -6); cue(.28, "click/kenney-interface-toggle-002.ogg", -8)
cue(1.03, "riser/fs867126.ogg", -9, "end"); w(.95, -10); cue(1.03, BIG, -4); cue(1.03, SUB, -11); p(2.87, -11)
w(4.2, -12, 1); p(7.09, -12, 1)
for k in range(10): cue(7.55 + k * .08, "tick/fs384187.ogg", -17)
cue(8.35, "impact/fs-177242-cinematic-impact.ogg", -6); w(8.9, -13, 2)
for i, t in enumerate([10.95, 12.45, 13.91, 14.77]): w(t + .05, -13, i); cue(t + .35, DING, -14)
cue(16.42, DROP, -7); w(16.71, -12, 3)
for i, t in enumerate([17.87, 18.59, 19.45, 21.01]): w(t + .05, -15, i + 1); cue(t + .3, DING, -14)
cue(22.55, DROP, -7); w(23.29, -12, 2); p(24.81, -12, 2)
for i, t in enumerate([25.9, 26.25, 26.6]): w(t + .1, -15, i); p(t + .2, -15, i)
cue(28.75, "riser/fs-464250-echo-chromatic-riser-wav.ogg", -10, "end"); cue(28.75, BIG, -3); cue(28.75, SUB, -9)
w(29.6, -10, 0); cue(29.7, "transition/kenney-interface-scroll-001.ogg", -14); cue(30.93, "click/fs788933.ogg", -9); cue(30.93, "impact/kenney-impact-impactsoft-heavy-000.ogg", -13)
for i in range(5): p(32.97 + i * .11, -15, i)
w(34.5, -14, 3)
for i, t in enumerate([35.25, 35.75, 36.21]): p(t, -11, i)
cue(36.5, "ding/fs-634690-lil-pip.ogg", -10)
for i, t in enumerate([37.17, 37.39, 37.61, 37.83]): w(t + .1, -13, i)
cue(39.42, "ding/fs-349504-triangle-open-04.ogg", -11); w(40.5, -12, 2)
for k in range(8): cue(41.75 + k * .07, "tick/fs721514.ogg", -16)
cue(42.3, DING, -12)
cue(43.05, DROP, -7); w(44.03, -12, 3); p(45.3, -11); w(46.93, -10, 0); cue(46.93, "impact/kenney-sci-lowfrequency-explosion-001.ogg", -10)
for k in range(10): cue(46.95 + k * .1, "tick/fs384187.ogg", -18)
cue(47.95, "ding/kenney-interface-confirmation-002.ogg", -12)
p(49.31, -13); 
for i in range(5): cue(49.5 + i * .09, "tick/fs528561.ogg", -14)
for i, t in enumerate([50.73, 51.19, 51.87, 52.91, 53.69]): cue(t, "click/kenney-interface-toggle-001.ogg", -12); cue(t + .04, "impact/kenney-impact-impactpunch-heavy-00%d.ogg" % (i % 2), -15); w(t + .02, -16, i)
w(55.93, -12, 1); cue(56.1, DING, -12); p(56.6, -12); p(57.53, -12, 1); cue(57.7, "riser/kenney-digital-phaserup1.ogg", -17); p(59.13, -12, 2)
cue(60.0, "impact/kenney-impact-impactsoft-heavy-001.ogg", -10); w(61.07, -14, 4)
cue(62.31, "riser/fs-396160-scary-hits-risers-002.ogg", -10, "end"); cue(62.31, BIG, -2); cue(62.31, SUB, -7); w(63.37, -12, 2)
cue(65.21, "riser/fs-685256-riser-sound-effect-short-wav.ogg", -9, "end"); cue(65.21, "impact/fs-177242-cinematic-impact.ogg", -3); cue(65.21, SUB, -8)
for k in range(6): p(65.3 + k * .09, -17, k)
p(67.13, -11); 
for i, t in enumerate([67.13, 69.55, 70.47]): w(t + .05, -13, i); cue(t + .35, DING, -13)
w(71.45, -9, 0); cue(71.6, DROP, -5)
for i, t in enumerate([72.17, 73.31, 74.91]): w(t + .05, -13, i)
cue(77.57, BIG, -7); cue(77.57, "ding/fs-349504-triangle-open-04.ogg", -8)
for k in range(3): cue(78.1 + k * .1, "tick/fs721514.ogg", -16)
fx = np.zeros((N, 2), np.float32); cache = {}; used = {}
for t, fpath, gdb, al in C:
    if fpath not in cache: a = sfx(fpath); cache[fpath] = (a, anchors(a))
    a, an = cache[fpath]; st = int(t * SR) - an[al]; a = a * 10 ** (gdb / 20)
    if st < 0: a = a[-st:]; st = 0
    n = min(len(a), N - st); fx[st: st + n] += a[:n]; used[fpath] = used.get(fpath, 0) + 1
fx *= (10 ** (-3 * duck / 20))[:, None]
mix = np.stack([vo, vo], 1) * 10 ** (-1.0 / 20) + mus * mg[:, None] + fx
out = os.path.join(ROOT, f"audio/mix_{V}.wav"); sf.write(out, mix.astype(np.float32), SR, subtype="FLOAT")
json.dump({"version": V, "music": MID, "music_start": mstart, "tempo": float(np.atleast_1d(tempo)[0]), "key_hit_beat_error_ms": resid, "cues": len(C), "sfx_used": used},
          open(os.path.join(ROOT, f"audio/mix_{V}.json"), "w"), indent=1)
print(f"{V}: music #{MID} start {mstart:.2f}s tempo {float(np.atleast_1d(tempo)[0]):.0f} | cues {len(C)} | key-hit beat error ms {resid}")
