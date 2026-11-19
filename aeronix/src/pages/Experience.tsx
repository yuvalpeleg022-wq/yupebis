import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '../components/ui/SectionHeading';
import { ButtonLink } from '../components/ui/Button';
import { DemoNotice } from '../components/ui/DemoNotice';
import { CabinArtwork } from '../components/ui/CabinArtwork';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

const CABINS = [
  {
    id: 'first',
    variant: 'first',
    eyebrow: 'First Class',
    title: 'A private suite in the sky.',
    lead: 'Premium private seating experience.',
    body: 'Floor-to-ceiling privacy doors, a fully flat bed dressed in fine linen and a dining menu composed around the hour of your body clock — not the time zone below.',
    features: ['Private suite with sliding doors', 'Fully flat 2 m bed', 'Dine on demand', 'Arrival spa concept'],
    alt: 'Placeholder illustration of a First Class suite with warm ambient light',
  },
  {
    id: 'business',
    variant: 'business',
    eyebrow: 'Business Class',
    title: 'Work, rest — beautifully.',
    lead: 'Sophisticated business travel.',
    body: 'Direct aisle access from every studio, a generous work surface and lighting that shifts with the journey so you arrive focused and rested.',
    features: ['Direct aisle access', 'Lie-flat studio seat', 'Wireless charging', 'Circadian cabin lighting'],
    alt: 'Placeholder illustration of a Business Class cabin with lie-flat studios',
  },
  {
    id: 'economy',
    variant: 'economy',
    eyebrow: 'Economy Class',
    title: 'Comfort, considered.',
    lead: 'Comfort-focused travel.',
    body: 'Sculpted seats with more recline, adjustable headrests and a large personal screen — proof that good design belongs in every row.',
    features: ['Sculpted ergonomic seats', 'Adjustable headrests', '13" personal screen', 'Chef-designed menus'],
    alt: 'Placeholder illustration of an Economy cabin with rows of ergonomic seats',
  },
  {
    id: 'design',
    variant: 'design',
    eyebrow: 'Cabin Design',
    title: 'Light, material, silence.',
    lead: 'An interior language of calm.',
    body: 'Brushed silver, deep navy textiles and champagne-gold details. Indirect light washes the ceiling while acoustic panels soften every sound.',
    features: ['Indirect ambient light', 'Acoustic damping concept', 'Natural, tactile materials', 'Champagne-gold detailing'],
    alt: 'Placeholder illustration of the AERONIX cabin design with indirect lighting',
  },
] as const;

export default function Experience() {
  useDocumentMeta(
    'Experience',
    'Discover the fictional AERONIX AIRWAYS cabin experience — First, Business and Economy Class concepts and the design language behind them.',
    '/experience',
  );
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.index);
            setActive(i);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section className="relative pb-16 pt-32 md:pt-40" aria-labelledby="exp-title">
        <div className="mx-auto grid grid-cols-1 max-w-[1600px] items-end gap-10 px-5 md:px-10 lg:grid-cols-2">
          <SectionHeading as="h1" eyebrow="The experience" title={<span id="exp-title">Time well spent.</span>}>
            Four chapters of the AERONIX cabin concept — from private suites to thoughtfully designed economy.
          </SectionHeading>
          <div className="max-w-md lg:justify-self-end">
            <DemoNotice>
              Cabin products described here are design concepts for a fictional portfolio brand. No real services or
              facilities are offered. Imagery shown is placeholder illustration pending photography.
            </DemoNotice>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 pb-32 md:px-10" aria-label="Cabins">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          {/* Sticky cinematic image stage (desktop) */}
          <div className="sticky top-28 hidden h-[calc(100vh-9rem)] overflow-hidden rounded-3xl border border-silver/10 lg:block">
            {CABINS.map((c, i) => (
              <div
                key={c.id}
                aria-hidden={i !== active}
                className={`absolute inset-0 transition-[opacity,transform] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  i === active ? 'scale-100 opacity-100' : 'scale-[1.06] opacity-0'
                }`}
              >
                <CabinArtwork variant={c.variant} alt={c.alt} />
              </div>
            ))}
            <div className="absolute bottom-6 left-6 flex gap-2" aria-hidden="true">
              {CABINS.map((c, i) => (
                <span key={c.id} className={`h-px transition-all duration-700 ${i === active ? 'w-10 bg-gold' : 'w-5 bg-silver/40'}`} />
              ))}
            </div>
          </div>

          <div>
            {CABINS.map((c, i) => (
              <article
                key={c.id}
                id={c.id}
                data-index={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className="flex min-h-[80vh] flex-col justify-center border-b border-silver/10 py-16 last:border-0"
                aria-labelledby={`${c.id}-title`}
              >
                <div className="mb-8 aspect-[4/3] overflow-hidden rounded-2xl border border-silver/10 lg:hidden">
                  <CabinArtwork variant={c.variant} alt={c.alt} />
                </div>
                <p className="eyebrow flex items-center gap-3">
                  <span className="font-mono text-gold">0{i + 1}</span> {c.eyebrow}
                </p>
                <h2 id={`${c.id}-title`} className="display mt-5 text-4xl md:text-6xl">
                  {c.title}
                </h2>
                <p className="mt-4 text-lg text-cloud">{c.lead}</p>
                <p className="mt-4 max-w-lg leading-relaxed text-silver">{c.body}</p>
                <ul className="mt-8 grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 text-sm text-silver">
                  {c.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-2 h-px w-4 shrink-0 bg-gold" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            <div className="pt-12">
              <ButtonLink to="/booking" icon={<ArrowRight size={15} />}>
                Book a flight
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
