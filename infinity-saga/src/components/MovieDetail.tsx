import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Calendar, Users, Link2, Info } from 'lucide-react';
import { PHASE_META, type Film } from '../data/films';
import { STONE_BY_ID } from '../data/stones';
import { posterUrl, POSTER_NATIVE_WIDTH } from '../config/assets';
import { Poster } from './Poster';

export function MovieDetail({ film, onClose }: { film: Film | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!film) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; prev?.focus(); };
  }, [film, onClose]);

  const url = film ? posterUrl(film.poster) : null;

  return (
    <AnimatePresence>
      {film && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-labelledby="movie-title"
        >
          <div className="absolute inset-0 bg-void/85 backdrop-blur-md" onClick={onClose} />
          {url && <img src={url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-3xl" />}
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative m-0 flex max-h-[92svh] w-full max-w-4xl flex-col gap-6 overflow-y-auto rounded-t-2xl border hairline bg-ink/90 p-5 sm:m-6 sm:flex-row sm:rounded-2xl sm:p-8"
          >
            <button ref={closeRef} onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-void/60 p-2 text-mist hover:text-bone" aria-label="Close details"><X size={18} /></button>
            <div className="mx-auto w-44 shrink-0 sm:mx-0" style={{ maxWidth: POSTER_NATIVE_WIDTH }}>
              <Poster film={film} className="aspect-[2/3] w-full rounded-lg" />
              {url && <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mist">Reference thumbnail · shown at native size</p>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow" style={{ color: PHASE_META[film.phase].accent }}>{PHASE_META[film.phase].label} · {PHASE_META[film.phase].saga}</p>
              <h3 id="movie-title" className="display mt-2 text-5xl sm:text-6xl">{film.title}</h3>
              <p className="mt-2 flex items-center gap-2 font-mono text-xs text-mist">
                <Calendar size={13} /> {film.year}
                {film.status === 'announced' && <span className="ml-2 rounded-full border border-soul/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-soul">Upcoming · verify date</span>}
              </p>
              <p className="mt-5 text-base leading-relaxed text-bone/90">{film.summary}</p>
              {film.characters.length > 0 && (
                <div className="mt-6">
                  <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-mist"><Users size={12} /> Main characters</p>
                  <p className="mt-2 text-sm text-bone/80">{film.characters.join(' · ')}</p>
                </div>
              )}
              <div className="mt-6">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-mist"><Link2 size={12} /> Story connections</p>
                <ul className="mt-2 space-y-1.5 text-sm text-bone/80">
                  {film.connections.map((c) => <li key={c} className="flex gap-2"><span className="text-gold">—</span>{c}</li>)}
                </ul>
              </div>
              {film.stones && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {film.stones.map((s) => (
                    <span key={s} className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px]" style={{ color: STONE_BY_ID[s].color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STONE_BY_ID[s].color }} />{STONE_BY_ID[s].name}
                    </span>
                  ))}
                </div>
              )}
              {!url && <p className="mt-6 flex items-center gap-2 text-xs text-mist"><Info size={12} /> No licensed artwork registered for this title.</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
