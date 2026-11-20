# MARVEL COSMIC GREEN — CREATOR STYLE

A reusable editing preset and renderer for Hebrew Marvel talking-head shorts
(TikTok / Reels / Shorts, 1080×1920, 30 fps, H.264).

For each new video you only supply **the talking-head clip**, **what you say**
(the transcript is generated, then you review it) and **the character /
movie images**. The look, captions, compositing and sound design all come
from `preset.json`.

## Visual identity (fixed by the preset)

| Layer | Treatment |
|---|---|
| Background | Procedural deep-emerald / forest-green nebula (two drifting layers), rising smoke, slowly rotating volumetric light rays from top-right, twinkling parallax star field, floating dust + bokeh, breathing brightness, heavy vignette. Fully original, never repeats a stock asset. |
| Speaker | ISNet matte → person-only components → shoulder-line fill (fixes dark clothes on dark backgrounds) → 3-frame temporal smoothing → 7 px choke + smoothstep edge → edge-colour decontamination (no old-wall halo) → gentle grade (exposure 0.93, +6 % contrast, faint teal shadows, skin untouched) → green environment light-wrap → thin green rim lights. No face/body is generated or altered. |
| Characters | Supplied images cut out with ISNet (proportions kept, never stretched), drop shadow on the nebula, green outer glow + rim light, eased slide / rise / zoom entrances with motion blur, slow idle push. Default layer is **behind the speaker** so a character can never cover the face. |
| Captions | Heebo 900, 90 px, white, 10 px black stroke, soft drop shadow, centred at y = 1385 (lower-middle), true RTL shaping (mixed Hebrew/Latin/digits), 2–4 words per caption, pop-in with overshoot, key words in cosmic green `#8BFFB0`. |
| Motion | Alternating 1.00 / 1.07 framing on every jump cut + slow push-in, punch-ins on key words, energy rings, particle bursts, green light flashes, camera shake + RGB glitch on the biggest beat, info cards (glowing text) in the free space above the head. |
| Sound | Voice: high-pass, 3:1 compression, loudness-normalised to −15 LUFS. Original procedural bed (low drone + air), whooshes on every entrance (panned to the side the character enters from), impacts, riser, energy shimmers, soft ticks on jump cuts. All synthesised, no third-party music. |
| Rhythm | Dead air > ~1 s is trimmed; cut points snap to the quietest 10 ms nearby; 12 ms audio fades at every cut. |

## Workflow for a new video

```bash
# 0. once per machine
bash tools/setup_models.sh                       # ISNet + Whisper, from npm/PyPI only

M=~/.cache/marvel-cosmic-green
mkdir -p projects/<name>/assets

# 1. transcribe (large-v3 if huggingface.co is reachable, else the bundled small model)
python3 tools/transcribe.py my_video.mp4 large-v3 projects/<name>/transcript.json
#    -> review every word marked (?) and fix spelling of names

# 2. matte the speaker (resumable, ~1 s / frame on 4 CPU cores)
python3 tools/segment.py my_video.mp4 $M/isnet_medium.onnx projects/<name>/masks

# 3. cut out the supplied images
python3 tools/cutout.py $M/isnet_medium.onnx doom.jpg projects/<name>/assets/doom_cut.png

# 4. write projects/<name>/project.json  (copy the doomsday example)
#    keep / captions / overlays / cards / punch / fx / sfx — all in SOURCE seconds

# 5. check key frames, then render
python3 render.py projects/<name>/project.json --stills 3.5,12,40     # PNGs in work/
python3 render.py projects/<name>/project.json --preview 0 10          # quick silent clip
python3 render.py projects/<name>/project.json                         # final MP4 + audio
```

### project.json cheat-sheet

* `keep`: `[[start, end], ...]` source ranges to keep (dead-air removal).
* `captions`: `{start, end, text, hl?, review?}` — `review` notes anything uncertain.
* `overlays`: `{asset, in, out, x, bottom, h, enter: slide-left|slide-right|rise|zoom, layer: behind|front}`.
  The speaker's face sits roughly at x 430–840, y 515–1115. Use the side bands and the area above the head.
* `cards`: glowing text cards (`lines[{text,size,dy,color,glow}]`) above the head.
* `punch`: `{t, amount}` quick zoom accents. `fx`: `flash | pulse | burst | shake | glitch`.
* `bg_dim`: darken the nebula during a big reveal. `sfx`: `whoosh | impact | riser | energy`.

## Rules the preset follows

* Only the images you supply are used; nothing is invented or swapped.
* Captions show what was actually said. Uncertain words are marked `review` in
  the project and listed in the delivery notes; unresolved speech is left uncaptioned, never guessed.
* Characters keep their proportions and never cover the speaker's face.
* Effects sit under the dialogue; no copyrighted music is added.

Font: Heebo (SIL Open Font License, `fonts/OFL-Heebo.txt`).
