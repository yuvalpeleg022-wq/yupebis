import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ChevronDown, Box } from 'lucide-react';
import { useQuality } from '../hooks/useQuality';
import { useInView } from '../hooks/useInView';
import { scrollState } from '../lib/scroll';
import { STONES } from '../data/stones';
import { HERO_MODEL } from '../config/assets';
import { SceneCanvas } from '../three/SceneCanvas';
import { heroStoneIntensity } from '../lib/choreography';
import { StaticCosmos } from '../components/StaticCosmos';

const HeroScene = lazy(() => import('../three/HeroScene'));

/**
 * The hero is a 600vh scroll track with a sticky full-screen canvas.
 * ScrollTrigger maps the track to scrollState.hero (0 → 1); the 3D camera
 * and the DOM title beats both read from it.
 */
export function Hero() {
  const q = useQuality();
  const track = useRef<HTMLDivElement>(null);
  const { ref: stickyRef, visible } = useInView<HTMLDivElement>('0px');
  const stoneDots = useRef<(HTMLLIElement | null)[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!track.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: track.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: q.reducedMotion ? true : 0.6,
          onUpdate: (self) => {
            scrollState.hero = self.progress;
            stoneDots.current.forEach((el, i) => {
              if (el) el.style.setProperty('--lit', heroStoneIntensity(i, self.progress).toFixed(3));
            });
          },
        },
      });
      // Title beats — each fades/drifts in and out over its slice of the track
      tl.to('[data-beat="title"]', { opacity: 0, y: -60, filter: 'blur(8px)', duration: 0.12 }, 0.06)
        .fromTo('[data-beat="origin"]', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.06 }, 0.13)
        .to('[data-beat="origin"]', { opacity: 0, y: -40, duration: 0.06 }, 0.24)
        .fromTo('[data-beat="stones"]', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.05 }, 0.22)
        .to('[data-beat="stones"]', { opacity: 0, x: -30, duration: 0.05 }, 0.62)
        .fromTo('[data-beat="bay"]', { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.42)
        .to('[data-beat="bay"]', { opacity: 0, duration: 0.05 }, 0.6)
        .fromTo('[data-beat="orbit"]', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.06 }, 0.66)
        .to('[data-beat="orbit"]', { opacity: 0, y: -40, duration: 0.06 }, 0.82)
        .fromTo('[data-beat="next"]', { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.06 }, 0.88)
        .to('[data-beat="cue"]', { opacity: 0, duration: 0.04 }, 0.02);
    }, track);
    return () => ctx.revert();
  }, [q.reducedMotion]);

  return (
    <section id="hero" ref={track} className="relative h-[600vh]" aria-label="Opening: the Infinity Stones">
      <div ref={stickyRef} className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {q.webgl ? (
          <SceneCanvas active={visible} className="absolute inset-0" label="A red-and-gold artifact carrying six glowing Infinity Stones floats in a dark nebula; the camera moves with your scroll.">
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          </SceneCanvas>
        ) : (
          <StaticCosmos />
        )}

        {/* Letterbox bars for the cinematic open */}
        <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-[7vh] bg-void transition-transform duration-[1600ms] ease-out ${ready ? '-translate-y-full' : ''}`} />
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[7vh] bg-void transition-transform duration-[1600ms] ease-out ${ready ? 'translate-y-full' : ''}`} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(3,3,6,0.75)_100%)]" />

        {/* Beat 1 — title */}
        <div data-beat="title" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-[16vh] text-center section-pad">
          <p className={`eyebrow transition-all duration-1000 delay-300 ${ready ? 'opacity-100' : 'opacity-0 translate-y-3'}`}>An unofficial fan experience</p>
          <h1 className={`display mt-4 text-[17vw] sm:text-[13vw] lg:text-[10.5vw] transition-all duration-[1400ms] delay-500 ${ready ? 'opacity-100' : 'opacity-0 translate-y-6 blur-sm'}`}>
            <span className="block ember-text">Marvel</span>
            <span className="block gold-text text-[0.42em] tracking-[0.18em] -mt-[0.1em]">— The Infinity Saga —</span>
          </h1>
          <p className={`mt-6 font-mono text-[11px] sm:text-xs uppercase tracking-[0.4em] text-bone/80 transition-all duration-1000 delay-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}>
            One universe. Six stones. Infinite possibilities.
          </p>
        </div>

        {/* Beat 2 — origin */}
        <div data-beat="origin" className="pointer-events-none absolute inset-0 flex items-center section-pad opacity-0">
          <div className="max-w-xl">
            <p className="eyebrow">2008 — 2019</p>
            <p className="mt-4 font-serif text-3xl sm:text-5xl leading-[1.05] text-bone">
              Twenty-three films. <em className="text-gold">Six stones</em> scattered across the cosmos — and one decade spent gathering them.
            </p>
          </div>
        </div>

        {/* Beat 3 — stones ignite one by one */}
        <div data-beat="stones" className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 section-pad opacity-0">
          <p className="eyebrow mb-5">Awakening</p>
          <ul className="space-y-3">
            {STONES.map((s, i) => (
              <li
                key={s.id}
                ref={(el) => (stoneDots.current[i] = el)}
                className="flex items-center gap-4"
                style={{ ['--c' as string]: s.color, opacity: 'calc(0.25 + var(--lit, 0) * 0.75)' }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 calc(var(--lit, 0) * 18px) ${s.color}` }} />
                <span className="display text-2xl sm:text-3xl" style={{ color: s.color }}>{s.domain}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Beat 3b — licensed model slot notice (only without a model) */}
        {!HERO_MODEL.url && (
          <div data-beat="bay" className="pointer-events-none absolute bottom-[9vh] right-0 section-pad opacity-0">
            <div className="glass max-w-xs rounded-xl p-4">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gold"><Box size={14} /> Hero model slot</p>
              <p className="mt-2 text-xs leading-relaxed text-mist">
                The gold scanning bay marks where a licensed Iron&nbsp;Man + Gauntlet GLB will stand. No model with usage rights is bundled — the artifact shown is an original placeholder. See <code className="text-bone">ASSETS.md</code>.
              </p>
            </div>
          </div>
        )}

        {/* Beat 4 — orbit */}
        <div data-beat="orbit" className="pointer-events-none absolute inset-0 flex items-center justify-end section-pad opacity-0 text-right">
          <div className="max-w-lg">
            <p className="eyebrow">The cost</p>
            <p className="mt-4 font-serif text-3xl sm:text-5xl leading-[1.05]">
              Every stone carries a story — <span className="text-reality">and</span> a price.
            </p>
          </div>
        </div>

        {/* Beat 5 — handoff */}
        <div data-beat="next" className="absolute inset-0 flex flex-col items-center justify-center text-center section-pad opacity-0">
          <p className="eyebrow">Chapter I</p>
          <p className="display mt-3 text-6xl sm:text-8xl gold-text">The Six Stones</p>
          <a href="#stones" className="btn mt-8 pointer-events-auto">Enter <ChevronDown size={14} /></a>
        </div>

        <div data-beat="cue" className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-mist">
          <span className="font-mono text-[10px] uppercase tracking-[0.35em]">Scroll</span>
          <span className="h-10 w-px bg-gradient-to-b from-gold to-transparent animate-pulse" />
        </div>
      </div>
    </section>
  );
}
