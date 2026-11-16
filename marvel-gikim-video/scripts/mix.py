# Sound pass: voiceover (priority) + ducked music bed + bundled CC0 SFX on visual cues.
# Method follows the sound-effects skill (real recorded sounds, beat-aligned music start, measured loudness),
# extended with a voiceover track and VO-driven music ducking.
import json, os, subprocess, sys
import numpy as np, librosa, soundfile as sf
from scipy.signal import butter, sosfiltfilt, find_peaks

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, "..", ".claude", "skills", "sound-effects", "sfx")
OFF, DUR = 2.6, 79.5
MUSIC = os.path.join(ROOT, "assets/music/mixkit_676.mp3")
run = lambda c: subprocess.run(c, capture_output=True, text=True)

# ---- 1. voiceover: trim lead silence, clean, level ----
vo_wav = os.path.join(ROOT, "audio/vo_clean.wav")
run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(ROOT, "source/voice.m4a"), "-af",
     f"atrim=start={OFF},asetpts=PTS-STARTPTS,highpass=f=85,lowpass=f=15000,afftdn=nf=-30,"
     "acompressor=threshold=-21dB:ratio=3:attack=6:release=140:makeup=3,loudnorm=I=-16:TP=-3:LRA=7",
     "-ar", str(SR), "-ac", "1", vo_wav])
vo, _ = librosa.load(vo_wav, sr=SR, mono=True)
N = int(DUR * SR)
vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]

