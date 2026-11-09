"""Track the speaker's face on every frame and bake in a feathered, irreversible blur.

Pipeline
  1. MediaPipe FaceLandmarker (478-pt mesh) on every frame -> face hull, roll angle.
     Fallback: BlazeFace detector box. Fallback 2: interpolate between neighbours.
  2. Offline smoothing (centred window) of centre/size/angle so the blur never jitters,
     plus a motion margin: radius grows by how far the raw centre is from the smoothed one,
     so fast head moves can never slip out of the mask.
  3. Blur = heavy mosaic (1/22 scale) + Gaussian, composited through a feathered ellipse.
  4. Writes tracks.json (per-frame ellipse) and a QA report.

usage: python3 face_blur.py in.mp4 out.mp4 tracks.json
"""
import json, sys
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

SRC, DST, TRACKS = sys.argv[1:4]
MODELS = __file__.rsplit("/", 2)[0] + "/models/"

lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=mpt.BaseOptions(model_asset_path=MODELS + "face_landmarker.task"),
    running_mode=vision.RunningMode.VIDEO, num_faces=1,
    min_face_detection_confidence=0.3, min_face_presence_confidence=0.3, min_tracking_confidence=0.3))
det = vision.FaceDetector.create_from_options(vision.FaceDetectorOptions(
    base_options=mpt.BaseOptions(model_asset_path=MODELS + "blaze_face_short_range.tflite"),
    min_detection_confidence=0.3))

cap = cv2.VideoCapture(SRC)
fps = cap.get(cv2.CAP_PROP_FPS)
W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
frames, raw, meshes = [], [], []
i = 0
while True:
    ok, f = cap.read()
    if not ok:
        break
    frames.append(f)
    img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    r = lm.detect_for_video(img, int(i * 1000 / fps))
    rec = None
    if r.face_landmarks:
        pts = np.array([[p.x * W, p.y * H] for p in r.face_landmarks[0]])
        x0, y0 = pts.min(0); x1, y1 = pts.max(0)
        le, re = pts[33], pts[263]                      # outer eye corners -> roll
        ang = float(np.degrees(np.arctan2(re[1] - le[1], re[0] - le[0])))
        meshes.append(pts)
        rec = dict(src="mesh", cx=(x0 + x1) / 2, cy=(y0 + y1) / 2, w=x1 - x0, h=y1 - y0, ang=ang)
    else:
        meshes.append(None)
        d = det.detect(img)
        if d.detections:
            b = max(d.detections, key=lambda d: d.categories[0].score).bounding_box
            # detector box is tighter (brows->chin); scale to mesh-equivalent
            rec = dict(src="detector", cx=b.origin_x + b.width / 2, cy=b.origin_y + b.height * 0.45,
                       w=b.width * 1.05, h=b.height * 1.25, ang=0.0)
    raw.append(rec)
    i += 1
N = len(frames)

# fill gaps by linear interpolation / nearest hold
keys = ["cx", "cy", "w", "h", "ang"]
have = [k for k in range(N) if raw[k]]
if not have:
    sys.exit("no face found")
arr = np.zeros((N, 5))
for j, k in enumerate(keys):
    arr[:, j] = np.interp(range(N), have, [raw[t][k] for t in have])
src = [raw[t]["src"] if raw[t] else "interp" for t in range(N)]

# centred smoothing (window 5) + motion margin
def smooth(x, r=2):
    p = np.pad(x, (r, r), mode="edge")
    return np.convolve(p, np.ones(2 * r + 1) / (2 * r + 1), mode="valid")
sm = np.stack([smooth(arr[:, j]) for j in range(5)], 1)
lag = np.hypot(arr[:, 0] - sm[:, 0], arr[:, 1] - sm[:, 1])
# size: never smaller than the raw size in a +-2 frame neighbourhood
for j in (2, 3):
    sm[:, j] = np.maximum(sm[:, j], np.array([arr[max(0, t - 2):t + 3, j].max() for t in range(N)]))

tracks = []
for t in range(N):
    cx, cy, w, h, ang = sm[t]
    extra = lag[t] * 1.5 + (14 if src[t] != "mesh" else 0)
    rx = w * 0.68 + extra            # cheeks + ears
    ry = h * 0.80 + extra            # chin -> hairline
    cy_e = cy - h * 0.10             # shift up to cover forehead / hairline
    tracks.append(dict(t=round(t / fps, 4), cx=round(cx, 1), cy=round(cy_e, 1), rx=round(rx, 1),
                       ry=round(ry, 1), ang=round(ang, 2), src=src[t]))

# render
vw = cv2.VideoWriter(DST, cv2.VideoWriter_fourcc(*"mp4v"), fps, (W, H))
for t, f in enumerate(frames):
    tr = tracks[t]
    mask = np.zeros((H, W), np.float32)
    cv2.ellipse(mask, (int(tr["cx"]), int(tr["cy"])), (int(tr["rx"]), int(tr["ry"])), tr["ang"], 0, 360, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (0, 0), 9)          # feathered edge (soft, ~20px)
    # irreversible: very coarse mosaic (1/45) + heavy Gaussian, so no feature survives
    small = cv2.resize(f, (W // 45, H // 45), interpolation=cv2.INTER_AREA)
    mosaic = cv2.resize(small, (W, H), interpolation=cv2.INTER_LINEAR)
    blurred = cv2.GaussianBlur(mosaic, (0, 0), 26)
    m3 = mask[..., None]
    vw.write((f * (1 - m3) + blurred * m3).astype(np.uint8))
vw.release()

# QA: every one of the 478 RAW mesh points must lie inside the fully-blurred core of the
# ellipse (shrunk by the 20px feather), on every frame.
bad, worst = [], 0.0
for t in range(N):
    pts, tr = meshes[t], tracks[t]
    if pts is None:
        continue
    a = np.radians(tr["ang"])
    x, y = pts[:, 0] - tr["cx"], pts[:, 1] - tr["cy"]
    u, v = x * np.cos(a) + y * np.sin(a), -x * np.sin(a) + y * np.cos(a)
    r = (u / (tr["rx"] - 20)) ** 2 + (v / (tr["ry"] - 20)) ** 2
    worst = max(worst, float(r.max()))
    if r.max() > 1:
        bad.append(t)
qa = dict(frames=N, fps=fps, mesh=src.count("mesh"), detector=src.count("detector"),
          interpolated=src.count("interp"), uncovered_frames=sorted(set(bad)), worst_point_radius=round(worst, 3))
json.dump(dict(qa=qa, tracks=tracks), open(TRACKS, "w"), indent=1)
print(json.dumps(qa))
