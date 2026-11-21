import { useMemo, useState } from 'react';
import { categories, motorcycles, type Category } from '../data/motorcycles';
import { MotorcycleCard } from './MotorcycleCard';
import { Reveal } from './Reveal';
import './Collection.css';

interface Props {
  onViewDetails: (id: string) => void;
  onView3D: (id: string) => void;
}

export function Collection({ onViewDetails, onView3D }: Props) {
  const [filter, setFilter] = useState<'All' | Category>('All');
  const list = useMemo(
    () => (filter === 'All' ? motorcycles : motorcycles.filter((m) => m.category === filter)),
    [filter],
  );

  return (
    <section id="motorcycles" className="section collection" aria-labelledby="collection-title">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <p className="eyebrow">The Collection</p>
            <h2 id="collection-title" className="h2">
              Featured
              <br />
              motorcycles
            </h2>
          </Reveal>
          <Reveal delay={100} className="collection__filters-wrap">
            <div className="collection__filters" role="group" aria-label="Filter by category">
              {categories.map((c) => {
                const count = c === 'All' ? motorcycles.length : motorcycles.filter((m) => m.category === c).length;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={filter === c}
                    className={filter === c ? 'is-active' : ''}
                    onClick={() => setFilter(c)}
                  >
                    {c}
                    <span aria-hidden="true">{count}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        <p className="sr-only" aria-live="polite">
          Showing {list.length} {list.length === 1 ? 'motorcycle' : 'motorcycles'}
          {filter !== 'All' ? ` in ${filter}` : ''}
        </p>

        <ul className="collection__grid">
          {list.map((bike, i) => (
            <Reveal as="li" key={bike.id} delay={i * 90}>
              <MotorcycleCard
                bike={bike}
                index={motorcycles.indexOf(bike)}
                onViewDetails={onViewDetails}
                onView3D={onView3D}
              />
            </Reveal>
          ))}
        </ul>

        <p className="collection__note">
          Models, specifications and prices shown are demonstration content for this showcase.
        </p>
      </div>
    </section>
  );
}
