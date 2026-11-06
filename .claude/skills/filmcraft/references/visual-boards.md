# Visual boards as text-based artifacts

How to produce shot lists, storyboards, moodboards, lookbooks, and color-palette boards when the only output medium is text and code. Today is 2026-07-20.

---

## 1. The honest limit

A skill cannot emit real photographs. It writes text and code. So do not pretend to hand over a photographic storyboard. There are two real deliverables, and every board is one or both:

1. **Rendered layout** — a self-contained HTML/SVG file that draws framing rectangles, shapes, headers, captions, and color swatches. This *can* be opened in a browser or shown as an artifact. It is a **mockup / schematic**, not a photo. Say so, in the file and to the user.
2. **Image-model prompts** — ready-to-paste text prompts for Midjourney, Stable Diffusion, or Google's nano-banana / image models, structured so a human can generate the real frames themselves.

Always label the rendered board as a mockup. The value of the schematic is composition, blocking, and shot flow — not photographic finish. The prompts are how the finish gets made downstream.

---

## 2. The five boards

- **Shot list** — the spreadsheet of the sequence: every shot numbered, with size, angle, lens, movement, subject, and notes. The production document editors, ADs, and the DP actually use. Text table is the right format.
- **Storyboard** — sequential framed panels showing composition and action, one panel per shot or key beat, with a caption. Rendered as an SVG strip of framing rectangles with simple shapes for subjects.
- **Moodboard** — a grid of tone references (color, texture, light, reference-film stills) that sets the feel before anything is shot. Rendered as an HTML/CSS grid of swatches and captioned tiles; the "images" are described or filled by generated frames.
- **Lookbook** — the pitch document: moodboard plus intent text, palette, camera/lens plan, and reference films. A short structured HTML page or a formatted doc.
- **Color-palette board** — the named swatches of the film's color story, with hex values and what each color means in the story. Pure swatches, trivial to render exactly.

---

## 3. Shot list — structure and worked example

Columns that matter: shot number, shot size, angle, movement, lens, subject/action, audio/notes. Sizes: ECU, CU, MCU, MS, MWS, WS, EWS. Angles: eye, high, low, OTS, POV, Dutch. Movement: static, pan, tilt, dolly in/out, track, Steadicam, crane, handheld.

**Worked example — scene: a woman reads a letter at a kitchen table at dawn, then stands and walks to the window.**

| # | Size | Angle | Move | Lens | Subject / action | Notes |
|---|------|-------|------|------|------------------|-------|
| 1 | EWS | Eye | Static | 32mm | Kitchen at dawn, her small at the table | Establish, cold window light |
| 2 | MS | Eye | Slow dolly in | 50mm | She unfolds the letter | Push begins on "reads" |
| 3 | ECU | Eye | Static | 100mm | Her eyes scanning the page | Hold on reaction |
| 4 | Insert | High | Static | 100mm | The letter in her hands | Text unreadable, deliberate |
| 5 | MCU | Low | Static | 50mm | She lowers the letter, breath | Key beat |
| 6 | MWS | Eye | Track with | 35mm | She rises, crosses to window | Motivated backlight grows |
| 7 | WS | Eye | Static | 35mm | Silhouette at window, city beyond | End frame, hold |

---

## 4. Storyboard — reusable SVG skeleton

Each panel is a 16:9 (or 2.39:1) framing rectangle with simple shapes for subjects and a caption strip. This is a schematic of composition and blocking, not a photo.

**One storyboard frame (self-contained SVG), same scene, shot 2 "she unfolds the letter":**

```svg
<svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
  <!-- panel border + 16:9 frame -->
  <rect x="0" y="0" width="320" height="220" fill="#fafafa" stroke="#222"/>
  <rect x="10" y="10" width="300" height="169" fill="#e8eef2" stroke="#222" stroke-width="1.5"/>
  <!-- rule-of-thirds guides -->
  <g stroke="#b9c4cc" stroke-dasharray="3 3">
    <line x1="110" y1="10" x2="110" y2="179"/>
    <line x1="210" y1="10" x2="210" y2="179"/>
    <line x1="10" y1="66"  x2="310" y2="66"/>
    <line x1="10" y1="123" x2="310" y2="123"/>
  </g>
  <!-- window light source, frame right -->
  <rect x="250" y="20" width="55" height="150" fill="#cfe0ea"/>
  <!-- table -->
  <rect x="20" y="150" width="270" height="20" fill="#c8b8a0"/>
  <!-- subject: head + shoulders on left third -->
  <circle cx="110" cy="110" r="22" fill="#8a7a6a"/>
  <path d="M78 170 Q110 128 142 170 Z" fill="#5f5348"/>
  <!-- the letter (small light rectangle in her hands) -->
  <rect x="95" y="140" width="30" height="20" fill="#fff" stroke="#333" transform="rotate(-8 110 150)"/>
  <!-- movement arrow: slow dolly in -->
  <g stroke="#c0392b" stroke-width="2" fill="none">
    <line x1="160" y1="95" x2="200" y2="95" marker-end="url(#arw)"/>
  </g>
  <defs>
    <marker id="arw" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0 0 L6 3 L0 6 Z" fill="#c0392b"/>
    </marker>
  </defs>
  <!-- caption strip -->
  <text x="12" y="197" font-size="11" font-weight="bold">2 · MS · 50mm · slow dolly in</text>
  <text x="12" y="212" font-size="10" fill="#444">She unfolds the letter. Cold window light, frame right.</text>
</svg>
```

