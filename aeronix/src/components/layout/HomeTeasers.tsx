import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { destinations } from '../../data/destinations';
import { fleet } from '../../data/fleet';
import { DestinationCard } from '../destinations/DestinationCard';
import { SectionHeading } from '../ui/SectionHeading';
import { ButtonLink } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { CabinArtwork } from '../ui/CabinArtwork';
import { AircraftProfile } from '../fleet/AircraftProfile';

export function HomeTeasers() {
  const navigate = useNavigate();
  const featured = destinations.filter((d) => ['paris', 'tokyo', 'new-york', 'dubai'].includes(d.id));
  return (
    <div className="relative z-10 bg-navy-950">
      <div className="absolute inset-x-0 -top-40 h-40 bg-gradient-to-b from-transparent to-navy-950" aria-hidden="true" />
      {/* Destinations */}
      <section className="mx-auto max-w-[1600px] px-5 py-28 md:px-10 md:py-36" aria-labelledby="home-dest">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading eyebrow="Destinations" title={<span id="home-dest">Eight cities. One horizon.</span>}>
            From the boulevards of Paris to the neon of Tokyo — an illustrative network designed around the world&apos;s
            great capitals.
          </SectionHeading>
          <ButtonLink to="/destinations" variant="ghost" icon={<ArrowRight size={15} />}>
            View the globe
          </ButtonLink>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((d, i) => (
            <Reveal key={d.id} delay={i * 90}>
              <DestinationCard destination={d} onExplore={() => navigate(`/destinations?city=${d.id}`)} />
            </Reveal>
          ))}
        </div>
      </section>

      <div className="hairline mx-auto max-w-[1600px]" />

      {/* Fleet */}
      <section className="mx-auto max-w-[1600px] px-5 py-28 md:px-10 md:py-36" aria-labelledby="home-fleet">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading eyebrow="Our fleet" title={<span id="home-fleet">Built for the long way round.</span>}>
            Four fictional aircraft types, one design language. Explore each in real-time 3D.
            <div className="mt-8">
              <ButtonLink to="/fleet" icon={<ArrowRight size={15} />}>
                Discover our fleet
              </ButtonLink>
            </div>
          </SectionHeading>
          <Reveal>
            <ul className="divide-y divide-silver/10 border-y border-silver/10">
              {fleet.map((a) => (
                <li key={a.id} className="flex items-center gap-6 py-5">
                  <AircraftProfile aircraft={a} className="h-12 w-40 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold">{a.name}</p>
                    <p className="text-xs text-silver">{a.category}</p>
                  </div>
                  <p className="hidden text-right text-xs tabular-nums text-silver sm:block">
                    {a.passengers} seats
                    <br />
                    {a.rangeKm.toLocaleString('en-GB')} km*
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.65rem] text-muted">* Fictional demonstration data.</p>
          </Reveal>
        </div>
      </section>

      {/* Experience */}
      <section className="relative overflow-hidden" aria-labelledby="home-exp">
        <div className="mx-auto grid grid-cols-1 max-w-[1600px] gap-10 px-5 pb-32 md:px-10 lg:grid-cols-2">
          <Reveal className="aspect-[4/3] overflow-hidden rounded-2xl border border-silver/10">
            <CabinArtwork variant="first" alt="Placeholder illustration of the AERONIX First cabin with private suites and warm light" />
          </Reveal>
          <div className="flex flex-col justify-center">
            <SectionHeading eyebrow="The experience" title={<span id="home-exp">Your private sky.</span>}>
              First, Business and Economy cabins conceived as places of calm — soft light, considered materials and space
              to simply be.
            </SectionHeading>
            <div className="mt-10">
              <ButtonLink to="/experience" variant="ghost" icon={<ArrowRight size={15} />}>
                Discover the cabins
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
