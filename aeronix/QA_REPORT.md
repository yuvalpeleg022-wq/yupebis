# QA REPORT — AERONIX AIRWAYS

Date: 2026-11-19 · Build: production (`npm run build`, served with `vite preview`)
Environment: Linux container, headless Chromium (Playwright) with **SwiftShader software WebGL** — no physical GPU, no real phone.

## 1. Checks executed

| # | Check | Method | Result |
| --- | --- | --- | --- |
| 1 | Dependency install / peer compatibility | `npm install` | ✅ 0 peer conflicts, 0 vulnerabilities |
| 2 | TypeScript (strict + `noUncheckedIndexedAccess`) | `tsc -b` | ✅ 0 errors |
| 3 | Production build | `vite build` | ✅ succeeds (~1 s) |
| 4 | Automated suite (`scripts/qa.mjs`) | Playwright, 60 checks | ✅ **60 / 60 passed** (log below) |
| 5 | Visual review of hero, sequences A–E, viewer views, globe, booking, mobile, fallback | Screenshots inspected manually during development | ✅ issues found were fixed (see §3) |
| 6 | Netlify build script | `SITE_NAME=aeronix-airways bash netlify-build.sh` and `SITE_NAME=doom-site …` | ✅ aeronix builds & publishes `aeronix/dist`; existing doom/marvel branches unchanged |

The automated suite covers: every route (title, single `h1`, meta description, zero console errors/warnings);
home canvas + intro reveal + all five scroll sequences + final reveal copy; viewer open/preset views/mouse drag/
wheel zoom/keyboard (arrow, G)/reset/Escape-close with canvas disposal; globe selection via list (URL + panel update)
for two cities; booking pre-selection, every validation rule, passenger limits, demo results and no-payment
confirmation; horizontal-overflow check on all 6 content routes at 1920, 1440, 1024, 768, 390 and 360 px; mobile menu
`aria-expanded` + Escape; no-WebGL mode (`--disable-webgl`) for home, destinations and booking; reduced motion;
three mount/unmount cycles of the globe route (previous canvas disposed, no context-loss errors); 3D cabin on
Experience (renders, follows scroll, 4 images load), Fleet 3D showcase (renders, tab switch), ambient 3D on About and
Booking, and all 8 destination images loading.

### Automated log (final run)

```
    PASS  route /: title, single h1, meta description — title="AERONIX AIRWAYS — Beyond the Ordinary" h1=1
    PASS  route /: no console errors
    PASS  route /destinations: title, single h1, meta description — title="Destinations · AERONIX AIRWAYS" h1=1
    PASS  route /destinations: no console errors
    PASS  route /fleet: title, single h1, meta description — title="Our Fleet · AERONIX AIRWAYS" h1=1
    PASS  route /fleet: no console errors
    PASS  route /experience: title, single h1, meta description — title="Experience · AERONIX AIRWAYS" h1=1
    PASS  route /experience: no console errors
    PASS  route /booking: title, single h1, meta description — title="Book a flight · AERONIX AIRWAYS" h1=1
    PASS  route /booking: no console errors
    PASS  route /about: title, single h1, meta description — title="About · AERONIX AIRWAYS" h1=1
    PASS  route /about: no console errors
    PASS  route /does-not-exist: title, single h1, meta description — title="Page not found · AERONIX AIRWAYS" h1=1
    PASS  route /does-not-exist: no console errors
    PASS  home: WebGL canvas rendered
    PASS  home: intro reveals headline — opacity=1
    PASS  home: final reveal copy visible
    PASS  viewer: opens as modal dialog with second canvas
    PASS  viewer: keyboard G toggles landing gear
    PASS  viewer: Escape closes and disposes its canvas
    PASS  home flow: no console errors
    PASS  globe: selecting Tokyo updates URL and panel
    PASS  globe: no console errors
    PASS  booking: ?to= preselects destination
    PASS  booking: validation blocks empty destination
    PASS  booking: origin = destination rejected
    PASS  booking: past date rejected
    PASS  booking: return auto-moves to stay on/after departure — return=2026-12-10
    PASS  booking: return before departure rejected
    PASS  booking: infants limited to number of adults
    PASS  booking: demo results rendered with clear demo labelling — 3 offers
    PASS  booking: selection shows no-payment confirmation
    PASS  booking: no console errors
    PASS  responsive 1920×1080: all routes checked for horizontal overflow
    PASS  responsive 1440×900: all routes checked for horizontal overflow
    PASS  responsive 1024×768: all routes checked for horizontal overflow
    PASS  responsive 768×1024: all routes checked for horizontal overflow
    PASS  responsive 390×844: all routes checked for horizontal overflow
    PASS  responsive 360×740: all routes checked for horizontal overflow
    PASS  mobile menu: opens (aria-expanded) and closes with Escape
    PASS  no-WebGL: home shows illustrated fallback, no canvas
    PASS  no-WebGL: headline + CTAs visible
    PASS  no-WebGL: destinations list still works
    PASS  no-WebGL: booking form available
    PASS  no-WebGL: no console errors
    PASS  reduced motion: content visible immediately (no intro wait) — opacity=1
    PASS  reduced motion: no console errors
    PASS  disposal cycle 1: previous route's canvas disposed
    PASS  disposal cycle 2: previous route's canvas disposed
    PASS  disposal cycle 3: previous route's canvas disposed
    PASS  disposal: no context-loss / console errors across remounts
    PASS  experience: 3D cabin canvas rendered
    PASS  experience: 4 cabin images loaded — 4 loaded
    PASS  experience: scrolling switches the 3D zone caption
    PASS  fleet: 3D showcase canvas rendered
    PASS  fleet: tab switches showcase aircraft
    PASS  /about: ambient 3D canvas rendered
    PASS  /booking: ambient 3D canvas rendered
    PASS  destinations: 8 city images loaded — 8 loaded
    PASS  new 3D pages: no console errors
    
    60/60 checks passed
```

