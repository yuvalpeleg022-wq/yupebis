import { lazy, Suspense, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useQuality } from '../hooks/useQuality';
import { useInView } from '../hooks/useInView';
import { scrollState } from '../lib/scroll';
import { STONES } from '../data/stones';
import { SceneCanvas } from '../three/SceneCanvas';
import { finaleFlash, finaleStone } from '../lib/choreography';
import { StaticCosmos } from '../components/StaticCosmos';

const FinaleScene = lazy(() => import('../three/FinaleScene'));

export default function Finale() {
  const q = useQuality();
  const track = useRef<HTMLElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const { ref: stickyRef, visible, seen } = useInView<HTMLDivElement>('400px');

  useEffect(() => {
    if (!track.current) return;
    const ctx = gsap.context(() => {
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: track.current, start: 'top top', end: 'bottom bottom', scrub: q.reducedMotion ? true : 0.5,
          onUpdate: (s) => {
            const p = s.progress;
            scrollState.finale = p;
            // Reduced motion: no full-screen flash, just a soft glow
            const f = finaleFlash(p) * (q.reducedMotion ? 0.25 : 1);
            if (flash.current) flash.current.style.opacity = f.toFixed(3);
            dots.current.forEach((d, i) => d && d.style.setProperty('--lit', finaleStone(i, p).toFixed(3)));
          },
        },
      })
        .fromTo('[data-f="intro"]', { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.02)
        .to('[data-f="intro"]', { opacity: 0, duration: 0.05 }, 0.18)
        .fromTo('[data-f="dots"]', { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.18)
        .to('[data-f="dots"]', { opacity: 0, duration: 0.04 }, 0.7)
        .fromTo('[data-f="quote"]', { opacity: 0, letterSpacing: '0.6em', filter: 'blur(10px)' }, { opacity: 1, letterSpacing: '0.12em', filter: 'blur(0px)', duration: 0.08 }, 0.82)
        .to('[data-f="quote"]', { opacity: 0, y: -30, duration: 0.05 }, 0.92)
        .fromTo('[data-f="veil"]', { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.9)
        .fromTo('[data-f="title"]', { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.05 }, 0.94);
    }, track);
    return () => ctx.revert();
  }, [q.reducedMotion]);

  return (
    <section id="finale" ref={track} className="relative h-[520vh]" aria-label="The Final Snap">
      <div ref={stickyRef} className="sticky top-0 h-[100svh] overflow-hidden">
        {seen && q.webgl ? (
          <SceneCanvas active={visible} className="absolute inset-0" camera={{ position: [0, 0.4, 14], fov: 36 }} label="The six stones ignite in sequence and the screen fills with light.">
            <Suspense fallback={null}><FinaleScene /></Suspense>
          </SceneCanvas>
        ) : (
          <StaticCosmos note={!q.webgl} />
        )}

        {/* Stone-tinted white-out */}
        <div ref={flash} className="pointer-events-none absolute inset-0 z-10 opacity-0"
          style={{ background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #fff6e0 25%, rgba(255,138,31,0.85) 45%, rgba(164,59,255,0.7) 62%, rgba(47,123,255,0.6) 78%, rgba(34,229,138,0.5) 100%)' }} />

        <div data-f="intro" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center text-center section-pad opacity-0">
          <div>
            <p className="eyebrow">Chapter VI</p>
            <p className="display mt-3 text-7xl sm:text-9xl gold-text">The Final Snap</p>
          </div>
        </div>

        <div data-f="dots" className="pointer-events-none absolute inset-x-0 bottom-[12vh] z-20 flex justify-center gap-6 opacity-0">
          {STONES.map((s, i) => (
            <span key={s.id} ref={(el) => (dots.current[i] = el)} className="flex flex-col items-center gap-2"
              style={{ opacity: 'calc(0.2 + var(--lit, 0) * 0.8)' }}>
              <span className="h-3 w-3 rotate-45" style={{ background: s.color, boxShadow: `0 0 calc(var(--lit,0) * 24px) ${s.color}` }} />
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] sm:block" style={{ color: s.color }}>{s.domain}</span>
            </span>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center text-center section-pad">
          <p data-f="quote" className="max-w-5xl font-serif text-4xl font-semibold uppercase text-void sm:text-6xl lg:text-7xl opacity-0" style={{ textShadow: '0 0 40px rgba(255,255,255,0.8)' }}>
            What is destiny, if not a choice?
          </p>
        </div>

        <div data-f="veil" className="pointer-events-none absolute inset-0 z-20 opacity-0 bg-[radial-gradient(ellipse_at_center,rgba(3,3,6,0.92)_0%,rgba(3,3,6,0.7)_45%,rgba(3,3,6,0.35)_100%)]" />
        <div data-f="title" className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center section-pad opacity-0">
          <p className="display text-[16vw] leading-[0.85] sm:text-[12vw] lg:text-[9vw]">
            <span className="block ember-text">Marvel</span>
            <span className="block gold-text text-[0.42em] tracking-[0.18em]">— The Infinity Saga —</span>
          </p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-mist">One universe · Six stones · Infinite possibilities</p>
          <a href="#hero" className="btn mt-10">Begin again</a>
        </div>
      </div>
    </section>
  );
}
