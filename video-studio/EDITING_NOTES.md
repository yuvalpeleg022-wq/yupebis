# Cinematic talking-head edit: status and notes

Source: `source/raw.mp4` (not committed). 1080x1920, 24.79 s, variable frame rate (~14 fps), AAC stereo 48 kHz.
Content: one speaker, selfie framing, talking to camera with hand gestures. Plain wall, red artwork top right.

## Done
| Step | Output | Result |
|---|---|---|
| Constant 30 fps | `work/cfr30.mp4` | 743 frames, timestamps normalized so tracking and Remotion stay in sync |
| Face tracking + blur | `pipeline/face_blur.py` -> `work/blur_raw.mp4`, `work/tracks.json` | MediaPipe 478-point face mesh found the face on **743/743 frames** (no detector fallback, no interpolation). Ellipse follows position, size and head roll; offline smoothing plus a motion margin. Blur = 1/45 mosaic + Gaussian sigma 26, 20 px feathered edge. |
| Blur QA | `tracks.json` -> `qa` | Every mesh point inside the fully-blurred core on every frame: **0 uncovered frames**, outermost point at 0.738 of the core radius. Visually checked at frames 0, 342 (fastest head move), 470, 742. |
| Color grade | `work/graded.mp4` | Highlight roll-off for the bright wall, mild contrast, +4% saturation, neutral whites, light sharpening. Skin unchanged in hue. |
| Voice cleanup | `work/voice_clean.wav` | High-pass 85 Hz, FFT noise reduction, -2.5 dB at 250 Hz, +2.5 dB at 3.2 kHz, 3:1 compression, limiter, loudness -24.2 -> **-16.3 LUFS**, peak -1.5 dBTP |
| Speech map | silencedetect | Speech 0.73 to 23.96 s. Pauses at 8.0-8.7, 9.3-9.6, 12.5-13.0, 17.1-17.4, 21.2-21.5 s, so six phrases. |
| Remotion | `remotion/` | Remotion 4.0.454 installed |

## Blocked: transcription
Subtitles, content illustrations and sound timing all need the exact spoken words with timestamps.
- Whisper models download from huggingface.co, which this environment's network does not allow.
- Allowing it needs an environment change that the Claude mobile app cannot approve.
- Higgsfield video analysis was rejected: it gives scene descriptions, not a verbatim timed transcript, and would upload the footage to a third party.
