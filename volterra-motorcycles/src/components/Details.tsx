import { useEffect, useState } from 'react';
import { formatPrice, type Motorcycle, type PaintOption } from '../data/motorcycles';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Expand, Rotate } from './Icons';
import { Modal } from './Modal';
import { Reveal } from './Reveal';
import './Details.css';

interface Props {
  bike: Motorcycle;
  paint: PaintOption;
  onSelectPaint: (id: string) => void;
  onBookRide: (bikeId: string) => void;
  onView3D: () => void;
}

export function Details({ bike, paint, onSelectPaint, onBookRide, onView3D }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const gallery = bike.gallery;
  const step = (d: number) => setLightbox((i) => (i == null ? i : (i + d + gallery.length) % gallery.length));

  // Arrow keys move through the gallery while the lightbox is open
  const lightboxOpen = lightbox != null;
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, gallery.length]);

  // Close the lightbox if the selected bike changes
  useEffect(() => setLightbox(null), [bike.id]);

  return (
    <section id="details" className="section details" aria-labelledby="details-title">
      <div className="container">
        <div className="details__head">
          <Reveal className="details__intro" key={`intro-${bike.id}`}>
            <p className="eyebrow">
              {bike.category} · Model details
            </p>
            <h2 id="details-title" className="h2 details__name">
              {bike.name}
            </h2>
            <p className="details__headline">{bike.headline}</p>
            <p className="lede">{bike.summary}</p>
            <div className="details__price">
              <span>Starting from</span>
              <strong>{formatPrice(bike)}</strong>
              <span className="demo-tag">Demo pricing</span>
            </div>
            <div className="details__actions">
              <button type="button" className="btn btn-primary" onClick={() => onBookRide(bike.id)}>
                Book a Test Ride <ArrowRight />
              </button>
              {bike.model3d && (
                <button type="button" className="btn btn-ghost" onClick={onView3D}>
                  <Rotate /> View in 3D
                </button>
              )}
            </div>
          </Reveal>

          <Reveal className="details__hero" delay={80} key={`hero-${bike.id}`}>
            <button
              type="button"
              className="details__hero-btn"
              onClick={() => setLightbox(0)}
              aria-label={`Open ${bike.name} gallery`}
            >
              <img src={paint.image} alt={`${bike.name} in ${paint.name}`} loading="lazy" decoding="async" width={1200} height={800} />
              <span className="details__expand" aria-hidden="true">
                <Expand />
              </span>
            </button>
            <div className="details__colors">
              <p id="details-paint-label">
                Colour <strong>{paint.name}</strong>
              </p>
              <div className="swatches" role="radiogroup" aria-labelledby="details-paint-label">
                {bike.paints.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={p.id === paint.id}
                    aria-label={p.name}
                    title={p.name}
                    className={`swatch ${p.id === paint.id ? 'is-active' : ''}`}
                    style={{ ['--swatch' as string]: p.swatch }}
                    onClick={() => onSelectPaint(p.id)}
                  >
                    {p.id === paint.id && <Check />}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <div className="details__specs">
          <Reveal className="spec-table" key={`perf-${bike.id}`}>
            <h3>Engine &amp; performance</h3>
            <dl>
              {bike.performance.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal className="spec-table" delay={80} key={`dim-${bike.id}`}>
            <h3>Dimensions &amp; chassis</h3>
            <dl>
              {bike.dimensions.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
        <p className="details__disclaimer">
          Demo specifications for a fictional showcase model. Replace with manufacturer-verified data before
          publishing.
        </p>

        <div className="details__features">
          <h3 className="details__sub">Key features</h3>
          <ul>
            {bike.features.map((f, i) => (
              <Reveal as="li" key={`${bike.id}-${f.title}`} delay={i * 70}>
                <span className="details__feature-num">0{i + 1}</span>
                <h4>{f.title}</h4>
                <p>{f.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="details__gallery">
          <h3 className="details__sub">Gallery</h3>
          <ul>
            {gallery.map((g, i) => (
              <li key={g.src}>
                <button type="button" onClick={() => setLightbox(i)} aria-label={`View larger: ${g.alt}`}>
                  <img src={g.src} alt={g.alt} loading="lazy" decoding="async" width={1200} height={800} />
                  <span>{g.caption}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Modal
        open={lightbox != null}
        onClose={() => setLightbox(null)}
        label={`${bike.name} gallery`}
        className="modal--media"
      >
        {lightbox != null && (
          <figure className="lightbox">
            <img src={gallery[lightbox].src} alt={gallery[lightbox].alt} />
            <figcaption>
              <span>
                {bike.name} — {gallery[lightbox].caption}
              </span>
              <span className="lightbox__count">
                {lightbox + 1} / {gallery.length}
              </span>
            </figcaption>
            <button type="button" className="icon-btn lightbox__prev" onClick={() => step(-1)} aria-label="Previous image">
              <ChevronLeft />
            </button>
            <button type="button" className="icon-btn lightbox__next" onClick={() => step(1)} aria-label="Next image">
              <ChevronRight />
            </button>
          </figure>
        )}
      </Modal>
    </section>
  );
}
