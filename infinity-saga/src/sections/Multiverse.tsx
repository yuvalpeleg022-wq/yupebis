import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { UNIVERSES } from '../data/universes';
import { useQuality } from '../hooks/useQuality';
import { useInView } from '../hooks/useInView';
import { SceneCanvas } from '../three/SceneCanvas';
import { SectionHeading } from '../components/SectionHeading';
import { StaticCosmos } from '../components/StaticCosmos';

const MultiverseScene = lazy(() => import('../three/MultiverseScene'));

export default function Multiverse() {
  const q = useQuality();
  const { ref, visible, seen } = useInView<HTMLDivElement>('300px');
  const [active, setActive] = useState(0);
  const u = UNIVERSES[active];
  const go = (d: number) => setActive((a) => (a + d + UNIVERSES.length) % UNIVERSES.length);

  return (
    <section id="multiverse" className="relative py-24 sm:py-32" aria-labelledby="mv-title">
      <div className="section-pad">
        <SectionHeading index="04" eyebrow="Chapter IV" title={<span id="mv-title">The <span style={{ color: '#a43bff' }}>Multiverse</span></span>}>
          Realities branch, collide and fold into one another. Travel between them — established canon is marked, fan theory is labelled as such.
        </SectionHeading>
      </div>

      <div ref={ref} className="relative mt-12 h-[90svh] min-h-[600px] overflow-hidden border-y hairline"
        onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }}>
        {seen && q.webgl ? (
          <SceneCanvas active={visible} className="absolute inset-0" camera={{ position: [0, 0.6, 9], fov: 42 }} label="Floating universes connected by energy rings. Use the controls to travel between them.">
            <Suspense fallback={null}><MultiverseScene active={active} onSelect={setActive} /></Suspense>
          </SceneCanvas>
        ) : (
          <StaticCosmos note={!q.webgl} />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/90 via-void/30 to-transparent md:bg-gradient-to-r md:from-void/85 md:via-void/40 md:to-transparent" />
        <AnimatePresence mode="wait">
          <motion.article
            key={u.id}
            initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -20, filter: 'blur(6px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-28 left-0 right-0 section-pad md:bottom-auto md:top-16 md:max-w-xl"
            aria-live="polite"
          >
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: u.color }}>
              {u.canon === 'established' ? <ShieldCheck size={13} /> : <Sparkles size={13} />}
              {u.canon === 'established' ? 'Established on screen' : 'Fan theory — unconfirmed'} · {u.designation}
            </p>
            <h3 className="display mt-3 text-6xl sm:text-7xl" style={{ textShadow: `0 0 40px ${u.color}66` }}>{u.name}</h3>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-bone/85 sm:text-base">{u.description}</p>
            <div className="mt-5 hidden gap-8 text-xs sm:flex">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist">Featured</p>
                <p className="mt-1 text-bone/80">{u.characters.join(' · ')}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist">Seen in</p>
                <p className="mt-1 text-bone/80">{u.works.join(' · ')}</p>
              </div>
            </div>
          </motion.article>
        </AnimatePresence>

        <div className="absolute inset-x-0 bottom-6 z-10 section-pad flex items-center justify-between gap-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Universes">
            {UNIVERSES.map((x, i) => (
              <button key={x.id} role="tab" aria-selected={i === active} onClick={() => setActive(i)}
                className="chip shrink-0" aria-pressed={i === active}>
                {x.name}
              </button>
            ))}
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button className="btn !px-3" onClick={() => go(-1)} aria-label="Previous universe"><ChevronLeft size={16} /></button>
            <button className="btn !px-3" onClick={() => go(1)} aria-label="Next universe"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
