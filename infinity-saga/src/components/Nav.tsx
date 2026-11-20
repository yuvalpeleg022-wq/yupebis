import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const LINKS = [
  ['Gauntlet', '#hero'],
  ['Stones', '#stones'],
  ['Timeline', '#timeline'],
  ['Gallery', '#gallery'],
  ['Multiverse', '#multiverse'],
  ['Legends', '#characters'],
  ['Snap', '#finale'],
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const on = () => {
      setSolid(window.scrollY > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${solid ? 'bg-void/70 backdrop-blur-md' : ''}`}>
      <div className="section-pad flex h-16 items-center justify-between">
        <a href="#hero" className="group flex items-baseline gap-3" aria-label="The Infinity Saga — back to top">
          <span className="display text-2xl gold-text">The Infinity Saga</span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.3em] text-mist sm:inline">Fan concept</span>
        </a>
        <nav className="hidden lg:block" aria-label="Sections">
          <ul className="flex items-center gap-7">
            {LINKS.map(([l, h]) => (
              <li key={h}>
                <a href={h} className="font-mono text-[11px] uppercase tracking-[0.28em] text-mist transition hover:text-gold focus-visible:text-gold">{l}</a>
              </li>
            ))}
          </ul>
        </nav>
        <button className="lg:hidden rounded-full p-2 text-bone" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <div className="h-px w-full bg-white/5">
        <div className="h-px origin-left bg-gradient-to-r from-ember via-gold to-soul" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Sections"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="lg:hidden section-pad bg-void/95 backdrop-blur-xl pb-8 pt-4"
          >
            <ul className="flex flex-col gap-1">
              {LINKS.map(([l, h], i) => (
                <li key={h}>
                  <a href={h} onClick={() => setOpen(false)} className="flex items-baseline gap-4 py-2">
                    <span className="font-mono text-[10px] text-mist">0{i + 1}</span>
                    <span className="display text-4xl text-bone">{l}</span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
