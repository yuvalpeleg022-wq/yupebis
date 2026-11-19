import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FlightOffer, FlightSearchQuery } from '../types';
import { FlightSearchForm } from '../components/booking/FlightSearchForm';
import { FlightResults } from '../components/booking/FlightResults';
import { SectionHeading } from '../components/ui/SectionHeading';
import { getFlightProvider } from '../services/bookingService';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useWebGL } from '../hooks/useWebGL';

const AmbientFlightScene = lazy(() => import('../three/AmbientFlightScene'));

export default function Booking() {
  useDocumentMeta(
    'Book a flight',
    'Search fictional AERONIX AIRWAYS demonstration flights. Portfolio booking interface — no live availability or payments.',
    '/booking',
  );
  const [params] = useSearchParams();
  const webgl = useWebGL();
  const [query, setQuery] = useState<FlightSearchQuery | null>(null);
  const [results, setResults] = useState<FlightOffer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const search = async (q: FlightSearchQuery) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setQuery(q);
    setLoading(true);
    setError(null);
    setResults(null);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      const r = await getFlightProvider().search(q, ctrl.signal);
      setResults(r);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('The demonstration search could not be completed. Please try again.');
    } finally {
      if (abort.current === ctrl) setLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen pb-32 pt-32 md:pt-40" aria-labelledby="booking-title">
      {/* Ambient real-time 3D backdrop behind the heading */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[78vh] overflow-hidden" aria-hidden="true">
        {webgl ? (
          <Suspense fallback={null}>
            <AmbientFlightScene shot="rear" label="Decorative 3D view of an AERONIX aircraft above the clouds" />
          </Suspense>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/50 to-navy-950/10" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-950 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-[1200px] px-5 md:px-10">
        <SectionHeading as="h1" eyebrow="Book a flight" title={<span id="booking-title">Your journey starts here.</span>}>
          A fully interactive booking interface built on fictional data — designed to plug into a real airline booking API.
        </SectionHeading>
        <div className="mt-12">
          <FlightSearchForm initialDestination={params.get('to') ?? undefined} loading={loading} onSearch={search} />
        </div>
        <div ref={resultsRef} className="scroll-mt-28">
          <FlightResults query={query} results={results} loading={loading} error={error} />
        </div>
      </div>
    </section>
  );
}
