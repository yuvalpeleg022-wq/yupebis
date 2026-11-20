import { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { FILMS, PHASE_META, type Film, type Phase, type StoneId } from '../data/films';
import { STONES } from '../data/stones';
import { Poster } from '../components/Poster';
import { MovieDetail } from '../components/MovieDetail';
import { SectionHeading } from '../components/SectionHeading';

type PhaseFilter = Phase | 'all';
const FRANCHISES = ['All', 'Avengers', 'Iron Man', 'Captain America', 'Thor', 'Spider-Man', 'Guardians', 'Ant-Man', 'Doctor Strange', 'Black Panther'] as const;

export default function Gallery() {
  const [phase, setPhase] = useState<PhaseFilter>('all');
  const [franchise, setFranchise] = useState<(typeof FRANCHISES)[number]>('All');
  const [stone, setStone] = useState<StoneId | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Film | null>(null);

  const films = useMemo(() => FILMS.filter((f) => {
    if (phase !== 'all' && f.phase !== phase) return false;
    if (franchise !== 'All' && !f.title.toLowerCase().includes(franchise.toLowerCase())) return false;
    if (stone && !f.stones?.includes(stone)) return false;
    if (query && !(`${f.title} ${f.characters.join(' ')}`.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [phase, franchise, stone, query]);

  return (
    <section id="gallery" className="section-pad relative py-24 sm:py-32" aria-labelledby="gallery-title">
      <SectionHeading index="03" eyebrow="Chapter III" title={<span id="gallery-title">The <span className="gold-text">Archive</span></span>}>
        Every film, filterable by phase, franchise and the stones they carry.
      </SectionHeading>

      <div className="mt-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by phase">
          <button className="chip" aria-pressed={phase === 'all'} onClick={() => setPhase('all')}>All phases</button>
          {([1, 2, 3, 4, 5, 6] as Phase[]).map((p) => (
            <button key={p} className="chip" aria-pressed={phase === p} onClick={() => setPhase(p)}>{PHASE_META[p].label}</button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by franchise">
          {FRANCHISES.map((f) => (
            <button key={f} className="chip shrink-0" aria-pressed={franchise === f} onClick={() => setFranchise(f)}>{f}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by Infinity Stone">
          {STONES.map((s) => (
            <button key={s.id} className="chip flex items-center gap-1.5" aria-pressed={stone === s.id} onClick={() => setStone((x) => (x === s.id ? null : s.id))}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.domain}
            </button>
          ))}
          <label className="relative ml-auto w-full sm:w-64">
            <span className="sr-only">Search films or characters</span>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or character"
              className="w-full rounded-full border border-white/15 bg-transparent py-2 pl-9 pr-3 text-sm text-bone placeholder:text-mist/70 focus:border-gold focus:outline-none"
            />
          </label>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-mist" aria-live="polite">{films.length} titles</p>
      </div>

      <LayoutGroup>
        <motion.ul layout className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {films.map((f, i) => (
              <motion.li
                key={f.slug} layout
                initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.02, 0.3), ease: [0.16, 1, 0.3, 1] }}
              >
                <button onClick={() => setOpen(f)} className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold rounded-lg" aria-label={`${f.title} (${f.year}) — view details`}>
                  <div className="relative overflow-hidden rounded-lg">
                    <Poster film={f} className="aspect-[2/3] w-full transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-110" />
                    <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10 transition group-hover:ring-gold/60" />
                    <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-void to-transparent p-3 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold">View</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-tight text-bone">{f.title}</p>
                  <p className="font-mono text-[10px] text-mist">{f.year} · {PHASE_META[f.phase].label}</p>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>
      {films.length === 0 && <p className="mt-10 text-mist">No films match these filters.</p>}
      <MovieDetail film={open} onClose={() => setOpen(null)} />
    </section>
  );
}