Legend for the shapes: circle + shoulders = a person, light rectangle = the light source (window/lamp), red arrow = camera or subject movement, dashed lines = rule-of-thirds guides. Keep the vocabulary consistent across all panels so the strip reads.

**Storyboard strip skeleton (HTML, many panels in a row, horizontally scrollable):**

```html
<div style="font-family:sans-serif;overflow-x:auto;white-space:nowrap;padding:8px;background:#fff">
  <h2 style="margin:4px 8px">Storyboard — Dawn letter (mockup, not photographs)</h2>
  <div style="display:inline-flex;gap:12px">
    <!-- repeat one <figure> per shot; paste an SVG panel from above into each -->
    <figure style="margin:0;width:320px;display:inline-block;white-space:normal">
      <!-- SVG PANEL 1 HERE -->
      <figcaption style="font-size:11px;color:#555;margin-top:4px">Panel 1</figcaption>
    </figure>
    <figure style="margin:0;width:320px;display:inline-block;white-space:normal">
      <!-- SVG PANEL 2 HERE -->
      <figcaption style="font-size:11px;color:#555;margin-top:4px">Panel 2</figcaption>
    </figure>
    <!-- ...more panels... -->
  </div>
</div>
```

---

## 5. Moodboard — reusable HTML/CSS grid skeleton

A moodboard sets tone before the shoot. Render it as a grid of captioned tiles: color swatches you can draw exactly, plus reference tiles that describe the still (or hold a generated frame). Honest label: the reference tiles are placeholders and text, not licensed photographs.

```html
<div style="font-family:sans-serif;max-width:900px;margin:auto;color:#1a1a1a">
  <h2>Moodboard — Dawn letter (mockup)</h2>
  <p style="color:#666;font-size:13px">Tone: cold, contained, grief held. Swatches are exact; reference tiles are prompts, not photos.</p>

  <!-- palette row -->
  <div style="display:flex;gap:0;border-radius:6px;overflow:hidden;margin:12px 0">
    <div style="flex:1;height:56px;background:#2b3a44"></div>
    <div style="flex:1;height:56px;background:#5b7183"></div>
    <div style="flex:1;height:56px;background:#c9d6dd"></div>
    <div style="flex:1;height:56px;background:#e9d9c2"></div>
    <div style="flex:1;height:56px;background:#b5623c"></div>
  </div>

  <!-- reference grid -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
    <figure style="margin:0;border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#2b3a44,#5b7183);display:flex;align-items:center;justify-content:center;color:#eaf0f4;font-size:12px;padding:8px;text-align:center">
        Cold window light on a face in shadow
      </div>
      <figcaption style="font-size:11px;padding:6px 8px;color:#555">Ref: low-key dawn interior</figcaption>
    </figure>
    <figure style="margin:0;border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#c9d6dd,#e9d9c2);display:flex;align-items:center;justify-content:center;color:#3a3a3a;font-size:12px;padding:8px;text-align:center">
        Warm practical lamp, single accent
      </div>
      <figcaption style="font-size:11px;padding:6px 8px;color:#555">Ref: warm accent in cold room</figcaption>
    </figure>
    <figure style="margin:0;border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#5b7183,#2b3a44);display:flex;align-items:center;justify-content:center;color:#eaf0f4;font-size:12px;padding:8px;text-align:center">
        Silhouette at a window, city beyond
      </div>
      <figcaption style="font-size:11px;padding:6px 8px;color:#555">Ref: end-frame silhouette</figcaption>
    </figure>
  </div>
</div>
```

