import { Suspense, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Plane, RotateCcw } from 'lucide-react';
import { destinations, HUB, routeDestinations } from '../data/destinations';
import { DestinationCard } from '../components/destinations/DestinationCard';
import { SectionHeading } from '../components/ui/SectionHeading';
import { ButtonLink } from '../components/ui/Button';
import { DemoNotice } from '../components/ui/DemoNotice';
import { SceneLoader } from '../components/ui/SceneLoader';
import { Reveal } from '../components/ui/Reveal';
import { SceneCanvas } from '../three/AircraftScene';
import { EarthGlobe, type EarthGlobeHandle } from '../three/EarthGlobe';
import { useQuality } from '../hooks/useQuality';
import { useWebGL } from '../hooks/useWebGL';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { greatCircleKm } from '../utils/math';

function GlobeFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="aspect-square w-3/4 max-w-md rounded-full bg-[radial-gradient(circle_at_35%_30%,#7893AC_0%,#183A5A_35%,#071629_75%)] shadow-[0_0_120px_20px_rgba(120,147,172,0.25)]" />
    </div>
  );
}

export default function Destinations() {
  useDocumentMeta(
    'Destinations',
    'Explore the illustrative AERONIX AIRWAYS network on an interactive 3D globe: London, Paris, New York, Tokyo, Rome, Singapore, Dubai and Bangkok.',
    '/destinations',
  );
  const quality = useQuality();
  const webgl = useWebGL();
  const [params, setParams] = useSearchParams();
  const globe = useRef<EarthGlobeHandle>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedId = params.get('city');
  const selected = useMemo(() => destinations.find((d) => d.id === selectedId) ?? null, [selectedId]);

  const select = useCallback(
    (id: string) => {
      setParams({ city: id }, { replace: true, preventScrollReset: true });
    },
    [setParams],
  );

  const distance = selected && selected.id !== 'london' ? Math.round(greatCircleKm([HUB.lat, HUB.lon], [selected.lat, selected.lon])) : 0;

  return (
    <>
      <section className="relative overflow-hidden pt-32 md:pt-40" aria-labelledby="dest-title">
        <div className="mx-auto max-w-[1600px] px-5 md:px-10">
          <SectionHeading as="h1" eyebrow="Destinations" title={<span id="dest-title">Where will you go next?</span>}>
            Select a city on the globe — or from the list — to trace an illustrative route from our fictional London hub.
          </SectionHeading>
        </div>

        <div className="mx-auto mt-12 grid grid-cols-1 max-w-[1600px] gap-6 px-5 md:px-10 lg:grid-cols-[1.35fr_1fr]">
          {/* Globe */}
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-silver/10 bg-[radial-gradient(ellipse_at_center,#0f2a47_0%,#071629_70%)] lg:aspect-auto lg:min-h-[680px]">
            {webgl ? (
              <SceneCanvas
                label="Interactive 3D globe showing illustrative AERONIX routes. Use the destination list for keyboard access."
                camera={{ fov: 35, position: [0.9, 1.6, 7.2], near: 0.1, far: 100 }}
                fallback={<GlobeFallback />}
              >
                <ambientLight intensity={0.4} />
                <Suspense fallback={null}>
                  <EarthGlobe
                    ref={globe}
                    destinations={routeDestinations}
                    hub={HUB}
                    selectedId={selectedId}
                    onSelect={select}
                    reducedMotion={quality.reducedMotion}
                  />
                </Suspense>
              </SceneCanvas>
            ) : (
              <GlobeFallback />
            )}
            {webgl ? <SceneLoader label="Loading globe" /> : null}
            <div className="pointer-events-none absolute left-5 top-5 flex flex-col gap-2">
              <span className="demo-badge">Illustrative routes</span>
            </div>
            {webgl ? (
              <button
                type="button"
                onClick={() => {
                  setParams({}, { replace: true, preventScrollReset: true });
                  globe.current?.reset();
                }}
                className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full border border-silver/25 bg-navy-950/70 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-silver backdrop-blur transition hover:border-cloud hover:text-cloud"
              >
                <RotateCcw size={13} aria-hidden="true" /> Reset globe
              </button>
            ) : null}
            <p className="pointer-events-none absolute bottom-5 left-5 hidden text-[0.62rem] text-muted sm:block">
              Drag to rotate · Scroll to zoom · Click a city
            </p>
          </div>

          {/* List + panel */}
          <div className="flex flex-col gap-4">
            <div role="listbox" aria-label="Destinations" className="grid grid-cols-2 gap-2">
              {routeDestinations.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="option"
                  aria-selected={d.id === selectedId}
                  onClick={() => {
                    select(d.id);
                    panelRef.current?.focus({ preventScroll: true });
                  }}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    d.id === selectedId ? 'border-gold/70 bg-gold/10 text-cloud' : 'border-silver/10 text-silver hover:border-silver/35 hover:text-cloud'
                  }`}
                >
                  <span className="font-display text-base font-semibold">{d.city}</span>
                  <span className="font-mono text-[0.65rem] tracking-widest">{d.iata}</span>
                </button>
              ))}
            </div>

            <div
              ref={panelRef}
              tabIndex={-1}
              aria-live="polite"
              className="glass flex-1 rounded-3xl p-7 outline-none md:p-9"
            >
              {selected ? (
                <div key={selected.id} className="animate-[fadeIn_600ms_ease]">
                  <p className="eyebrow">
                    {HUB.iata} <Plane size={12} className="mx-1 inline text-gold" aria-hidden="true" /> {selected.iata} ·{' '}
                    {selected.country}
                  </p>
                  <h2 className="display mt-4 text-5xl">{selected.city}</h2>
                  <p className="mt-2 text-sm text-gold">{selected.highlight}</p>
                  <p className="mt-5 leading-relaxed text-silver">{selected.description}</p>
                  <dl className="mt-7 grid grid-cols-2 gap-4 border-y border-silver/10 py-5 text-sm">
                    <div>
                      <dt className="eyebrow !text-[0.58rem]">Great-circle distance</dt>
                      <dd className="mt-1 font-display text-2xl tabular-nums">{distance.toLocaleString('en-GB')} km</dd>
                    </div>
                    <div>
                      <dt className="eyebrow !text-[0.58rem]">Illustrative block time</dt>
                      <dd className="mt-1 font-display text-2xl tabular-nums">{selected.illustrativeHours} h</dd>
                    </div>
                  </dl>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <ButtonLink to={`/booking?to=${selected.iata}`} icon={<ArrowRight size={15} />}>
                      Plan this journey
                    </ButtonLink>
                  </div>
                  <div className="mt-6">
                    <DemoNotice>
                      Illustrative route for a fictional airline. It does not represent a scheduled or bookable service.
                    </DemoNotice>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="eyebrow">The network</p>
                  <h2 className="display mt-4 text-4xl">Seven routes from London.</h2>
                  <p className="mt-5 leading-relaxed text-silver">
                    Choose a destination to fly the camera across the globe and reveal its details. Gold marks our fictional
                    home hub at London.
                  </p>
                  <div className="mt-6">
                    <DemoNotice>All routes shown are illustrative demonstration content.</DemoNotice>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-28 md:px-10" aria-labelledby="all-dest">
        <SectionHeading eyebrow="All destinations" title={<span id="all-dest">The collection.</span>} />
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {destinations.map((d, i) => (
            <Reveal key={d.id} delay={(i % 4) * 80}>
              <DestinationCard
                destination={d}
                active={d.id === selectedId}
                onExplore={(dest) => {
                  if (dest.id !== 'london') select(dest.id);
                  window.scrollTo({ top: 0, behavior: quality.reducedMotion ? 'auto' : 'smooth' });
                }}
              />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