## 2. Not executed / not verifiable here

- **Real GPU performance and frame rate.** All rendering ran on SwiftShader (CPU), which is far slower than any real
  GPU, so FPS numbers from this environment would be meaningless and are not reported.
- **Real mobile devices** (iOS Safari, Android Chrome). Mobile was tested by viewport + touch emulation only.
- **Touch gestures on the 3D views** (pinch-zoom / one-finger orbit). OrbitControls supports them natively, but they
  were not exercised by the automated suite; mouse drag and wheel were.
- **Clicking globe markers with the pointer.** Selection was tested through the accessible destination list (which
  drives the same state); raycast clicks on markers were not automated.
- **Actual WebGL context loss / restore.** The handlers are implemented but loss was not force-triggered in tests.
- **GPU memory accounting.** Disposal was verified indirectly (canvas removed on route change, no errors over repeated
  remounts, every created resource has a `dispose()` in an unmount effect); `renderer.info` counters were not inspected.
- **Screen-reader pass** (NVDA / VoiceOver). Semantics were implemented and keyboard paths tested, but no assistive
  technology session was run.
- **Lighthouse / Core Web Vitals.** Not run.

## 3. Issues found during QA and fixed

| Issue | Fix |
| --- | --- |
| Winglets rendered ~5× too tall (dihedral used `tan`, not a rotation) | Length-preserving span vector `(0, sin d, cos d)` |
| Scene too bright/grey; hard horizon band between cloud-sea and sky | Darker palette; cloud-sea fog = sky horizon colour incl. identical sun-glow term; scene fog unified |
| Thin line under transparent navbar (background tiling into 1 px border) | `background-origin: border-box` |
| Hero aircraft overlapping headline / cropped | Re-framed hero shot; portrait-aware target & FOV for phones |
| Sequence B: engine blocked the fuselage wordmark | Raised camera |
| Globe: blown-out atmosphere, large specular smear, thick routes, too close | Rewrote atmosphere falloff, reduced sheen, thinner tubes, fly-to distance 7.4 |
| Per-render `material.clone()` leak on globe markers | Materials created once per marker and disposed |
| Horizontal overflow at 390/360 px (grid track sized by nowrap text) | `grid-cols-1` base on all breakpoint-only grids |
| Navbar "Book a flight" visible & wrapping on phones (`hidden` vs `inline-flex` conflict) | Wrapper element controls visibility |
| No-WebGL home waited for intro choreography | Intro skipped when there is no 3D to reveal |
| Return date silently overwritten when user entered one before departure | Auto-adjust only when departure changes; validation reports user errors |
| three.js (~380 kB) loaded on text-only routes via a utility import | Split `utils/math` (pure) and `utils/geo` (three); home 3D stage lazy-loaded |

## 4. Performance observations

- **Bundle (gzip):** main app ≈ 141 kB JS + 9.6 kB CSS (React, router, GSAP, UI). 3D runtime (three + R3F + drei) ≈ 246 kB in a
  lazily-loaded chunk, plus ≈ 73 kB for the cloud/environment module. Text-only routes (booking, about, experience,
  fleet list) do not download three.js. Viewer and globe chunks load on demand.
- **Static assets:** Earth textures ≈ 0.9 MB total (2048×1024 JPEGs, loaded only on /destinations). Fonts are
  self-hosted variable WOFF2.
- **Scene cost (by construction):** aircraft ≈ 30 meshes sharing ~15 materials; clouds are a single instanced mesh
  (≤ count × segments instances); sky and cloud-sea are one mesh each; no real-time shadows; no post-processing.
  Environment map is baked once (`frames={1}`).
- **Adaptive quality:** tier heuristics + `PerformanceMonitor` DPR adaptation; render loop paused when the cinematic
  section is off-screen or the viewer is open.
- **Console:** the only messages filtered by the suite are SwiftShader driver notices ("GPU stall due to ReadPixels")
  and a `THREE.Clock` deprecation warning emitted inside @react-three/fiber 9.8 (upstream, not from app code).

## 5. Known limitations

- The aircraft is a **procedural** model: convincing silhouette, PBR materials, livery, windows, engines and fans, but not
  a photoreal production asset. The GLB pipeline is ready (see ASSET_REQUIREMENTS.md); fan spin / gear / lights are not
  yet hooked up for GLB models.
- Fleet types other than the AX-950 are shown with the shared wide-body model (AX-1000 gets four engines) and labelled as representative.
- Destination, cabin and About images are AI-generated (labelled on screen); confirm commercial-use terms or replace.
- The 3D cabin is a stylised procedural concept (simple rounded forms), not a detailed interior model.
- Fleet showcase and viewer use the shared wide-body model for every type (scaled; four engines for the AX-1000).
- Earth texture provenance must be verified before commercial use.
- Demo flight times are displayed without time-zone conversion (stated in the UI).
- Canonical / OG URLs use the placeholder domain `aeronix.example`.

## 6. Remaining issues / recommended next steps

1. Test on real devices (mid-range Android, iPhone) and tune tier thresholds and cloud counts from measured FPS.
2. Commission / license the production GLB and hook node names to the existing animation logic.
3. Replace placeholder imagery and Earth textures with licensed assets.
4. Run Lighthouse and a screen-reader audit; add automated pointer tests for globe markers and touch gestures.
5. Set the production domain in meta tags, robots.txt and sitemap.xml.