# ---- 2. music: pick the start offset that lands hard cuts on the beat ----
y, _ = librosa.load(MUSIC, sr=SR, mono=True)
tempo, bf = librosa.beat.beat_track(y=y, sr=SR); beats = librosa.frames_to_time(bf, sr=SR); period = float(np.median(np.diff(beats)))
low = sosfiltfilt(butter(4, 120, "low", fs=SR, output="sos"), y); hop = 480
env = np.abs(low)[: len(low) // hop * hop].reshape(-1, hop).max(1); te = np.arange(len(env)) * hop / SR
pk, _ = find_peaks(env, height=env.max() * .5, distance=int(period * .6 * SR / hop)); kicks = te[pk]
med = float(np.median([kicks[np.argmin(np.abs(kicks - b))] - b for b in beats])) if kicks.size else 0
grid = beats + med if abs(med) > .03 else beats
hard = {1.03: 3, 3.83: 1, 7.05: 1, 10.75: 1, 16.33: 2, 22.47: 2, 25.67: 1, 28.75: 3, 36.95: 1, 42.95: 2, 45.05: 1, 49.25: 1, 55.1: 1, 62.31: 3, 65.21: 3, 71.5: 2}
tlen = len(y) / SR; best = None
for s in np.arange(12, tlen - DUR - .5, .005):
    e = sum(w * np.min(np.abs((grid - s) - t)) for t, w in hard.items())
    if best is None or e < best[0]: best = (e, s)
mstart = 13.075  # fixed: best fit for the voice-locked cuts (hook below is then beat-locked to this grid)
resid = {t: round(float(np.min(np.abs((grid - mstart) - t))) * 1000) for t in hard}
ys, _ = librosa.load(MUSIC, sr=SR, mono=False); ys = np.atleast_2d(ys); ys = np.vstack([ys, ys]) if ys.shape[0] == 1 else ys
# beat-aligned music edit: jump forward 8 beats around video 71 s (under the VO) so the track's final hit lands after the last line
gi = int(np.argmin(np.abs(grid - (71.0 + mstart)))); src_s, dst_s = float(grid[gi]), float(grid[gi + 8]); vs = src_s - mstart
xf = int(.06 * SR); a1 = ys[:, int(mstart * SR): int(src_s * SR) + xf]; a2 = ys[:, int(dst_s * SR): int(dst_s * SR) + N]
ramp = np.linspace(0, 1, xf); a1[:, -xf:] = a1[:, -xf:] * (1 - ramp) + a2[:, :xf] * ramp
mus = np.concatenate([a1, a2[:, xf:]], 1)[:, :N].T
FINAL_HIT = 93.96 - (dst_s - src_s) - mstart
print(f"music edit at video {vs:.3f}s: track {src_s:.2f} -> {dst_s:.2f}; final hit at video {FINAL_HIT:.3f}s")
mus = np.pad(mus, ((0, max(0, N - len(mus))), (0, 0)))
f = int(.9 * SR); mus[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
fi = int(.15 * SR); mus[:fi] *= np.linspace(0, 1, fi)[:, None]

# ---- 3. ducking from the VO envelope ----
win = int(.03 * SR); rms = np.sqrt(np.convolve(vo ** 2, np.ones(win) / win, mode="same"))
act = (rms > 10 ** (-38 / 20)).astype(np.float32)
duck = np.empty_like(act); g = 0.0; a_up, a_dn = 1 - np.exp(-1 / (.06 * SR)), 1 - np.exp(-1 / (.45 * SR))
for i in range(N):  # attack 60 ms, release 450 ms
    g += (act[i] - g) * (a_up if act[i] > g else a_dn); duck[i] = g
MUSIC_DB, DUCK_DB = -9.0, -11.0
mg = 10 ** ((MUSIC_DB + DUCK_DB * duck) / 20)
mus_rms = np.sqrt(np.mean(mus ** 2)); mus = mus / (mus_rms + 1e-9) * 10 ** (-20 / 20)   # music normalised to -20 dBFS RMS before gain

# ---- 4. SFX cues (bundled CC0 library) ----
def sfx(path):
    a, _ = librosa.load(os.path.join(SFX, path), sr=SR, mono=False); a = np.atleast_2d(a)
    return (np.vstack([a, a]) if a.shape[0] == 1 else a).T
def anchors(a):
    e = np.abs(a).max(1); k = int(.005 * SR); e = np.convolve(e, np.ones(k) / k, mode="same")
    return {"onset": int(np.argmax(e > e.max() * .3)), "peak": int(np.argmax(e)), "end": len(a)}
C = []  # (t, file, gain_db, align)  align: onset | peak | end
def cue(t, f, g, al="onset"): C.append((t, f, g, al))
for i in range(1, 8): cue(i * .104, "tick/fs721514.ogg", -15)
cue(1.03, "riser/fs867126.ogg", -8, "end"); cue(1.03, "impact/fs-347561-micheal-bay-hit.ogg", -2); cue(1.03, "impact/kenney-sci-lowfrequency-explosion-000.ogg", -9)
cue(2.87, "impact/kenney-impact-impactpunch-heavy-000.ogg", -11)
cue(3.83, "whoosh/fs-683101-quick-woosh.ogg", -6, "peak")
cue(4.3, "pop/fs-824189-pop-in-sfx.ogg", -13)
cue(6.18, "pop/kenney-interface-drop-002.ogg", -12); cue(6.35, "impact/fs-222517-dramatic-hit.ogg", -7)
cue(7.05, "transition/fs-786514-swoosh-v2.ogg", -8, "peak")
for k in range(10): cue(7.55 + k * .08, "tick/fs384187.ogg", -17)
cue(8.35, "impact/fs-177242-cinematic-impact.ogg", -4)
cue(8.85, "pop/fs-447910-plop.ogg", -12)
cue(10.75, "whoosh/fs393811.ogg", -6, "peak")
for i, t in enumerate([10.95, 12.45, 13.91, 14.77]): cue(t + .12, ["transition/fs-702773-swipe-wav.ogg", "transition/fs-816262-broomstick-whoosh-3-quiet-okm1.ogg"][i % 2], -12, "peak")
cue(16.3, "transition/fs-856168-cyberpunk-glitch-hologram-tran.ogg", -9)
cue(16.71, "impact/fs-222517-dramatic-hit.ogg", -5); cue(16.71, "impact/kenney-sci-lowfrequency-explosion-001.ogg", -11)
for t in [17.87, 18.59, 19.45, 21.01]: cue(t + .08, "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", -16, "peak"); cue(t + .3, "ding/kenney-interface-confirmation-001.ogg", -14)
cue(22.45, "glitch/kenney-interface-glitch-002.ogg", -10); cue(22.47, "glitch/fs-144546-touchs-wav.ogg", -14)
cue(23.29, "impact/fs-347561-micheal-bay-hit.ogg", -6); cue(24.81, "whoosh/fs810485.ogg", -12)
cue(25.67, "whoosh/fs-264777-swoosh.ogg", -8, "peak")
cue(28.75, "riser/fs-464250-echo-chromatic-riser-wav.ogg", -9, "end"); cue(28.75, "impact/fs-347561-micheal-bay-hit.ogg", -2); cue(28.75, "impact/kenney-sci-lowfrequency-explosion-000.ogg", -8)
cue(29.7, "whoosh/fs-169867-swoosh.ogg", -10, "peak"); cue(29.75, "transition/fs-850347-swipe-various.ogg", -15)
cue(30.93, "impact/kenney-impact-impactsoft-heavy-000.ogg", -11); cue(30.93, "click/fs788933.ogg", -9)
pops = ["pop/fs527522.ogg", "pop/fs323738.ogg", "pop/fs202230.ogg", "pop/kenney-interface-pluck-001.ogg", "pop/kenney-interface-pluck-002.ogg"]
for i in range(5): cue(32.97 + i * .11, pops[i], -14)
cue(34.5, "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", -14, "peak")
for t in [35.25, 35.75, 36.21]: cue(t, "pop/fs-467951-ui-button-click.ogg", -10)
cue(36.5, "ding/fs-634690-lil-pip.ogg", -9)
cue(36.95, "whoosh/fs-683101-quick-woosh.ogg", -6, "peak"); cue(37.25, "transition/fs-850347-swipe-various.ogg", -12)
cue(39.42, "ding/fs-349504-triangle-open-04.ogg", -10); cue(39.42, "impact/kenney-impact-impactsoft-heavy-001.ogg", -12)
cue(41.73, "riser/kenney-digital-powerup2.ogg", -13); cue(42.17, "impact/kenney-impact-impactpunch-heavy-001.ogg", -10)
cue(42.9, "transition/fs-856168-cyberpunk-glitch-hologram-tran.ogg", -9)
cue(44.03, "impact/fs-222517-dramatic-hit.ogg", -5); cue(44.03, "impact/kenney-sci-lowfrequency-explosion-001.ogg", -11)
cue(45.05, "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", -8, "peak")
cue(46.27, "pop/fs-824189-pop-in-sfx.ogg", -10)
cue(46.93, "impact/kenney-sci-lowfrequency-explosion-001.ogg", -8); cue(46.93, "whoosh/fs810485.ogg", -11)
for k in range(10): cue(46.95 + k * .1, "tick/fs384187.ogg", -18)
cue(47.95, "ding/kenney-interface-confirmation-002.ogg", -12)
cue(49.25, "whoosh/fs393811.ogg", -8, "peak")
for i, t in enumerate([50.73, 51.19, 51.87, 52.91, 53.69]): cue(t + .02, "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", -14, "peak"); cue(t + .08, ["impact/kenney-impact-impactpunch-heavy-000.ogg", "impact/kenney-impact-impactpunch-heavy-001.ogg"][i % 2], -12)
cue(55.1, "transition/fs-786514-swoosh-v2.ogg", -10, "peak")
cue(55.93, "ding/kenney-interface-glass-001.ogg", -10); cue(57.6, "riser/kenney-digital-phaserup1.ogg", -15); cue(59.2, "ding/kenney-interface-confirmation-003.ogg", -12)
cue(60.0, "impact/kenney-impact-impactsoft-heavy-001.ogg", -10); cue(60.59, "impact/fs524817.ogg", -10)
cue(62.31, "riser/fs-396160-scary-hits-risers-002.ogg", -9, "end"); cue(62.31, "impact/fs-347561-micheal-bay-hit.ogg", -1); cue(62.31, "impact/kenney-sci-lowfrequency-explosion-000.ogg", -6)
cue(63.37, "impact/kenney-impact-impactpunch-heavy-000.ogg", -10); cue(64.6, "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", -14, "peak")
cue(65.21, "riser/fs-685256-riser-sound-effect-short-wav.ogg", -8, "end"); cue(65.21, "impact/fs-177242-cinematic-impact.ogg", -1); cue(65.21, "impact/kenney-sci-lowfrequency-explosion-001.ogg", -6)
cue(66.15, "whoosh/fs-169867-swoosh.ogg", -12, "peak")
for t in [67.13, 69.55, 70.47]: cue(t + .05, "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", -13, "peak"); cue(t + .15, "pop/kenney-interface-drop-001.ogg", -12)
cue(71.5, "riser/kenney-digital-powerup3.ogg", -12, "end"); cue(71.5, "whoosh/fs-683101-quick-woosh.ogg", -6, "peak"); cue(71.6, "impact/fs-222517-dramatic-hit.ogg", -3)
cue(72.2, "impact/kenney-impact-impactpunch-heavy-000.ogg", -9); cue(73.35, "impact/kenney-impact-impactpunch-heavy-001.ogg", -9)
cue(74.91, "whoosh/fs-127197-fast-simple-chop-5-aif.ogg", -12, "peak")
cue(77.55, "ding/fs-349504-triangle-open-04.ogg", -8); cue(77.55, "impact/kenney-impact-impactsoft-heavy-000.ogg", -10)

fx = np.zeros((N, 2), np.float32); cache = {}; used = {}
for t, fpath, g, al in C:
    if fpath not in cache: a = sfx(fpath); cache[fpath] = (a, anchors(a))
    a, an = cache[fpath]; st = int(t * SR) - an[al]
    a = a * 10 ** (g / 20)
    if st < 0: a = a[-st:]; st = 0
    n = min(len(a), N - st); fx[st: st + n] += a[:n]; used[fpath] = used.get(fpath, 0) + 1
# SFX sit under the VO a little too
fx *= (10 ** (-3 * duck / 20))[:, None]

mix = np.stack([vo, vo], 1) * 10 ** (-1.0 / 20) + mus * mg[:, None] + fx
sf.write(os.path.join(ROOT, "audio/mix_raw.wav"), mix.astype(np.float32), SR, subtype="FLOAT")
json.dump({"music_start": mstart, "tempo": float(np.atleast_1d(tempo)[0]), "grid_shift_ms": round(med * 1000), "cut_to_beat_ms": resid,
           "cues": len(C), "music_edit_video_s": vs, "final_hit_video_s": FINAL_HIT, "sfx_used": used}, open(os.path.join(ROOT, "audio/mix_report.json"), "w"), indent=1)
print(f"music start {mstart:.3f}s | tempo {float(np.atleast_1d(tempo)[0]):.1f} | grid shift {med*1000:+.0f} ms | cues {len(C)} | peak {np.abs(mix).max():.2f}")
print("cut-to-beat error ms:", resid)
