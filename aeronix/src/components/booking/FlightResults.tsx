import { useState } from 'react';
import { Plane, CheckCircle2 } from 'lucide-react';
import type { FlightOffer, FlightSearchQuery, FlightSegment } from '../../types';
import { airports, travelClasses } from '../../data/flights';
import { passengerSummary } from '../../services/bookingService';
import { DemoNotice } from '../ui/DemoNotice';
import { Button } from '../ui/Button';

const cityOf = (code: string) => airports.find((a) => a.code === code)?.city ?? code;
const duration = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

interface Props {
  query: FlightSearchQuery | null;
  results: FlightOffer[] | null;
  loading: boolean;
  error: string | null;
}

export function FlightResults({ query, results, loading, error }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="mt-10 space-y-3" role="status" aria-live="polite">
        <span className="sr-only">Searching demonstration flights…</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-silver/10 bg-navy-900" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <p role="alert" className="mt-10 rounded-2xl border border-red-400/30 bg-red-400/5 p-5 text-sm text-red-200">
        {error}
      </p>
    );
  }
  if (!results || !query) return null;

  const cls = travelClasses.find((c) => c.id === query.travelClass)?.label;
  const chosen = results.find((r) => r.id === selected);

  return (
    <section className="mt-12" aria-labelledby="results-title" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Demonstration results</p>
          <h2 id="results-title" className="display mt-3 text-3xl md:text-5xl">
            {cityOf(query.origin)} <span className="text-gold">→</span> {cityOf(query.destination)}
          </h2>
          <p className="mt-2 text-sm text-silver">
            {query.tripType === 'round' ? 'Round trip' : 'One way'} · {passengerSummary(query.passengers)} · {cls}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <DemoNotice>
          These flights are generated locally from fictional data to demonstrate the interface. They are not live
          availability, real schedules or real prices. Times are shown without time-zone conversion.
        </DemoNotice>
      </div>

      <ul className="mt-8 space-y-3">
        {results.map((r) => (
          <li
            key={r.id}
            className={`rounded-2xl border bg-navy-900 p-5 transition md:p-6 ${selected === r.id ? 'border-gold/70' : 'border-silver/10 hover:border-silver/30'}`}
          >
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <SegmentRow seg={r.outbound} label="Outbound" />
                {r.inbound ? <SegmentRow seg={r.inbound} label="Return" /> : null}
              </div>
              <div className="flex items-center justify-between gap-6 border-t border-silver/10 pt-4 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
                <div className="text-right">
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">Illustrative fare</p>
                  <p className="font-display text-3xl font-semibold tabular-nums">€{r.illustrativeFare.toLocaleString('en-GB')}</p>
                  <p className="text-[0.65rem] text-muted">demo · {r.seatsLeftDemo} seats (demo)</p>
                </div>
                <Button
                  variant={selected === r.id ? 'gold' : 'ghost'}
                  size="sm"
                  onClick={() => setSelected(r.id)}
                  aria-pressed={selected === r.id}
                >
                  {selected === r.id ? 'Selected' : 'Select'}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {chosen ? (
        <div className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-center md:justify-between" role="status">
          <p className="flex items-start gap-3 text-sm text-silver">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
            <span>
              <strong className="text-cloud">{chosen.outbound.flightNumber}</strong> selected. This portfolio demo ends here —
              no reservation is created and no payment can be taken.
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SegmentRow({ seg, label }: { seg: FlightSegment; label: string }) {
  const [, dTime] = seg.departLocal.split(' ');
  const [aDate, aTime] = seg.arriveLocal.split(' ');
  const nextDay = aDate !== seg.departLocal.split(' ')[0];
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
      <div>
        <p className="font-display text-2xl font-semibold tabular-nums">{dTime}</p>
        <p className="font-mono text-xs tracking-widest text-silver">{seg.from}</p>
      </div>
      <div className="flex flex-col items-center px-2">
        <p className="text-[0.6rem] uppercase tracking-[0.18em] text-muted">
          {label} · {duration(seg.durationMin)}
        </p>
        <div className="relative my-2 h-px w-full bg-silver/20">
          <Plane size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-navy-900 text-gold" aria-hidden="true" />
        </div>
        <p className="text-[0.6rem] text-muted">
          {seg.flightNumber} · {seg.aircraft} · non-stop
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-2xl font-semibold tabular-nums">
          {aTime}
          {nextDay ? <sup className="ml-0.5 text-xs text-gold">+1</sup> : null}
        </p>
        <p className="font-mono text-xs tracking-widest text-silver">{seg.to}</p>
      </div>
    </div>
  );
}
