import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Box } from 'lucide-react';
import { createFlightRig } from '../animations/flightRig';
import { playHeroIntro } from '../animations/heroAnimation';
import { createScrollFlight, ScrollTrigger } from '../animations/scrollFlight';
import { useQuality } from '../hooks/useQuality';
import { useWebGL } from '../hooks/useWebGL';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Button, ButtonLink } from '../components/ui/Button';
import { WebGLFallbackHero } from '../components/fallback/WebGLFallbackHero';
import { HomeTeasers } from '../components/layout/HomeTeasers';

const AircraftViewer = lazy(() => import('../components/viewer/AircraftViewer'));
const HomeStage = lazy(() => import('../three/HomeStage'));

const SEQUENCES = [
  {
    id: 'takeoff',
    eyebrow: 'Sequence A · Above the clouds',
    title: 'Altitude, redefined.',
    body: 'Climb through the weather into a quieter sky. Every AERONIX journey begins where the clouds end.',
    side: 'left',
  },
  {
    id: 'fuselage',
    eyebrow: 'Sequence B · Close-up flight',
    title: 'Crafted in every line.',
    body: 'A pearl-white fuselage, deep navy underbelly and a fine thread of champagne gold — an original livery for a new kind of airline.',
    side: 'right',
  },
  {
    id: 'wing',
    eyebrow: 'Sequence C · Wing experience',
    title: 'Engineered to glide.',
    body: 'Swept wings, raked winglets and high-bypass engines shape an aircraft designed to be felt as much as seen.',
    side: 'left',
  },
  {
    id: 'clouds',
    eyebrow: 'Sequence D · Above the clouds',
    title: 'Space to breathe.',
    body: 'Thirty-nine thousand feet of calm. Time slows, the horizon widens, and the journey becomes the destination.',
    side: 'right',
  },
] as const;

