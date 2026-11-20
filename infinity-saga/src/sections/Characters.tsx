import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Film as FilmIcon, UserRound } from 'lucide-react';
import { CHARACTERS, type Character } from '../data/characters';
import { portraitUrl } from '../config/assets';
import { SectionHeading } from '../components/SectionHeading';

/**
 * Portrait card. With a licensed portrait registered it shows the image;
 * otherwise an abstract, clearly-labelled light study in the character's palette.
 */
function Portrait({ c, active }: { c: Character; active: boolean }) {
  const url = portraitUrl(c.portrait);
  const [a, b] = c.palette;
  if (url) return <img src={url} alt={`${c.name} portrait`} loading="lazy" decoding="async" className="h-full w-full object-cover" />;
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: `radial-gradient(90% 70% at 50% 30%, ${a}55, #07070b 72%)` }}>
      <div className={`absolute left-1/2 top-[38%] h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-1000 ${active ? 'scale-110 opacity-80' : 'opacity-40'}`}
        style={{ background: `conic-gradient(from 210deg, ${a}, ${b}, ${a})` }} />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_4px)]" />
      <span className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 display text-[7rem] leading-none text-white/10 select-none" aria-hidden>
        {c.alias.split(' ').map((w) => w[0]).join('').slice(0, 2)}
      </span>
      <span className="absolute right-3 top-3 flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.2em] text-white/40"><UserRound size={10} /> Portrait slot</span>
    </div>
  );
}

export default function Characters() {
  const [active, setActive] = useState<string | null>(null);
  const sel = CHARACTERS.find((c) => c.id === active) ?? null;

  return (
    <section id="characters" className="section-pad relative py-24 sm:py-32" aria-labelledby="chars-title">
      <SectionHeading index="05" eyebrow="Chapter V" title={<span id="chars-title"><span className="ember-text">Legends</span></span>}>
        The heroes and the villain who defined a saga. Select a legend to open their file.
      </SectionHeading>

      <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {CHARACTERS.map((c, i) => (
          <motion.li key={c.id}
            initial={{ opacity: 0, y: 50, clipPath: 'inset(20% 0 0 0)' }}
            whileInView={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.9, delay: (i % 5) * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={() => setActive(c.id)}
              className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl text-left ring-1 ring-white/10 transition hover:ring-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              aria-label={`${c.name} — ${c.alias}. Open file`}
            >
              <div className="absolute inset-0 transition-transform duration-1000 ease-out group-hover:scale-105">
                <Portrait c={c} active={active === c.id} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: c.palette[1] }}>{c.alias}</p>
                <p className="display mt-1 text-3xl leading-[0.9] sm:text-4xl">{c.name}</p>
                <p className="mt-2 max-h-0 overflow-hidden text-xs leading-snug text-bone/70 opacity-0 transition-all duration-500 group-hover:max-h-16 group-hover:opacity-100">{c.line}</p>
              </div>
            </button>
          </motion.li>
        ))}
      </ul>

      <AnimatePresence>
        {sel && (
          <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-labelledby="char-title"
            onKeyDown={(e) => e.key === 'Escape' && setActive(null)}>
            <div className="absolute inset-0 bg-void/85 backdrop-blur-md" onClick={() => setActive(null)} />
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative grid max-h-[92svh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border hairline bg-ink sm:m-6 sm:grid-cols-[1fr_1.2fr] sm:rounded-2xl"
              style={{ boxShadow: `0 0 120px -30px ${sel.palette[0]}` }}
            >
              <div className="aspect-[4/3] sm:aspect-auto"><Portrait c={sel} active /></div>
              <div className="p-6 sm:p-8">
                <p className="eyebrow" style={{ color: sel.palette[1] }}>{sel.alias}</p>
                <h3 id="char-title" className="display mt-2 text-6xl">{sel.name}</h3>
                <p className="mt-3 font-serif text-xl italic text-bone/90">{sel.line}</p>
                <p className="mt-5 text-sm leading-relaxed text-bone/80">{sel.bio}</p>
                <p className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-mist"><FilmIcon size={12} /> Key appearances</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {sel.films.map((f) => <li key={f} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-bone/80">{f}</li>)}
                </ul>
                <button autoFocus onClick={() => setActive(null)} className="btn mt-8">Close file</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
