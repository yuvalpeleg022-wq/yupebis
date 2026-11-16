import json, sys, time, subprocess
import numpy as np
from faster_whisper import WhisperModel
model_id, wav, out = sys.argv[1], sys.argv[2], sys.argv[3]
t0 = time.time()
m = WhisperModel(model_id, device="cpu", compute_type="int8", cpu_threads=4)
print("loaded", round(time.time()-t0,1), flush=True)
audio = np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",wav,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True,check=True).stdout, np.float32)
segs, info = m.transcribe(audio, language="he", word_timestamps=True, beam_size=5, vad_filter=True)
res = []
for s in segs:
    res.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                "words": [{"w": w.word.strip(), "s": round(w.start,3), "e": round(w.end,3), "p": round(w.probability,3)} for w in s.words]})
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text.strip()}", flush=True)
json.dump({"model": model_id, "segments": res}, open(out, "w"), ensure_ascii=False, indent=1)
print("done", round(time.time()-t0,1))
