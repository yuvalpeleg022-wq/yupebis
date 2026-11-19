# AERONIX AIRWAYS — Cinematic 3D Airline Website

> **Beyond the ordinary.** A portfolio-grade, interactive 3D website for **AERONIX AIRWAYS**, a *fictional* premium airline.
> No real flights, services, schedules, prices or payments exist. All aircraft and route data is illustrative.

Real-time WebGL on every page: a cinematic hero and scroll-directed flight (Home), an interactive globe (Destinations),
a 3D turntable plus full aircraft viewer (Fleet), a procedural 3D cabin interior that follows the scroll (Experience) and
ambient 3D flight scenes (About, Booking) — all rendered live with Three.js / React Three Fiber. Nothing is a pre-rendered video.

---

## Stack

| Area | Library | Version (pinned) |
| --- | --- | --- |
| UI | React, React DOM | 19.3.1 |
| Build | Vite (Rolldown), @vitejs/plugin-react | 8.3.8 / 6.3.0 |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | 5.9.3 |
| 3D | three, @react-three/fiber, @react-three/drei, three-stdlib | 0.187.0 / 9.8.2 / 10.7.9 / 2.36.1 |
| Motion | GSAP + ScrollTrigger | 3.15.1 |
| Routing | react-router-dom | 7.18.6 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | 4.3.5 |
| Icons | lucide-react | 1.76.0 |
| Fonts | @fontsource-variable/inter, inter-tight (self-hosted) | 5.3.0 |

