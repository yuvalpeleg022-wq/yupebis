import type { Motorcycle } from '../data/motorcycles';
import { formatPrice } from '../data/motorcycles';
import { ArrowRight, Rotate } from './Icons';
import './MotorcycleCard.css';

interface Props {
  bike: Motorcycle;
  index: number;
  onViewDetails: (id: string) => void;
  onView3D: (id: string) => void;
}

export function MotorcycleCard({ bike, index, onViewDetails, onView3D }: Props) {
  const cover = bike.paints[0];
  return (
    <article className="card" aria-labelledby={`card-${bike.id}`}>
      <div className="card__media">
        <img
          src={cover.image}
          alt={`${bike.name} in ${cover.name}`}
          loading="lazy"
          decoding="async"
          width={1200}
          height={800}
        />
        <span className="card__index" aria-hidden="true">
          0{index + 1}
        </span>
        <ul className="card__swatches" aria-label="Available colours">
          {bike.paints.map((p) => (
            <li key={p.id} style={{ background: p.swatch }} title={p.name}>
              <span className="sr-only">{p.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card__body">
        <div className="card__meta">
          <span className="card__category">{bike.category}</span>
          <span className="demo-tag">Demo</span>
        </div>
        <h3 id={`card-${bike.id}`} className="card__name">
          {bike.name}
        </h3>
        <p className="card__headline">{bike.headline}</p>

        <dl className="card__specs">
          <div>
            <dt>Engine</dt>
            <dd>{bike.keySpec}</dd>
          </div>
          <div>
            <dt>From</dt>
            <dd>{formatPrice(bike)}</dd>
          </div>
        </dl>

        <div className="card__actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewDetails(bike.id)}>
            View Details <ArrowRight />
          </button>
          {bike.model3d && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => onView3D(bike.id)}
              aria-label={`View ${bike.name} in 3D`}
              title="View in 3D"
            >
              <Rotate />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
