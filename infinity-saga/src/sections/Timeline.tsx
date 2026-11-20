import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FILMS, PHASE_META, type Film, type Phase } from '../data/films';
import { useQuality } from '../hooks/useQuality';
import { Poster } from '../components/Poster';
import { MovieDetail } from '../components/MovieDetail';
import { SectionHeading } from '../components/SectionHeading';

const PHASES: Phase[] = [1, 2, 3, 4, 5, 6];

function FilmCard({ film, onOpen }: { film: Film; onOpen: (f: Film) => void }) {
  return (
    <button
      onClick={() => onOpen(film)}
      data-film
      className="group relative w-[62vw] max-w-[240px] shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold sm:w-[220px]"
      aria-label={`${film.title}, ${film.year}. Open details`}
    >
      <div className="relative overflow-hidden rounded-lg">
        <Poster film={film} className="aspect-[2/3] w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/10 to-transparent opacity-80 transition-opacity group-hover:opacity-60" />
        <span className="absolute left-2 top-2 rounded-full bg-void/80 px-2 py-0.5 font-mono text-[10px] text-bone backdrop-blur">{film.year}</span>
      </div>
      <p className="display mt-3 text-2xl leading-[0.95] text-bone transition-colors group-hover:text-gold">{film.title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mist">{film.summary}</p>
    </button>
  );
}

export default function Timeline() {
  const q = useQuality();
  const pin = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Film | null>(null);
  const [horizontal, setHorizontal] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setHorizontal(mq.matches && !q.reducedMotion);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q.reducedMotion]);

  useEffect(() => {
    if (!horizontal || !pin.current || !rail.current) return;
    const ctx = gsap.context(() => {
      const r = rail.current!;
      const dist = () => r.scrollWidth - window.innerWidth;
      const tween = gsap.to(r, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin.current,
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          refreshPriority: 1,
        },
      });
      // Cards scale up and brighten as they cross the center of the screen
      gsap.utils.toArray<HTMLElement>('[data-film]').forEach((el) => {
        gsap.fromTo(el, { scale: 0.88, opacity: 0.45 }, {
          scale: 1, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: el, containerAnimation: tween, start: 'left 95%', end: 'left 55%', scrub: true },
        });
      });
      gsap.utils.toArray<HTMLElement>('[data-phase-title]').forEach((el) => {
        gsap.fromTo(el, { xPercent: 30, opacity: 0 }, {
          xPercent: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: el, containerAnimation: tween, start: 'left 100%', end: 'left 60%', scrub: true },
        });
      });
    }, pin);
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [horizontal]);

  return (
    <section id="timeline" className="relative pt-24 sm:pt-32" aria-labelledby="timeline-title">
      <div className="section-pad">
        <SectionHeading index="02" eyebrow="Chapter II" title={<span id="timeline-title">The <span className="ember-text">Timeline</span></span>}>
          From a cave in 2008 to the edge of the multiverse — six phases of the Marvel Cinematic Universe on the big screen.
        </SectionHeading>
      </div>

      <div ref={pin} className={`relative mt-12 ${horizontal ? 'h-[100svh] overflow-hidden' : ''}`}>
        <div
          ref={rail}
          className={horizontal ? 'flex h-full items-center gap-24 pl-16 pr-[30vw] will-change-transform' : 'flex flex-col gap-16 pb-24'}
        >
          {PHASES.map((ph) => {
            const meta = PHASE_META[ph];
            const films = FILMS.filter((f) => f.phase === ph);
            return (
              <div key={ph} className={horizontal ? 'flex shrink-0 items-center gap-10' : 'section-pad'}>
                <div data-phase-title className={horizontal ? 'w-[340px] shrink-0' : ''}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: meta.accent }}>{meta.saga}</p>
                  <h3 className="display mt-2 text-7xl sm:text-8xl" style={{ color: meta.accent }}>{meta.label}</h3>
                  <p className="mt-1 font-mono text-xs text-mist">{meta.span} · {films.length} films</p>
                  <div className="mt-4 h-px w-24" style={{ background: meta.accent }} />
                </div>
                <div className={horizontal ? 'flex gap-8' : 'no-scrollbar -mx-4 mt-6 flex gap-5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:-mx-8 sm:px-8'}>
                  {films.map((f) => (
                    <div key={f.slug} className={horizontal ? '' : 'snap-start'}>
                      <FilmCard film={f} onOpen={setOpen} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <MovieDetail film={open} onClose={() => setOpen(null)} />
    </section>
  );
}
