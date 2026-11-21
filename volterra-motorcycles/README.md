# Volterra Motorcycles — premium 3D showroom (demo)

A cinematic, responsive motorcycle dealership website with real-time 3D. It's built with
**React 18 + TypeScript + Vite** and **Three.js via React Three Fiber**.

> **Status: demo / portfolio build — not production-ready.** The brand, motorcycles,
> specifications, prices, contact details and legal copy are all placeholders. The test-ride form
> isn't connected to a backend yet. See [Before going live](#before-going-live).

---

## Run it locally

Requirements: Node 18+ (tested on Node 22).

```bash
cd volterra-motorcycles
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build
```

`vite.config.ts` uses a relative `base`, so you can host `dist/` from any folder or sub-path
(Netlify, Vercel, GitHub Pages, a dealer CMS directory…).

---

## What's implemented

| Area | Details |
| --- | --- |
| **Hero** | Full-screen 3D scene of the Strada RS in a dark studio. Slow camera drift, gentle pointer parallax on desktop and a scroll-linked dolly. A poster rendered from the same model shows instantly and crossfades into the live scene. "Explore the Collection" and "Book a Test Ride" both work. |
| **Featured motorcycles** | Reusable cards: render, model name, category, engine/power, starting price, colour swatches. Category filters (All / Naked / Adventure / Heritage). "View Details" opens the details section; the 3D button opens the viewer on that bike. |
| **Interactive 3D viewer** | Three real GLB models. Drag to rotate, zoom (buttons, Ctrl/⌘ + scroll, trackpad pinch, touch pinch) and reset with a smooth camera move. Switch bikes from tabs and paint finishes from swatches, with a smooth blend. Keyboard shortcuts: `+` / `-` / `R`. Shows a loading state with progress, an error fallback with Retry, and a static fallback when WebGL is missing. |
| **Mobile viewer** | The canvas never traps page scrolling. Visitors tap "Tap to rotate & zoom" to interact and "✕" to go back to scrolling. It also drops out of interactive mode automatically when scrolled away. |
| **Details** | Engine and performance table, dimensions and chassis table, colour picker synced with the viewer, key features, a 4-image gallery with a keyboard-navigable lightbox, and test-ride and 3D actions. |
| **About** | Brand story, stats and service pillars (placeholder copy). |
| **Test-ride form** | Fields: full name, email, phone, preferred motorcycle, preferred date (tomorrow up to 6 months ahead), optional message (1,000 characters max) and consent. Validates on blur and on submit, with inline accessible errors and focus moved to the first invalid field. Has submitting, success and error states. Any "Book a Test Ride" button preselects the motorcycle. |
| **Footer** | Brand, navigation, location / contact / social placeholders, Privacy and Terms dialogs, back to top. |
| **Navigation** | Fixed bar that highlights the active section; full-screen mobile menu with focus trap, Esc to close and scroll lock. |
| **Accessibility** | Semantic landmarks, skip link, labelled controls, `aria-pressed` / `aria-selected` / `aria-checked` states, visible focus rings, native `<dialog>` modals, live regions for filter results and loading. |
| **Performance** | 3D code is code-split and lazy-loaded. The viewer only mounts near the viewport and the hero stops rendering when off-screen. Lower DPR and shadow quality on small or touch screens. Environment lighting is generated procedurally, so there are no HDR downloads. GLBs use Meshopt compression with WebP textures. |
| **Motion** | `prefers-reduced-motion` turns off the camera drift, auto-rotate, reveal animations and smooth scrolling. |

### 3D assets

The three motorcycles are **original fictional designs**. Each one was generated as a studio concept
render and then converted image-to-3D into a textured PBR model with 3D AI Studio. The raw exports
were about 65 MB and 1.9M triangles each, so they were optimised with `gltf-transform`:

```bash
npx gltf-transform optimize raw.glb public/models/bike.glb \
  --compress meshopt --texture-compress webp --texture-size 2048 \
  --simplify-ratio 0.15 --simplify-error 0.0008
```

That brings each model to about **2.6 MB** (≈290k triangles, 2K WebP base colour, normal and ORM maps).
Meshopt decoding is bundled with drei, so no external decoder is fetched.

