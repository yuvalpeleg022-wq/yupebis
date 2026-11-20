#!/usr/bin/env python3
"""Per-frame speaker matte with ISNet (resumable).

    python3 segment.py <video> <isnet_medium.onnx> <mask_dir> [--threads 4]

Writes <mask_dir>/00000.png ... (8-bit alpha, source resolution).
Re-running skips frames that already exist. The renderer refines these
(person-only components, shoulder-line fill, temporal smoothing, edge choke).
"""
import argparse, os, subprocess, json
import numpy as np, cv2, onnxruntime as ort

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("model"); ap.add_argument("mask_dir")
ap.add_argument("--threads", type=int, default=4)
a = ap.parse_args()
os.makedirs(a.mask_dir, exist_ok=True)
info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                  "-of", "json", a.video], capture_output=True, text=True).stdout)["streams"][0]
W, H = info["width"], info["height"]
so = ort.SessionOptions(); so.intra_op_num_threads = a.threads
sess = ort.InferenceSession(a.model, so)
p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.video, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
i = 0
while True:
    b = p.stdout.read(W * H * 3)
    if len(b) < W * H * 3:
        break
    out = os.path.join(a.mask_dir, f"{i:05d}.png")
    if not os.path.exists(out):
        im = np.frombuffer(b, np.uint8).reshape(H, W, 3)
        x = cv2.resize(im, (1024, 1024), interpolation=cv2.INTER_AREA).astype(np.float32)
        x = ((x - 128) / 256).transpose(2, 0, 1)[None]
        o = sess.run(None, {"input": x})[0][0, 0]
        m = cv2.resize(np.clip(o, 0, 1), (W, H), interpolation=cv2.INTER_CUBIC)
        cv2.imwrite(out, (np.clip(m, 0, 1) * 255).astype(np.uint8))
    i += 1
    if i % 100 == 0:
        print(i, flush=True)
print("done", i)
