# Per-version sound pass: VO (priority) + ducked music + bundled CC0 SFX placed on the version's own transitions.
# usage: mix_v.py <version> <music_id> <edl.json> [--splice]
import json, os, subprocess, sys
import numpy as np, librosa, soundfile as sf
from scipy.signal import butter, sosfiltfilt, find_peaks

V, MID, EDLP = sys.argv[1], sys.argv[2], sys.argv[3]; SPLICE = "--splice" in sys.argv
SR, DUR, N = 48000, 79.5, int(79.5 * 48000)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, "..", ".claude", "skills", "sound-effects", "sfx")
MUSIC = os.path.join(ROOT, f"assets/music/mixkit_{MID}.mp3")
edl = json.load(open(EDLP))
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
    for s in np.arange(2.0, max(2.01, tlen - DUR - 1.0), .005):
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
MUSIC_DB = {"cinema": -9.0, "hype": -8.0, "doc": -10.0, "green": -9.0}[V]; DUCK_DB = -11.0
mg = 10 ** ((MUSIC_DB + DUCK_DB * duck) / 20)

# ---- SFX ----
def sfx(path):
    a, _ = librosa.load(os.path.join(SFX, path), sr=SR, mono=False); a = np.atleast_2d(a); return (np.vstack([a, a]) if a.shape[0] == 1 else a).T
def anchors(a):
    e = np.abs(a).max(1); k = int(.005 * SR); e = np.convolve(e, np.ones(k) / k, mode="same"); return {"onset": int(np.argmax(e > e.max() * .3)), "peak": int(np.argmax(e)), "end": len(a)}
C = []; cue = lambda t, f, gdb, al="onset": C.append((t, f, gdb, al))
LVL = {"cinema": 0, "hype": 2, "doc": -6, "green": 0}[V]
WH = ["whoosh/fs-683101-quick-woosh.ogg", "whoosh/fs393811.ogg", "whoosh/fs-264777-swoosh.ogg", "whoosh/fs-169867-swoosh.ogg", "transition/fs-786514-swoosh-v2.ogg", "whoosh/fs-127197-fast-simple-chop-5-aif.ogg"]
GL = ["glitch/kenney-interface-glitch-002.ogg", "glitch/fs-144546-touchs-wav.ogg", "glitch/kenney-sci-computernoise-001.ogg", "transition/fs-856168-cyberpunk-glitch-hologram-tran.ogg"]
for k, tr in enumerate(edl["trans"]):
    t, ty = tr["t"], tr["type"]
    if t < 1.0: cue(t, "tick/fs721514.ogg", -15 + LVL); continue
    if t in (1.03, 28.75, 62.31, 65.21): continue  # handled by the big hits below
    if ty in ("whip", "whipV", "push", "zoom", "spin", "zoomSoft"): cue(t, WH[k % len(WH)], (-9 if ty != "zoomSoft" else -13) + LVL, "peak")
    elif ty == "glitch": cue(t - .02, GL[k % len(GL)], -10 + LVL); cue(t, "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", -14 + LVL, "peak")
    elif ty in ("flash", "flashcut"): cue(t, "impact/kenney-impact-impactpunch-heavy-00%d.ogg" % (k % 2), -11 + LVL)
    elif ty == "burn": cue(t, "whoosh/fs830856.ogg", -10 + LVL, "peak"); cue(t, "impact/kenney-impact-impactsoft-heavy-000.ogg", -12 + LVL)
    elif ty in ("lightleak", "leakG"): cue(t, "transition/fs-683096-woosh.ogg", -15 + LVL, "peak")
    elif ty in ("iris", "wipe"): cue(t, "transition/fs-702773-swipe-wav.ogg", -14 + LVL, "peak")
    elif ty == "ink": cue(t, "whoosh/fs810485.ogg", -12 + LVL, "peak")
    elif ty == "dissolve" and V == "cinema" and k % 3 == 0: cue(t, "whoosh/fs830856.ogg", -17, "peak")
    elif ty == "dip" and t > 59: cue(t + .05, "impact/kenney-impact-impactsoft-heavy-001.ogg", -10 + LVL)
# shared big moments (beat-locked hits on the titles)
BIG = "impact/fs-347561-micheal-bay-hit.ogg"; SUB = "impact/kenney-sci-lowfrequency-explosion-000.ogg"
cue(1.03, "riser/fs867126.ogg", -8 + LVL, "end"); cue(1.03, BIG, -3 + LVL); cue(1.03, SUB, -10 + LVL)
cue(2.87, "impact/kenney-impact-impactpunch-heavy-000.ogg", -12 + LVL); cue(6.35, "impact/fs-222517-dramatic-hit.ogg", -8 + LVL)
for k in range(10): cue(7.55 + k * .08, "tick/fs384187.ogg", -17 + LVL)
cue(8.35, "impact/fs-177242-cinematic-impact.ogg", -5 + LVL)
cue(16.71, "impact/fs-222517-dramatic-hit.ogg", -6 + LVL); cue(23.29, BIG, -7 + LVL); cue(44.03, "impact/fs-222517-dramatic-hit.ogg", -6 + LVL)
cue(28.75, "riser/fs-464250-echo-chromatic-riser-wav.ogg", -9 + LVL, "end"); cue(28.75, BIG, -3 + LVL); cue(28.75, SUB, -9 + LVL)
for k in range(10): cue(46.95 + k * .1, "tick/fs384187.ogg", -18 + LVL)
cue(47.95, "ding/kenney-interface-confirmation-002.ogg", -13 + LVL)
for t in [50.73, 51.19, 51.87, 52.91, 53.69]: cue(t + .03, "impact/kenney-impact-impactpunch-heavy-001.ogg", -13 + LVL)
cue(60.59, "impact/fs524817.ogg", -10 + LVL)
cue(62.31, "riser/fs-396160-scary-hits-risers-002.ogg", -9 + LVL, "end"); cue(62.31, BIG, -2 + LVL); cue(62.31, SUB, -7 + LVL)
cue(63.37, "impact/kenney-impact-impactpunch-heavy-000.ogg", -11 + LVL)
cue(65.21, "riser/fs-685256-riser-sound-effect-short-wav.ogg", -8 + LVL, "end"); cue(65.21, "impact/fs-177242-cinematic-impact.ogg", -2 + LVL); cue(65.21, SUB, -7 + LVL)
for t in [67.13, 69.55, 70.47]: cue(t + .1, "pop/kenney-interface-drop-001.ogg", -13 + LVL)
cue(71.6, "impact/fs-222517-dramatic-hit.ogg", -4 + LVL); cue(72.2, "impact/kenney-impact-impactpunch-heavy-000.ogg", -10 + LVL); cue(73.35, "impact/kenney-impact-impactpunch-heavy-001.ogg", -10 + LVL)
cue(77.57, "ding/fs-349504-triangle-open-04.ogg", -8 + LVL); cue(77.57, "impact/kenney-impact-impactsoft-heavy-000.ogg", -9 + LVL)
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
