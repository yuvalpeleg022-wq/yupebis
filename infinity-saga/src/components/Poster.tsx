import { ImageOff } from 'lucide-react';
import { posterUrl } from '../config/assets';
import { PHASE_META, type Film } from '../data/films';

/**
 * Movie artwork with an honest fallback. When no licensed artwork is
 * registered, a typographic card labelled "Artwork slot" is rendered — never
 * a broken image or a fake generated poster.
 */
export function Poster({ film, className = '', sizes }: { film: Film; className?: string; sizes?: string }) {
  const url = posterUrl(film.poster);
  const accent = PHASE_META[film.phase].accent;
  if (url) {
    return (
      <div className={`relative overflow-hidden bg-ink ${className}`}>
        <img
          src={url}
          alt={`${film.title} (${film.year}) poster`}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden bg-ink p-4 ${className}`}
      style={{ background: `radial-gradient(120% 80% at 50% 0%, ${accent}33, #0a0a10 70%)` }}
      role="img"
      aria-label={`${film.title} — artwork not available`}
    >
      <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-mist"><ImageOff size={11} /> Artwork slot</span>
      <div>
        <p className="font-mono text-[10px] text-mist">{film.year}</p>
        <p className="display text-2xl leading-[0.9] text-bone">{film.title}</p>
      </div>
    </div>
  );
}