export default function Home() {
  useDocumentMeta(
    'Home',
    'AERONIX AIRWAYS — a fictional premium airline. Experience a cinematic, interactive 3D flight above the clouds.',
    '/',
  );
  const quality = useQuality();
  const webgl = useWebGL();
  const [rig] = useState(() => createFlightRig(quality.reducedMotion));
  const heroRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [inView, setInView] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const introStarted = useRef(false);

  // Hero intro — starts when the aircraft has rendered, or after a short timeout so content never waits on 3D.
  const startIntro = useCallback(() => {
    if (introStarted.current || !heroRef.current) return;
    introStarted.current = true;
    // Without WebGL there is nothing to reveal: show the content immediately.
    playHeroIntro(rig, heroRef.current, quality.reducedMotion || !webgl);
  }, [rig, quality.reducedMotion, webgl]);

  useEffect(() => {
    if (sceneReady) startIntro();
  }, [sceneReady, startIntro]);

  useEffect(() => {
    const t = window.setTimeout(startIntro, webgl ? 2600 : 0);
    return () => window.clearTimeout(t);
  }, [startIntro, webgl]);

  // Make sure the navigation is visible again when leaving the page mid-intro.
  useEffect(
    () => () => {
      const nav = document.querySelector<HTMLElement>('[data-nav]');
      if (nav) {
        nav.style.opacity = '';
        nav.style.visibility = '';
        nav.style.transform = '';
      }
    },
    [],
  );

  // Scroll-driven flight
  useLayoutEffect(() => {
    const trigger = flightRef.current;
    if (!trigger) return;
    const sections = sectionRefs.current.filter((s): s is HTMLElement => !!s);
    const cleanup = createScrollFlight(rig, {
      trigger,
      sections,
      reduced: quality.reducedMotion,
      simplified: quality.tier === 'low',
    });
    const visibility = ScrollTrigger.create({
      trigger,
      start: 'top top',
      end: 'bottom top',
      onToggle: (self) => setInView(self.isActive),
    });
    return () => {
      cleanup();
      visibility.kill();
    };
  }, [rig, quality.reducedMotion, quality.tier]);

  // Pointer parallax (writes to the rig, no React state)
  useEffect(() => {
    if (quality.reducedMotion || quality.tier === 'low') return;
    const onMove = (e: PointerEvent) => {
      rig.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      rig.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [rig, quality.reducedMotion, quality.tier]);

  const onReady = useCallback(() => setSceneReady(true), []);

  return (
    <>
      <div ref={flightRef} className="relative">
        {/* Fixed cinematic stage */}
        <div className="pointer-events-none fixed inset-0 z-0">
          {webgl ? (
            <Suspense fallback={<div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-900 to-aviation" />}>
              <HomeStage rig={rig} quality={quality} paused={viewerOpen || !inView} onReady={onReady} />
            </Suspense>
          ) : (
            <WebGLFallbackHero />
          )}
          {/* legibility gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/75 via-navy-950/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-navy-950/80 to-transparent" />
        </div>

        {/* HERO */}
        <section ref={heroRef} aria-labelledby="hero-title" className="relative z-10 flex min-h-[100svh] items-end">
          <div className="mx-auto w-full max-w-[1600px] px-5 pb-20 pt-32 md:px-10 md:pb-24">
            <p data-intro="eyebrow" className="eyebrow intro-hidden flex items-center gap-4">
              <span className="h-px w-10 bg-gold" aria-hidden="true" />
              Aeronix Airways
            </p>
            <h1
              id="hero-title"
              data-intro="headline"
              className="display intro-hidden mt-6 max-w-[14ch] text-[clamp(3rem,8.2vw,8.4rem)] text-cloud"
            >
              Beyond the ordinary.
            </h1>
            <p data-intro="sub" className="intro-hidden mt-6 max-w-md text-lg text-silver md:text-xl">
              Discover a new dimension of travel.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <span data-intro="cta" className="intro-hidden">
                <ButtonLink to="/destinations" size="lg" icon={<ArrowRight size={16} />}>
                  Explore destinations
                </ButtonLink>
              </span>
              <span data-intro="cta" className="intro-hidden">
                <ButtonLink to="/fleet" variant="ghost" size="lg">
                  Discover our fleet
                </ButtonLink>
              </span>
              {webgl ? (
                <span data-intro="cta" className="intro-hidden">
                  <Button variant="gold" size="lg" icon={<Box size={16} />} onClick={() => setViewerOpen(true)}>
                    Explore aircraft
                  </Button>
                </span>
              ) : null}
            </div>
          </div>
          <div
            data-intro="meta"
            className="intro-hidden absolute bottom-8 right-5 hidden items-center gap-3 text-[0.62rem] uppercase tracking-[0.28em] text-silver md:right-10 md:flex"
          >
            Scroll to begin the journey <ChevronDown size={14} className="animate-bounce" aria-hidden="true" />
          </div>
        </section>

        {/* SCROLL SEQUENCES A–D */}
        {SEQUENCES.map((s, i) => (
          <section
            key={s.id}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            aria-label={s.title}
            className="relative z-10 flex min-h-[100svh] items-center"
          >
            <div
              className={`mx-auto flex w-full max-w-[1600px] px-5 md:px-10 ${s.side === 'right' ? 'justify-end' : 'justify-start'}`}
            >
              <div data-caption className="glass max-w-md rounded-2xl p-7 md:p-9">
                <p className="eyebrow">{s.eyebrow}</p>
                <h2 className="display mt-5 text-4xl md:text-6xl">{s.title}</h2>
                <p className="mt-5 leading-relaxed text-silver">{s.body}</p>
              </div>
            </div>
          </section>
        ))}

        {/* SEQUENCE E — final reveal */}
        <section
          ref={(el) => {
            sectionRefs.current[SEQUENCES.length] = el;
          }}
          aria-labelledby="reveal-title"
          className="relative z-10 flex min-h-[100svh] items-center"
        >
          <div data-caption className="mx-auto w-full max-w-[1600px] px-5 text-center md:px-10">
            <p className="eyebrow">Sequence E · Final reveal</p>
            <h2 id="reveal-title" className="display mx-auto mt-6 max-w-[16ch] text-[clamp(2.8rem,8vw,8rem)]">
              The world is yours to discover.
            </h2>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink to="/booking" size="lg" icon={<ArrowRight size={16} />}>
                Book a flight
              </ButtonLink>
              {webgl ? (
                <Button variant="ghost" size="lg" icon={<Box size={16} />} onClick={() => setViewerOpen(true)}>
                  Explore aircraft
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <HomeTeasers />

      <Suspense fallback={null}>{viewerOpen ? <AircraftViewer open={viewerOpen} onClose={() => setViewerOpen(false)} /> : null}</Suspense>
    </>
  );
}
