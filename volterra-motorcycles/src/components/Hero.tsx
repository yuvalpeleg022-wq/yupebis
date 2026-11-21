import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { brand } from '../config/brand';
import type { Motorcycle } from '../data/motorcycles';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { hasWebGL } from '../lib/webgl';
import { scrollToSection } from '../lib/scroll';
import { ErrorBoundary } from './ErrorBoundary';
import { ArrowDown, ArrowRight } from './Icons';
import './Hero.css';

const HeroCanvas = lazy(() => import('../three/HeroCanvas'));

interface Props {
  bike: Motorcycle;
  onBookRide: (bikeId: string) => void;
}

export function Hero({ bike, onBookRide }: Props) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const reducedMotion = useReducedMotion();
  const lowPower = useMediaQuery('(max-width: 720px), (pointer: coarse)');
  const [webgl] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onReady = useCallback(() => setTimeout(() => setReady(true), 250), []);
  const onError = useCallback(() => setFailed(true), []);
  const show3D = webgl && !failed && !!bike.model3d;

  return (
    <section id="home" ref={ref} className="hero" aria-labelledby="hero-title">
      <div className="hero__stage">
        {/* Poster = a render of the same 3D model; shown instantly, and as the static fallback */}
        <img
          className={`hero__poster ${show3D && ready ? 'is-hidden' : ''}`}
          src={`${import.meta.env.BASE_URL}images/hero-poster.webp`}
          alt={`${bike.name} in ${bike.paints[0].name}, three-quarter front view in a dark studio`}
          {...{ fetchpriority: 'high' }}
        />
        {show3D && (
          <div className={`hero__canvas ${ready ? 'is-ready' : ''}`}>
            <ErrorBoundary fallback={() => null} onError={onError}>
              <Suspense fallback={null}>
                <HeroCanvas
                  bike={bike}
                  active={inView}
                  reducedMotion={reducedMotion}
                  lowPower={lowPower}
                  onReady={onReady}
                  onError={onError}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
        <div className="hero__vignette" aria-hidden="true" />
      </div>

      <div className="hero__content container">
        <div className="hero__copy">
          <p className="eyebrow hero__eyebrow">{brand.fullName}</p>
          <h1 id="hero-title" className="display hero__title">
            <span>Built for</span>
            <span>the ride</span>
            <span className="hero__title-accent">ahead.</span>
          </h1>
          <p className="hero__lede">
            A curated showroom of premium motorcycles — explore every machine in 3D, compare the details, and book a
            test ride when you're ready.
          </p>
          <div className="hero__actions">
            <a
              href="#motorcycles"
              className="btn btn-primary"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('motorcycles');
              }}
            >
              Explore the Collection <ArrowRight />
            </a>
            <a
              href="#contact"
              className="btn btn-ghost"
              onClick={(e) => {
                e.preventDefault();
                onBookRide(bike.id);
              }}
            >
              Book a Test Ride
            </a>
          </div>
        </div>

        <aside className="hero__spec" aria-label={`${bike.name} highlights`}>
          <p className="hero__spec-name">
            {bike.name} <span className="demo-tag">Demo model</span>
          </p>
          <dl>
            {bike.performance.slice(1, 4).map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value.split(' @')[0]}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <a
        href="#motorcycles"
        className="hero__scroll"
        aria-label="Scroll to the collection"
        onClick={(e) => {
          e.preventDefault();
          scrollToSection('motorcycles');
        }}
      >
        <span>Scroll</span>
        <ArrowDown />
      </a>
    </section>
  );
}
