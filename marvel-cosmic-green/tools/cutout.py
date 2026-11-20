#!/usr/bin/env python3
"""Cut a character out of a supplied image (keeps proportions, trims to content).

    python3 cutout.py <isnet_medium.onnx> <image> <out.png>

Already-transparent PNGs are kept as they are (just trimmed).
"""
import sys
import numpy as np, cv2, onnxruntime as ort

model, src, dst = sys.argv[1:4]
im = cv2.imread(src, cv2.IMREAD_UNCHANGED)
if im.ndim == 3 and im.shape[2] == 4 and im[:, :, 3].min() < 250:
    rgba = im
else:
    rgb = im[:, :, :3][:, :, ::-1]
    s = ort.InferenceSession(model)
    x = cv2.resize(rgb, (1024, 1024), interpolation=cv2.INTER_AREA).astype(np.float32)
    x = ((x - 128) / 256).transpose(2, 0, 1)[None]
    o = s.run(None, {"input": x})[0][0, 0]
    a = np.clip(cv2.resize(o, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_CUBIC), 0, 1)
    rgba = np.dstack([im[:, :, :3], (a * 255).astype(np.uint8)])
ys, xs = np.where(rgba[:, :, 3] > 12)
rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
cv2.imwrite(dst, rgba)
print(dst, rgba.shape[1], "x", rgba.shape[0])
