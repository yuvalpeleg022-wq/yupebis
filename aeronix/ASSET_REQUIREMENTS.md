# ASSET REQUIREMENTS — AERONIX AIRWAYS

What ships today, what is a placeholder, and the specification for production assets.
**Every asset added must be licensed for commercial web use; keep proof of licence in `/licenses` (not committed publicly if confidential).**

## Current state

| Asset | Status | Notes |
| --- | --- | --- |
| Aircraft model | **Procedural (code)** | Built from lathed / lofted geometry in `src/three/aircraft/geometry.ts`. Convincing silhouette and proportions, but *not* a photoreal production model. Labelled as procedural in the viewer. |
| Aircraft livery | Procedural canvas textures | Original design (`livery.ts`). Can be replaced by baked textures inside a GLB. |
| Sky, clouds, cloud-sea | Procedural shaders / instanced sprites | No downloads. Optional HDRI upgrade below. |
| Reflections (environment) | Procedural `Lightformer` environment | Baked once at runtime; no HDR file. |
| Earth textures | **Third-party files** in `public/textures/earth/` | See Earth section — licence must be verified before commercial use. |
| Destination imagery | **AI-generated** (3D AI Studio, Nano Banana 2.1), 1200×896 JPEG in `public/images/destinations/` | Labelled "AI-generated image" on every card. Procedural SVG artwork remains as fallback. |
| Cabin imagery | **AI-generated** (same tool), `public/images/cabins/` + `public/images/about/hub.jpg` | Labelled "AI-generated image". Complemented by a real-time procedural 3D cabin (`three/CabinScene.tsx`). |
| Fleet type models (AX-780, AX-1000, AX-320) | **Not created** | Viewer shows the shared wide-body (four-engine variant for AX-1000) and states that it is representative. |

## 1. Aircraft model (highest priority)

- **Type:** modern twin-engine wide-body airliner, original design (must not replicate a manufacturer's protected trade dress or an existing airline's livery).
- **Format:** `glTF 2.0 binary (.glb)`; Draco mesh compression; KTX2 (Basis UASTC for normal maps, ETC1S for colour) textures.
- **Budget:** desktop LOD ≤ 120k triangles, mobile LOD ≤ 40k; ≤ 12 materials; ≤ 2 × 4096² + 4 × 2048² textures; target file ≤ 8 MB (desktop), ≤ 3 MB (mobile).
- **Orientation / scale:** +Y up, nose toward +X *after* the transform in `aircraftConfig.ts`; fuselage ~8 units long, centred at origin (or set `scale` / `position`).
- **Recommended named nodes:** `fuselage`, `wing_L`, `wing_R`, `engine_L`, `engine_R`, `fan_L`, `fan_R` (rotating about the engine axis), `gear` (toggleable group), `nav_light_L/R`, `strobe`. Note: the current GLB path (`GLBAircraft` in `AircraftModel.tsx`) renders the model as-is; fan spin, gear toggle and light blinking are implemented for the procedural model only and need a small hook-up to these node names once a GLB exists.
- **Materials:** PBR metal/rough. Clear-coat on painted surfaces (`KHR_materials_clearcoat`), separate glass material for windows/cockpit.
- **Detail expected:** cockpit glazing, passenger windows, door outlines, panel lines (normal map), flap-track fairings, winglets, engine fan blades & spinner, landing gear (separate group).
- **Livery:** AERONIX livery per brand palette — pearl white fuselage, deep navy (#0B1F35) lower fuselage, metallic silver (#AEBBC8) and champagne gold (#C5A46D) pinstripes, navy tail with the AERONIX emblem.
- **Integration:** `public/models/aeronix-widebody.glb` → set `AIRCRAFT_MODEL.url`. Recommended optimisation:
  `npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress ktx2`.
- **Optional extra fleet models:** narrow-body (AX-320) and four-engine (AX-1000) to the same spec.

## 2. Textures

| Texture | Size | Format |
| --- | --- | --- |
| Aircraft base colour / ORM / normal | 4096² (desktop), 2048² (mobile) | KTX2 |
| Cabin & destination photography | 2400 × 1600 max, 3:2 or 4:3 | AVIF + WebP fallback (JPEG acceptable), ≤ 350 kB each |
| OG / social image | 1200 × 630 | JPEG/PNG (replace `public/og-image.svg`, as some platforms don't render SVG OG images) |

## 3. Sky assets (optional upgrade)

The procedural sky is production-ready. For extra realism:
- **HDRI:** 2K–4K equirectangular sky above clouds, golden-hour or blue-hour, `.hdr` → convert to `.ktx2`/`.exr` ≤ 6 MB. Load with drei `<Environment files=…>` in `SceneLighting.tsx`. Recommended source: Poly Haven (CC0).
- **Cloud sprite atlas:** 1024² RGBA, 4–8 soft cumulus puffs, premultiplied alpha. Pass to `<Clouds texture=…>`.

## 4. Earth textures

Currently shipped (downloaded from the three.js repository examples, `examples/textures/planets/`, r170):
`earth_atmos_2048.jpg` (day), `earth_lights_2048.jpg` (night, re-encoded from PNG), `earth_specular_2048.jpg` (ocean mask).

- These are derived from NASA "Blue Marble" / "Earth at Night" imagery. NASA imagery is generally not copyrighted, but the exact provenance of these specific files is **not documented** in the three.js repository. **Verify or replace before commercial use.**
- **Recommended replacement:** NASA Visible Earth Blue Marble Next Generation (day), NASA Black Marble (night), and a land/ocean mask — 4096 × 2048, equirectangular, JPEG/KTX2, credited "Imagery: NASA".

## 5. Destination photography (8 images)

London, Paris, New York, Tokyo, Rome, Singapore, Dubai, Bangkok — cinematic, dusk/blue-hour preferred, no recognisable people without model releases, no airline branding. Licence: commercial web use (e.g. purchased stock, or Unsplash licence with attribution recommended).
Integration: `public/images/destinations/<id>.avif` → set `image` in `src/data/destinations.ts`; keep `imageAlt` accurate.

## 6. Cabin photography / renders (4 images)

First suite, Business studio, Economy cabin, cabin-design detail. Must be **original renders or licensed imagery that does not depict a real airline's product**. Integration: pass `image` to `<CabinArtwork>` in `src/pages/Experience.tsx`.

## AI-generated images

The 13 images were generated for this project with 3D AI Studio (Nano Banana 2.1) from text prompts (no source photos). They depict real cities but are synthetic — they must not be presented as photographs of real places or of a real airline cabin. Before commercial use, confirm 3D AI Studio's current terms for commercial use of generated output, or replace them with licensed photography to the spec below.

## Licensing checklist

- [ ] Every file has a recorded source, author, licence and date.
- [ ] No trademarks, logos or liveries of real airlines or manufacturers.
- [ ] Attribution added to the About page / footer where the licence requires it.
- [ ] Earth textures verified or replaced.
- [ ] Commercial-use terms for the AI-generated images confirmed (or images replaced).
