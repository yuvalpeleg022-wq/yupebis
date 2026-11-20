import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { STONES } from '../data/stones';
import { useQuality } from '../hooks/useQuality';
import { useInView } from '../hooks/useInView';
import { SceneCanvas } from '../three/SceneCanvas';
import { SectionHeading } from '../components/SectionHeading';
import { StaticCosmos } from '../components/StaticCosmos';

const StonesScene = lazy(() => import('../three/StonesScene'));

export default function StonesSection() {
  const q = useQuality();
  const { ref, visible, seen } = useInView<HTMLDivElement>('300px');
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const stone = selected != null ? STONES[selected] : null;

  return (
    <section id="stones" className="relative py-24 sm:py-32" aria-labelledby="stones-title">
      <div className="section-pad">
        <SectionHeading index="01" eyebrow="Chapter I" title={<span id="stones-title">The <span className="gold-text">Six Stones</span></span>}>
          Remnants of six singularities that existed before the universe began. Hover to awaken a stone, select one to travel to it.
        </SectionHeading>
      </div>

      <div ref={ref} className="relative mt-12 h-[88svh] min-h-[560px] w-full overflow-hidden border-y hairline">
        {seen && q.webgl ? (
          <SceneCanvas active={visible} className="absolute inset-0" camera={{ position: [0, 0.6, 14], fov: 40 }} label="Six Infinity Stones, each in its own environment. Use the buttons below to select one.">
            <Suspense fallback={null}>
              <StonesScene selected={selected} hovered={hovered} onHover={setHovered} onSelect={(i) => setSelected((s) => (s === i ? null : i))} />
            </Suspense>
          </SceneCanvas>
        ) : (
          <StaticCosmos note={!q.webgl} />
        )}

        {/* Accessible stone selector (also the primary control on touch) */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-void via-void/70 to-transparent pt-16 pb-5">
          <ul className="section-pad no-scrollbar flex gap-2 overflow-x-auto" role="list" aria-label="Choose an Infinity Stone">
            {STONES.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <button
                  className="chip flex items-center gap-2"
                  aria-pressed={selected === i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelected((x) => (x === i ? null : i))}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                  {s.domain}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Hover label */}
        <AnimatePresence>
          {hovered != null && selected == null && (
            <motion.p
              key={hovered}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 display text-4xl"
              style={{ color: STONES[hovered].color, textShadow: `0 0 30px ${STONES[hovered].color}` }}
            >
              {STONES[hovered].name}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          {stone && (
            <motion.aside
              key={stone.id}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute z-20 rounded-2xl border border-white/10 bg-ink/85 backdrop-blur-xl p-6 sm:p-8 inset-x-3 bottom-20 max-h-[52%] overflow-y-auto md:inset-x-auto md:right-8 md:top-8 md:bottom-24 md:max-h-none md:w-[420px]"
              style={{ boxShadow: `0 0 80px -20px ${stone.color}` }}
              aria-live="polite"
            >
              <button onClick={() => setSelected(null)} className="absolute right-4 top-4 rounded-full p-1.5 text-mist hover:text-bone" aria-label="Close stone details"><X size={18} /></button>
              <p className="eyebrow" style={{ color: stone.color }}>{stone.vessel}</p>
              <h3 className="display mt-2 text-5xl sm:text-6xl" style={{ color: stone.color }}>{stone.name}</h3>
              <dl className="mt-6 space-y-5 text-sm leading-relaxed">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist">Color</dt>
                  <dd className="mt-1 flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: stone.color }} />{stone.color.toUpperCase()}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist">Power</dt>
                  <dd className="mt-1 text-bone/90">{stone.power}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist">History</dt>
                  <dd className="mt-1 text-bone/80">{stone.history}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist">Cinematic appearances</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {stone.appearances.map((a) => (
                      <span key={a} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-bone/80">{a}</span>
                    ))}
                  </dd>
                </div>
              </dl>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