To upgrade a moodboard from schematic to near-final, generate the reference frames with the prompts in section 7 and drop them in as `data:` URI images or into the tiles.

---

## 6. Color-palette board — exact swatches

The one board that renders exactly, because color is code. Give each swatch a name, a hex value, and its story meaning.

```html
<div style="font-family:sans-serif;max-width:640px;margin:auto">
  <h2>Palette — Dawn letter</h2>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;text-align:center;font-size:11px">
    <div><div style="height:80px;background:#2b3a44;border-radius:4px"></div>Night blue #2b3a44<br><span style="color:#777">grief, the room before light</span></div>
    <div><div style="height:80px;background:#5b7183;border-radius:4px"></div>Dawn slate #5b7183<br><span style="color:#777">cold window light</span></div>
    <div><div style="height:80px;background:#c9d6dd;border-radius:4px"></div>Pale sky #c9d6dd<br><span style="color:#777">exterior, distance</span></div>
    <div><div style="height:80px;background:#e9d9c2;border-radius:4px"></div>Paper #e9d9c2<br><span style="color:#777">the letter, memory</span></div>
    <div><div style="height:80px;background:#b5623c;border-radius:4px"></div>Lamp amber #b5623c<br><span style="color:#777">the one warm thing kept</span></div>
  </div>
</div>
```

---

## 7. Image-model prompts

The rendered board shows composition. The prompts produce the finish. Structure every prompt the same way so results stay controllable:

**subject → shot size / framing → lens & camera → lighting → color / film stock → mood → style/reference → aspect ratio → technical flags.**

The order and the specificity are what give you a repeatable image instead of a lucky one. Keep a consistent "style suffix" across a scene's prompts so frames match.

**Three prompts for the same scene** (shot 3, ECU of her eyes scanning the letter at dawn). Written for three tools, each in its own idiom:

**Midjourney (v6-era syntax):**
```
extreme close-up of a woman's eyes scanning a letter, tears held back,
soft cold dawn light from a window camera-right, shallow focus,
shot on ARRI Alexa 35 with 100mm Cooke lens, low-key naturalistic lighting,
desaturated teal-and-amber palette, quiet grief, cinematic still,
in the style of Bradford Young --ar 2.39:1 --style raw --stylize 200
```

**Stable Diffusion (SDXL, positive + negative):**
```
Positive: cinematic film still, extreme close-up of a woman's eyes reading a
letter at dawn, cold window light from the right, 100mm lens shallow depth of
field, low-key lighting, muted teal shadows warm amber accent, 35mm film grain,
melancholic, restrained, photographic, high detail
Negative: cartoon, illustration, cgi, oversaturated, harsh flash, plastic skin,
extra fingers, text, watermark, blurry
Settings: 1024x429 (2.39:1), steps 30, CFG 6, sampler DPM++ 2M Karras
```

**Google nano-banana / image model (natural-language, describe don't tag):**
```
A photographic cinematic close-up of a woman's eyes as she reads a letter in the
first cold light of dawn. Light comes only from a window to the right, soft and
blue; a single warm lamp glows out of focus behind her. Framed very tight on the
eyes, shallow focus, the mood is quiet and grieving. Muted color, teal shadows
with one warm amber accent, subtle film grain. Widescreen 2.39:1, realistic,
restrained, no text or captions.
```

**Prompt hygiene.** Lock lens, lighting direction, palette, and aspect ratio across a scene's prompts so the frames cut together. Change only subject and framing between shots. State the aspect ratio every time. Avoid stacking ten style names — one or two references beats a pile. Do not use a living DP's name as a style tag if the output will be commercial or published; describe their look in words instead (rights and likeness caution).

---

## 8. Method — producing a board on request

1. **Read the scene** for beats, blocking, and light sources. Break it into shots (section 3).
2. **Decide which board(s)** the user needs — shot list, storyboard, moodboard, lookbook, palette.
3. **Write the shot list first.** Everything else derives from it.
4. **Render the schematic** — build the HTML/SVG from the skeletons in sections 4–6, one panel per key shot, consistent shape vocabulary and captions. Fill in real numbers (size, lens, movement) from the shot list.
5. **Generate matching prompts** — one structured prompt per key frame (section 7), locked style suffix, aspect ratio stated.
6. **Label it honestly** — put "mockup / schematic, not photographs" in the board itself and in the message. Offer the prompts as the path to real frames.
7. **Deliver both** — the openable HTML/SVG file (can be shown as an artifact) and the prompt set. If asked, hand the SVG straight to the artifact renderer.
