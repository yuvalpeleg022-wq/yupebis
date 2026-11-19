import { ArrowUpRight } from 'lucide-react';
import type { Destination } from '../../types';
import { CityArtwork } from '../ui/CityArtwork';

interface Props {
  destination: Destination;
  onExplore?: (d: Destination) => void;
  active?: boolean;
  headingLevel?: 'h2' | 'h3';
}

export function DestinationCard({ destination: d, onExplore, active = false, headingLevel: H = 'h3' }: Props) {
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-navy-900 transition-[border-color,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 ${
        active ? 'border-gold/60' : 'border-silver/10 hover:border-silver/30'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="h-full w-full transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]">
          <CityArtwork seed={d.id} hue={d.hue} alt={d.imageAlt} image={d.image} />
        </div>
        <span className="absolute bottom-3 left-3 rounded-full bg-navy-950/70 px-2.5 py-1 font-mono text-[0.62rem] tracking-widest text-cloud backdrop-blur">
          {d.iata}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="eyebrow !text-[0.6rem]">{d.country}</p>
        <H className="display mt-3 text-3xl">{d.city}</H>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-silver">{d.description}</p>
        <button
          type="button"
          onClick={() => onExplore?.(d)}
          className="mt-6 inline-flex items-center gap-2 self-start text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cloud transition hover:text-gold"
          aria-label={`Explore ${d.city}`}
        >
          Explore destination <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  );
}