**Paint switching.** These models have a single baked texture, so there is no separate paint
material to swap. Instead, `src/three/paintMaterial.ts` patches the PBR shader: texels near the
factory paint hue get re-tinted to the chosen colour while keeping their original shading.
Each paint can also override roughness (for example, Graphite Matte) and metalness (for example, the solid Ivory, so light colours don't just mirror the dark studio). When you get a manufacturer
model with a dedicated paint material, set that material's `color` instead.

**Every image on the site is rendered from these 3D models**, with the same studio lighting:
card images, paint variants, gallery angles and the hero poster. The "Studio concept" gallery
frames are the original concept renders. To regenerate everything after changing a model or
paint:

```bash
npm run dev            # terminal 1
npm run render:stills  # terminal 2 — writes public/images/*.webp
```

---

## Demo-only features

* **All motorcycle data** in `src/data/motorcycles.ts` is fictional: names, specs, prices, features
  and paints. It's marked `isDemo: true` and labelled "Demo" in the UI.
* **Test-ride form**: submissions aren't sent anywhere unless `VITE_TEST_RIDE_ENDPOINT` is set. The
  success screen says so explicitly.
* **Contact details, address, opening hours and social links** in `src/config/brand.ts` are
  placeholders and aren't rendered as links until real URLs are added.
* **Privacy policy and terms** (`src/components/Legal.tsx`) are placeholder text, not legal documents.
* **About section** copy and stats are placeholders.

---

## Real assets you'll need

1. **Motorcycle 3D models**: GLB/glTF for each model on sale. Manufacturer CAD-derived models are
   ideal. Target under 5 MB each after optimisation, ideally with a separate paint material.
2. **Real specifications, prices and paint options** from the manufacturer or dealer system.
3. **Photography**: showroom, team, lifestyle and detail shots. The gallery accepts any images.
4. **Brand identity**: name, logo (SVG), accent colour and typefaces. The `V` monogram in `Nav.tsx`
   and `public/favicon.svg` are placeholders.
5. **Dealership details**: address, map link, phone, email, opening hours, social profiles.
6. **Legal**: privacy policy and terms written for the dealership's jurisdiction, plus a cookie
   banner if analytics are added.

---

## How to replace the demo content

### Brand and contact details
Edit **`src/config/brand.ts`**. Name, tagline, description, phone, email, address, hours and social
links are all defined there. Setting `phoneHref`, `emailHref`, `mapUrl` or a social `url` turns the
matching placeholder text into a working link automatically.

### Motorcycles
Edit **`src/data/motorcycles.ts`**, or fetch the same `Motorcycle[]` shape from a CMS or API. For each bike:

1. Put the GLB in `public/models/` and set `model3d.url`. Leave `model3d` out entirely to show a
   "3D not available" fallback with the image instead.
2. Set `model3d.yaw` so the bike faces right (+X). Bikes are auto-scaled and placed on the floor.
3. For hue-keyed paint: set `paintHue` (0–1) to the factory paint's hue, then tune `hueRange`,
   `minSaturation` and `paintValue`.
4. Add `paints` (`tint: null` = factory finish), `performance`, `dimensions`, `features` and `gallery`.
5. Run `npm run render:stills`, or drop in your own photos and update the image paths.

Categories for the filter come from `categories` in the same file.

### Connect the test-ride form to a real backend
The form posts JSON (`TestRideRequest` in `src/services/testRide.ts`) to the URL in
`VITE_TEST_RIDE_ENDPOINT`:

```bash
# .env.production  (or your host's environment settings)
VITE_TEST_RIDE_ENDPOINT=https://formspree.io/f/your-form-id
```

Any endpoint that accepts a JSON `POST` works: Formspree, Basin or Getform, or your own
Netlify / Vercel / Cloudflare function that forwards the request to email, a CRM (HubSpot,
Salesforce) or a dealer management system. Once it's set, the UI switches from demo copy to
"request received" automatically, and failed requests show an error with a retry.

**Don't put API keys in `VITE_*` variables.** They're bundled into the public JavaScript. Keep
secrets inside the server-side function.

---

## Project structure

```
volterra-motorcycles/
├─ index.html
├─ still.html                 dev-only still renderer used by scripts/render-stills.mjs
├─ public/
│  ├─ models/*.glb            optimised motorcycle models
│  └─ images/*.webp           stills rendered from the models
├─ scripts/
│  ├─ render-stills.mjs       regenerates every image from the 3D models
│  ├─ qa.mjs                  Playwright end-to-end smoke test
│  └─ shot.mjs                quick screenshot helper
└─ src/
   ├─ config/brand.ts         brand + dealership placeholders
   ├─ data/motorcycles.ts     demo catalogue (types + data)
   ├─ services/testRide.ts    form submission (demo / live endpoint)
   ├─ three/                  BikeModel, StudioStage, paint shader, Hero & Viewer canvases
   ├─ components/             Nav, Hero, Collection, MotorcycleCard, Experience, Details,
   │                          About, TestRide, Footer, Legal, Modal, Reveal, Icons…
   ├─ hooks/                  in-view, reduced-motion, media-query, active-section
   └─ styles/global.css       design tokens + base styles
```

## Walkthrough video

```bash
npm run dev                                   # terminal 1
npm run record:video -- http://localhost:5173 volterra-walkthrough.mp4   # terminal 2
```

Records a smooth 40-second, 1920×1080, 25 fps tour of the whole site that ends on an animated logo
card. It needs ffmpeg. The page clock (render loop, CSS animations and scrolling) is advanced one
frame at a time, so the result is perfectly smooth even on a machine without a GPU. Edit the shot
list in `scripts/record-video.mjs` to change the route or timing.

## Testing

```bash
npm run dev            # terminal 1
npm run qa             # terminal 2 — Playwright smoke test, screenshots in qa-output/
```

The QA script covers every nav link and CTA, the filters, card actions, viewer drag / zoom / reset /
paint / bike switching (checked by pixel diff), Ctrl+wheel zoom vs normal page scrolling, form
validation, success and reset, the dialogs, lightbox keyboard navigation, the mobile menu and
tap-to-interact viewer, horizontal overflow at desktop / tablet / mobile sizes, broken images, dead
anchors, console errors, the no-WebGL fallback (`?no3d`) and reduced motion.

## Before going live

- [ ] Replace demo motorcycles, specs, prices and images with verified data
- [ ] Replace the brand name, logo, favicon and dealership details
- [ ] Connect the form (`VITE_TEST_RIDE_ENDPOINT`) and test a real submission end to end
- [ ] Publish a real privacy policy and terms; add cookie consent if adding analytics
- [ ] Test on real iOS and Android devices (the QA run uses headless Chromium with software WebGL)
- [ ] Self-host fonts if required by privacy policy (they currently load from Google Fonts)
- [ ] Add analytics, SEO metadata / Open Graph image and a sitemap as needed