Compatibility notes: R3F 9.8 requires `react >=19 <19.4` (hence 19.3.1); drei 10 requires R3F 9. `three-stdlib` is
pinned explicitly because the GLB pipeline uses its `KTX2Loader` (must match drei's `GLTFLoader` types).
Clean install reports 0 peer conflicts and 0 vulnerabilities.

## Getting started

```bash
cd aeronix
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run typecheck    # tsc -b (strict)
npm run build        # type-check + production build → dist/
npm run preview      # serve dist/ on http://localhost:4173
npm run build:portable  # relative paths + hash routing → dist-portable/ (for hosts without SPA rewrites)
```

Useful URL flags for testing: `?quality=low|medium|high` forces a quality tier, `?nowebgl` forces the no-WebGL fallback.

### Automated QA

`scripts/qa.mjs` drives Chromium (SwiftShader WebGL) through every route, the viewer, globe, booking flow,
responsive widths, mobile menu, no-WebGL fallback, reduced motion and GPU-resource disposal.
Playwright is intentionally **not** a project dependency:

```bash
npm i -D playwright && npx playwright install chromium
npm run build && npx vite preview --port 4173 &
npm run qa           # screenshots → .qa-screens/
```

## Architecture

```
src/
  App.tsx                      routes (secondary pages code-split)
  main.tsx, index.css          entry, Tailwind theme tokens (brand palette, type)
  animations/
    cameraSequences.ts         hero + sequence A–E camera/aircraft keyframes
    flightRig.ts               mutable rig shared by GSAP (writer) and render loop (reader)
    heroAnimation.ts           7-step intro timeline
    scrollFlight.ts            ScrollTrigger timeline (+ reduced-motion "cuts" mode)
  three/                       ← all 3D, no page UI
    aircraft/geometry.ts       procedural fuselage (lathe), lofted airfoil wings/tail, nacelles, fans
    aircraft/livery.ts         original livery painted to canvas textures
    aircraft/aircraftConfig.ts GLB swap-in configuration (asset pipeline)
    AircraftModel.tsx          assembles the aircraft / or loads the GLB; materials, lights, gear
    AircraftControls.tsx       limited OrbitControls + imperative API (views, rotate, zoom, reset)
    AircraftScene.tsx          <SceneCanvas>: DPR tiers, PerformanceMonitor, context-loss recovery
    CinematicFlight.tsx        home scene; damps camera/aircraft toward the rig every frame
    HomeStage.tsx              lazily-loaded home canvas (keeps three.js out of the main bundle)
    CloudEnvironment.tsx       instanced clouds, shader cloud-sea, light rays
    SkyDome.tsx, SceneLighting.tsx, environmentConfig.ts, shaders.ts
    EarthGlobe.tsx, FlightRoutes.tsx
    CabinScene.tsx             procedural cabin (First suites, Business pods, instanced Economy rows)
    FleetShowcase.tsx          3D turntable for the fleet page
    AmbientFlightScene.tsx     lazily-loaded ambient flight for About / Booking (pauses off-screen)
  components/
    navigation/ layout/ ui/ booking/ destinations/ fleet/ viewer/ fallback/
  pages/        Home, Destinations, Fleet, Experience, Booking, About, NotFound
  data/         destinations.ts, fleet.ts, flights.ts   (fictional demo data)
  services/     bookingService.ts  (FlightSearchProvider interface + DemoFlightProvider)
  hooks/        useQuality, useReducedMotion, useWebGL, useDocumentMeta
  utils/        math.ts (pure), geo.ts (three-dependent), quality.ts, webgl.ts
```

### Key design decisions

- **One rig, no teleporting.** GSAP never touches the camera directly. The intro and the scroll timeline tween a plain
  object (`FlightRig`); `CinematicFlight` damps the real camera and aircraft toward it each frame
  (critically damped `1 - e^(-λ·dt)`). Fast scrolling, reversal or resizing therefore always produce continuous motion.
- **No React state per frame.** Animation values live in refs / the rig. React only re-renders on discrete events
  (viewer open, section visibility).
- **Render loop is paused** (`frameloop="never"`) when the cinematic section is scrolled past or the viewer is open.
- **Reduced motion:** no intro choreography, no idle motion or parallax; scroll sections *cut* to their framing instead
  of moving the camera; viewer camera transitions are instant; clouds stop drifting.
- **Quality tiers** (`utils/quality.ts`) choose DPR range, fuselage segments, livery texture size, cloud count and light
  rays from cores / memory / pointer / screen size; drei `PerformanceMonitor` then adapts DPR at runtime.
- **WebGL fallback:** if WebGL is unavailable every page still works — the hero shows an SVG illustration, the globe a
  lightweight gradient sphere, and the destinations list, booking and navigation are fully functional.
- **Context loss:** `SceneCanvas` prevents default on `webglcontextlost`, shows "Restoring 3D view…", remounts on
  `webglcontextrestored`, and falls back to the static view after three losses.
- **Disposal:** every geometry/material/texture created in `useMemo` is disposed on unmount; R3F disposes the renderer
  and forces context loss when a Canvas unmounts (verified by the QA disposal cycles).

### Booking architecture

The UI depends only on `FlightSearchProvider` (`services/bookingService.ts`). The portfolio build uses
`DemoFlightProvider`, which deterministically generates **fictional** offers locally (with simulated latency and abort
support). To integrate a real airline API, implement the interface (e.g. an NDC/GDS-backed `ApiFlightProvider`) and
return it from `getFlightProvider()` — no component changes needed. No payment code exists.

## Asset pipeline

See **ASSET_REQUIREMENTS.md** for full specifications. In short:

- The aircraft is **procedural** today (honestly labelled as such in the viewer). To use a production model, drop a GLB
  into `public/models/` and set `AIRCRAFT_MODEL.url` in `src/three/aircraft/aircraftConfig.ts`. Draco and KTX2/Basis
  decoders are self-hosted in `public/decoders/` and wired into the loader.
- Destination, cabin and About imagery is AI-generated (labelled on screen) and lives in `public/images/`. Replace a file
  with licensed photography at the same path, or change `image` in `src/data/destinations.ts` / `src/pages/Experience.tsx`.
- Earth textures live in `public/textures/earth/` (see licensing note).

## Deployment

The app is a static SPA (`dist/`). `public/_redirects` provides the SPA fallback for Netlify.

- **Netlify (this repository):** `netlify-build.sh` at the repo root builds `aeronix/` when the Netlify site name
  contains `aeronix`. Create a Netlify site from this repo named e.g. `aeronix-airways` — no other change needed.
- **Any static host:** `npm ci && npm run build`, publish `aeronix/dist`, and rewrite all paths to `/index.html`.
- Update the canonical/OG base URL (`https://aeronix.example`) in `index.html`, `src/hooks/useDocumentMeta.ts`,
  `public/robots.txt` and `public/sitemap.xml` to the production domain.

## Accessibility

Semantic landmarks, skip link, one `h1` per route, focus moved to `<main>` on navigation, visible `:focus-visible`
rings, labelled icon buttons, `aria-pressed` toggles, modal viewer with focus trap / Escape / focus return, keyboard
control of the viewer (arrows, + / −, R, G), keyboard-accessible destination list as the alternative to the globe,
form validation with `aria-invalid` + `aria-describedby` + `role="alert"`, and `prefers-reduced-motion` support.
