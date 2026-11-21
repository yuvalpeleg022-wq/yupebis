import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motorcycles, type Motorcycle, type PaintOption } from '../data/motorcycles';
import { useInView } from '../hooks/useInView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { hasWebGL } from '../lib/webgl';
import type { ViewerApi } from '../three/ViewerCanvas';
import { ErrorBoundary } from './ErrorBoundary';
import { Alert, ArrowRight, Check, Close, Hand, Minus, Plus, Reset } from './Icons';
import { Reveal } from './Reveal';
import './Experience.css';

const ViewerCanvas = lazy(() => import('../three/ViewerCanvas'));

interface Props {
  bike: Motorcycle;
  paint: PaintOption;
  onSelectBike: (id: string) => void;
  onSelectPaint: (id: string) => void;
  onViewDetails: () => void;
}

export function Experience({ bike, paint, onSelectBike, onSelectPaint, onViewDetails }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ViewerApi | null>(null);
  const near = useInView(stageRef, { rootMargin: '600px 0px', once: true });
  const visible = useInView(stageRef, { rootMargin: '0px' });
  const reducedMotion = useReducedMotion();
  const coarse = useMediaQuery('(pointer: coarse)');
  const lowPower = useMediaQuery('(max-width: 720px), (pointer: coarse)');
  const [webgl] = useState(hasWebGL);
  const [touchActive, setTouchActive] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const hintTimer = useRef<number>();

  const interactive = coarse ? touchActive : true;
  const loaded = loadedIds.has(bike.id);

  // Leave touch-interaction mode when the viewer scrolls away
  useEffect(() => {
    if (!visible) setTouchActive(false);
  }, [visible]);

  const flashHint = (text: string) => {
    setHint(text);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 1600);
  };

  // Desktop: Ctrl/⌘ + wheel (or trackpad pinch) zooms; plain wheel keeps scrolling the page
  useEffect(() => {
    const el = stageRef.current;
    if (!el || coarse) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.target as HTMLElement).closest('canvas')) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        apiRef.current?.zoom(e.deltaY > 0 ? 1.12 : 0.89);
      } else {
        flashHint('Hold Ctrl (⌘ on Mac) and scroll to zoom');
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [coarse]);

  const onReady = useCallback(() => {
    setLoadedIds((s) => (s.has(bike.id) ? s : new Set(s).add(bike.id)));
  }, [bike.id]);

  const onUserInteract = useCallback(() => setInteracted(true), []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') apiRef.current?.zoom(0.85);
    else if (e.key === '-') apiRef.current?.zoom(1.18);
    else if (e.key === '0' || e.key.toLowerCase() === 'r') apiRef.current?.reset();
  };

  const fallbackImage = (
    <img className="viewer__fallback-img" src={paint.image} alt={`${bike.name} in ${paint.name}`} loading="lazy" />
  );

  return (
    <section id="experience" className="section experience" aria-labelledby="experience-title">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <p className="eyebrow">3D Experience</p>
            <h2 id="experience-title" className="h2">
              Every angle.
              <br />
              Every finish.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="lede experience__lede">
              Turn the bike, get close to the details and try each paint finish — the same model you'll see on the
              showroom floor.
            </p>
          </Reveal>
        </div>

        <Reveal className="viewer">
          <div className="viewer__tabs" role="tablist" aria-label="Choose a motorcycle">
            {motorcycles.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={m.id === bike.id}
                aria-controls="viewer-stage"
                className={m.id === bike.id ? 'is-active' : ''}
                onClick={() => onSelectBike(m.id)}
              >
                <span className="viewer__tab-cat">{m.category}</span>
                {m.name}
              </button>
            ))}
          </div>

          <div
            id="viewer-stage"
            ref={stageRef}
            role="tabpanel"
            className={`viewer__stage ${coarse && !touchActive ? 'is-locked' : ''}`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-label={`Interactive 3D view of the ${bike.name}. Drag to rotate. Plus and minus keys zoom, R resets.`}
          >
            {!webgl ? (
              <div className="viewer__fallback">
                {fallbackImage}
                <div className="viewer__notice">
                  <Alert />
                  <p>
                    Your browser or device can't display the 3D viewer, so you're seeing a studio image instead. Try a
                    recent version of Chrome, Safari, Firefox or Edge for the interactive experience.
                  </p>
                </div>
              </div>
            ) : (
              <ErrorBoundary
                resetKey={bike.id}
                fallback={(reset) => (
                  <div className="viewer__fallback">
                    {fallbackImage}
                    <div className="viewer__notice">
                      <Alert />
                      <p>The 3D model for the {bike.name} couldn't be loaded. Check your connection and try again.</p>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          // drop the cached failure so the loader really retries (dynamic import keeps three.js out of the main bundle)
                          if (bike.model3d) {
                            const { clearBike } = await import('../three/BikeModel');
                            clearBike(bike.model3d.url);
                          }
                          reset();
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              >
                {near ? (
                  <Suspense
                    fallback={
                      <div className="viewer__loading" role="status">
                        <div className="spinner" aria-hidden="true" />
                        <p>Preparing 3D viewer</p>
                      </div>
                    }
                  >
                    <ViewerCanvas
                      bike={bike}
                      paint={paint}
                      interactive={interactive}
                      nativeZoom={coarse && touchActive}
                      autoRotate={!interacted && !reducedMotion && loaded}
                      lowPower={lowPower}
                      apiRef={apiRef}
                      onReady={onReady}
                      onUserInteract={onUserInteract}
                    />
                  </Suspense>
                ) : (
                  <div className="viewer__loading" role="status">
                    <div className="spinner" aria-hidden="true" />
                    <p>Preparing 3D viewer</p>
                  </div>
                )}
              </ErrorBoundary>
            )}

            {/* Touch devices: explicit activation so the viewer never traps page scrolling */}
            {webgl && coarse && !touchActive && (
              <button type="button" className="viewer__activate" onClick={() => setTouchActive(true)}>
                <span className="viewer__activate-pill">
                  <Hand /> Tap to rotate &amp; zoom
                </span>
              </button>
            )}

            {webgl && (
              <div className="viewer__controls" aria-label="Viewer controls" role="toolbar">
                {coarse && touchActive && (
                  <button
                    type="button"
                    className="icon-btn viewer__done"
                    onClick={() => setTouchActive(false)}
                    aria-label="Done — return to page scrolling"
                    title="Done"
                  >
                    <Close />
                  </button>
                )}
                <button type="button" className="icon-btn" onClick={() => apiRef.current?.zoom(0.8)} aria-label="Zoom in" title="Zoom in">
                  <Plus />
                </button>
                <button type="button" className="icon-btn" onClick={() => apiRef.current?.zoom(1.25)} aria-label="Zoom out" title="Zoom out">
                  <Minus />
                </button>
                <button type="button" className="icon-btn" onClick={() => apiRef.current?.reset()} aria-label="Reset view" title="Reset view">
                  <Reset />
                </button>
              </div>
            )}

            {webgl && (
              <p className={`viewer__hint ${hint ? 'is-flash' : ''}`} aria-live="polite">
                {hint ??
                  (coarse
                    ? touchActive
                      ? 'Drag to rotate · Pinch to zoom'
                      : ''
                    : 'Drag to rotate · Ctrl + scroll to zoom')}
              </p>
            )}
          </div>

          <div className="viewer__bar">
            <div className="viewer__paint">
              <p className="viewer__label" id="paint-label">
                Paint <strong>{paint.name}</strong>
              </p>
              <div className="swatches" role="radiogroup" aria-labelledby="paint-label">
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
            <button type="button" className="text-link" onClick={onViewDetails}>
              Full specifications <ArrowRight />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
