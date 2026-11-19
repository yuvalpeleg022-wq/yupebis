import { lazy, Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '../components/ui/SectionHeading';
import { ButtonLink } from '../components/ui/Button';
import { DemoNotice } from '../components/ui/DemoNotice';
import { Reveal } from '../components/ui/Reveal';
import { CityArtwork } from '../components/ui/CityArtwork';
import { StaticAircraft } from '../components/fallback/StaticAircraft';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useWebGL } from '../hooks/useWebGL';
import { asset } from '../utils/asset';

const AmbientFlightScene = lazy(() => import('../three/AmbientFlightScene'));

const PILLARS = [
  { title: 'Philosophy', body: 'Travel should restore, not exhaust. We design every moment — from booking to arrival — around calm, clarity and quiet confidence.' },
  { title: 'Mission', body: 'To connect the world’s great cities with an experience that feels personal at every altitude, in every cabin.' },
  { title: 'Vision', body: 'A future where premium travel is defined by thoughtfulness and efficiency rather than excess.' },
];

const HISTORY = [
  { year: '2019', text: 'AERONIX is imagined as a design study: what would an airline look like if it were founded today?' },
  { year: '2021', text: 'The pearl, navy and champagne-gold identity is drawn, along with the original tail emblem.' },
  { year: '2023', text: 'The fictional fleet takes shape around the AX-950 Horizon flagship.' },
  { year: '2026', text: 'AERONIX AIRWAYS becomes an interactive 3D portfolio experience — the one you are exploring now.' },
];

export default function About() {
  useDocumentMeta(
    'About',
    'The story, philosophy, mission and vision of AERONIX AIRWAYS — a fictional premium airline created as a digital portfolio project.',
    '/about',
  );
  const webgl = useWebGL();
  return (
    <>
      <section className="relative overflow-hidden pb-20 pt-32 md:pt-40" aria-labelledby="about-title">
        <div className="mx-auto grid grid-cols-1 max-w-[1600px] items-end gap-10 px-5 md:px-10 lg:grid-cols-2">
          <SectionHeading as="h1" eyebrow="About AERONIX" title={<span id="about-title">An airline, reimagined.</span>}>
            AERONIX AIRWAYS is a fictional premium airline brand, created as a high-end digital agency portfolio project to
            explore cinematic storytelling, real-time 3D and interaction design.
          </SectionHeading>
          <div className="max-w-md lg:justify-self-end">
            <DemoNotice>
              AERONIX does not exist and does not operate flights. Any resemblance to a real airline is unintended. History
              and figures on this page are fictional.
            </DemoNotice>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 md:px-10" aria-label="Brand imagery">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-silver/10 sm:aspect-[21/9]">
          {webgl ? (
            <Suspense fallback={<div className="h-full w-full bg-gradient-to-b from-navy-900 to-aviation" />}>
              <AmbientFlightScene shot="side" label="Real-time 3D view of an AERONIX wide-body cruising above the clouds" />
            </Suspense>
          ) : (
            <StaticAircraft slice className="h-full w-full" />
          )}
          <span className="pointer-events-none absolute bottom-4 left-4 demo-badge">Real-time 3D</span>
        </div>
      </section>

      <section className="mx-auto grid grid-cols-1 max-w-[1600px] gap-6 px-5 py-28 md:grid-cols-3 md:px-10" aria-label="Brand pillars">
        {PILLARS.map((p, i) => (
          <Reveal key={p.title} delay={i * 100}>
            <article className="h-full border-t border-gold/50 pt-8">
              <p className="font-mono text-xs text-gold">0{i + 1}</p>
              <h2 className="display mt-4 text-4xl">{p.title}</h2>
              <p className="mt-5 leading-relaxed text-silver">{p.body}</p>
            </article>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto max-w-[1600px] px-5 pb-28 md:px-10" aria-labelledby="history-title">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <SectionHeading eyebrow="Fictional history" title={<span id="history-title">The story so far.</span>} />
            <div className="mt-10 aspect-[4/3] overflow-hidden rounded-2xl border border-silver/10">
              <CityArtwork
                seed="aeronix-hub"
                hue={214}
                image={asset('images/about/hub.jpg')}
                alt="Aerial view of an airport at blue hour, runway lights glowing as a wide-body aircraft taxis"
              />
            </div>
          </div>
          <ol className="relative border-l border-silver/15">
            {HISTORY.map((h) => (
              <li key={h.year} className="relative pb-12 pl-10 last:pb-0">
                <span className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-gold" aria-hidden="true" />
                <p className="font-display text-5xl font-semibold text-silver/40">{h.year}</p>
                <p className="mt-3 max-w-lg leading-relaxed text-silver">{h.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-24 flex flex-wrap gap-3">
          <ButtonLink to="/destinations" icon={<ArrowRight size={15} />}>
            Explore destinations
          </ButtonLink>
          <ButtonLink to="/fleet" variant="ghost">
            Discover our fleet
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
