# Encode frames -> H.264, mux the mix, measure loudness ON THE EXPORTED MP4, correct, repeat.
import re, subprocess, sys, json
frames, out = sys.argv[1], sys.argv[2]
TARGET_I, TARGET_TP = -14.0, -1.5
run = lambda c: subprocess.run(c, capture_output=True, text=True)
silent = out.replace(".mp4", "_silent.mp4")
r = run(["ffmpeg", "-y", "-v", "error", "-framerate", "30", "-i", f"{frames}/%05d.jpg", "-c:v", "libx264", "-preset", "slow", "-crf", "17",
         "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", silent])
assert r.returncode == 0, r.stderr
def measure(p, mono=False):
    o = run(["ffmpeg", "-nostats", "-i", p] + (["-ac", "1"] if mono else []) + ["-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", o)[-1]); tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", o)[-1]); return I, tp
gain = 0.0; hist = []
for it in range(4):
    af = f"volume={gain:.2f}dB,alimiter=limit={10 ** ((TARGET_TP - .6) / 20):.4f}:attack=3:release=60:level=false,aresample=48000"
    r = run(["ffmpeg", "-y", "-v", "error", "-i", silent, "-i", sys.argv[3] if len(sys.argv) > 3 else "audio/mix_raw.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", af,
             "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out])
    assert r.returncode == 0, r.stderr
    I, tp = measure(out); hist.append({"gain_db": round(gain, 2), "I": I, "TP": tp})
    if abs(I - TARGET_I) <= .3 and tp <= TARGET_TP: break
    gain += TARGET_I - I
Im, tpm = measure(out, mono=True)
info = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate,sample_rate,channels:format=duration", "-of", "json", out]).stdout
res = {"passes": hist, "final": {"I": I, "TP": tp, "mono_I": Im, "mono_TP": tpm}, "probe": json.loads(info)}
json.dump(res, open(out.replace(".mp4", "_loudness.json"), "w"), indent=1); print(json.dumps(res["passes"]), json.dumps(res["final"]))
