import { lazy, Suspense, useState } from 'react';
import { Box, Users, Route, Gauge } from 'lucide-react';
import { fleet } from '../data/fleet';
import type { FleetAircraft } from '../types';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Button } from '../components/ui/Button';
import { DemoNotice } from '../components/ui/DemoNotice';
import { Reveal } from '../components/ui/Reveal';
import { AircraftProfile } from '../components/fleet/AircraftProfile';
import { StaticAircraft } from '../components/fallback/StaticAircraft';
import { useWebGL } from '../hooks/useWebGL';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

const AircraftViewer = lazy(() => import('../components/viewer/AircraftViewer'));
const FleetShowcase = lazy(() => import('../three/FleetShowcase'));

export default function Fleet() {
  useDocumentMeta(
    'Our Fleet',
    'Meet the fictional AERONIX AIRWAYS fleet — four aircraft types presented in real-time 3D, with illustrative capacity, cabin and range data.',
    '/fleet',
  );
  const webgl = useWebGL();
  const [viewing, setViewing] = useState<FleetAircraft | null>(null);
  const [showcase, setShowcase] = useState<FleetAircraft>(fleet[0]!);

  return (
    <>
      <section className="relative overflow-hidden pb-10 pt-32 md:pt-40" aria-labelledby="fleet-title">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_70%_20%,#183A5A_0%,transparent_60%)]" aria-hidden="true" />
        <div className="relative mx-auto grid grid-cols-1 max-w-[1600px] items-end gap-10 px-5 md:px-10 lg:grid-cols-[1fr_1fr]">
          <SectionHeading as="h1" eyebrow="Our fleet" title={<span id="fleet-title">Four aircraft. One standard.</span>}>
            Every AERONIX aircraft shares the same pearl, navy and champagne-gold language — and the same obsession with
            calm. Open any aircraft to explore it in real-time 3D.
          </SectionHeading>
          <div className="max-w-md lg:justify-self-end">
            <DemoNotice>
              AERONIX is a fictional airline. Aircraft names, passenger capacities, cabin layouts and ranges are fictional
              demonstration data and do not describe real aircraft.
            </DemoNotice>
          </div>
        </div>
      </section>

      {/* Real-time 3D showcase */}
      <section className="mx-auto max-w-[1600px] px-5 pb-16 md:px-10" aria-label="3D fleet showcase">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-silver/10 bg-navy-900 sm:aspect-[21/9]">
          {webgl ? (
            <Suspense fallback={<div className="h-full w-full bg-gradient-to-b from-navy-900 to-aviation" />}>
              <FleetShowcase aircraft={showcase} />
            </Suspense>
          ) : (
            <StaticAircraft engines={showcase.profile.engines} className="h-full w-full" />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-navy-950/80 to-transparent p-5 pb-16 md:p-8">
            <p className="eyebrow">{showcase.category}</p>
            <p className="display mt-2 text-2xl md:text-4xl">{showcase.name}</p>
          </div>
          <span className="pointer-events-none absolute bottom-4 right-4 demo-badge">Real-time 3D · representative model</span>
        </div>
        <div role="tablist" aria-label="Choose an aircraft" className="scrollbar-none mt-4 flex gap-2 overflow-x-auto">
          {fleet.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={a.id === showcase.id}
              onClick={() => setShowcase(a)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.2em] transition ${
                a.id === showcase.id ? 'border-gold bg-gold text-navy-950' : 'border-silver/25 text-silver hover:border-silver/60 hover:text-cloud'
              }`}
            >
              {a.name.replace('Aeronix ', '')}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 pb-32 md:px-10" aria-label="Fleet">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {fleet.map((a, i) => (
            <Reveal key={a.id} delay={(i % 2) * 120}>
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-silver/10 bg-navy-900 transition-colors duration-700 hover:border-silver/30">
                <div className="relative flex aspect-[16/8] items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#183A5A_0%,#0B1F35_70%)]">
                  <AircraftProfile
                    aircraft={a}
                    className="h-[78%] w-[90%] transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-5 top-5 demo-badge">{a.category}</span>
                </div>
                <div className="flex flex-1 flex-col p-7 md:p-9">
                  <h2 className="display text-3xl md:text-4xl">{a.name}</h2>
                  <p className="mt-2 text-sm text-gold">{a.tagline}</p>
                  <p className="mt-4 leading-relaxed text-silver">{a.description}</p>
                  <dl className="mt-7 grid grid-cols-3 gap-4 border-y border-silver/10 py-5">
                    <Spec icon={<Users size={14} />} label="Passengers" value={`${a.passengers}`} />
                    <Spec icon={<Route size={14} />} label="Range*" value={`${a.rangeKm.toLocaleString('en-GB')} km`} />
                    <Spec icon={<Gauge size={14} />} label="Cruise*" value={`Mach ${a.cruiseMach.toFixed(2)}`} />
                  </dl>
                  <div className="mt-5">
                    <p className="eyebrow !text-[0.58rem]">Cabins</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {a.cabins.map((c) => (
                        <li key={c} className="rounded-full border border-silver/15 px-3 py-1 text-xs text-silver">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-4 pt-8">
                    <p className="text-[0.62rem] text-muted">* Illustrative demonstration data</p>
                    {webgl ? (
                      <Button variant="ghost" size="sm" icon={<Box size={14} />} onClick={() => setViewing(a)}>
                        Explore in 3D
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Suspense fallback={null}>
        {viewing ? <AircraftViewer open aircraft={viewing} onClose={() => setViewing(null)} /> : null}
      </Suspense>
    </>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.18em] text-muted">
        <span className="text-gold" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1.5 font-display text-lg font-semibold tabular-nums md:text-xl">{value}</dd>
    </div>
  );
}
