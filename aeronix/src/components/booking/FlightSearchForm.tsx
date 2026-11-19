import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeftRight, Minus, Plus, Search, Users } from 'lucide-react';
import type { FlightSearchQuery, Passengers, TravelClass, TripType } from '../../types';
import { airports, travelClasses } from '../../data/flights';
import {
  addDaysISO,
  MAX_ADVANCE_DAYS,
  MAX_PASSENGERS,
  passengerSummary,
  todayISO,
  validateQuery,
  type ValidationErrors,
} from '../../services/bookingService';
import { Button } from '../ui/Button';

interface Props {
  initialDestination?: string;
  loading: boolean;
  onSearch: (q: FlightSearchQuery) => void;
}

const fieldBase =
  'w-full rounded-xl border bg-navy-950/60 px-4 py-3.5 text-cloud outline-none transition placeholder:text-muted focus:border-gold';

export function FlightSearchForm({ initialDestination, loading, onSearch }: Props) {
  const today = todayISO();
  const [tripType, setTripType] = useState<TripType>('round');
  const [origin, setOrigin] = useState('LHR');
  const [destination, setDestination] = useState(
    initialDestination && airports.some((a) => a.code === initialDestination) && initialDestination !== 'LHR' ? initialDestination : '',
  );
  const [departDate, setDepartDate] = useState(addDaysISO(today, 14));
  const [returnDate, setReturnDate] = useState(addDaysISO(today, 21));
  const [passengers, setPassengers] = useState<Passengers>({ adults: 1, children: 0, infants: 0 });
  const [travelClass, setTravelClass] = useState<TravelClass>('business');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const query: FlightSearchQuery = {
    tripType,
    origin,
    destination,
    departDate,
    returnDate: tripType === 'round' ? returnDate : undefined,
    passengers,
    travelClass,
  };

  // Live re-validation after the first submit attempt
  useEffect(() => {
    if (submitted) setErrors(validateQuery(query, today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripType, origin, destination, departDate, returnDate, passengers, submitted]);

  // When the departure moves past the return date, carry the return along (only on departure changes,
  // so a user-entered invalid return date is reported by validation rather than silently overwritten).
  const changeDepart = (value: string) => {
    setDepartDate(value);
    if (value && returnDate < value) setReturnDate(value);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const v = validateQuery(query, today);
    setErrors(v);
    if (Object.keys(v).length === 0) onSearch(query);
    else {
      const firstKey = Object.keys(v)[0];
      document.getElementById(`field-${firstKey}`)?.focus();
    }
  };

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  return (
    <form onSubmit={submit} noValidate className="glass rounded-3xl p-5 md:p-8" aria-label="Flight search">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="radiogroup" aria-label="Trip type" className="inline-flex rounded-full border border-silver/20 p-1">
          {(
            [
              ['round', 'Round trip'],
              ['oneway', 'One way'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={tripType === id}
              onClick={() => setTripType(id)}
              className={`rounded-full px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] transition ${
                tripType === id ? 'bg-cloud text-navy-950' : 'text-silver hover:text-cloud'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="demo-badge">Demo booking engine</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr]">
        <Field id="origin" label="From" error={errors.origin}>
          <select
            id="field-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className={`${fieldBase} ${errors.origin ? 'border-red-400/70' : 'border-silver/20'}`}
            aria-invalid={!!errors.origin}
            aria-describedby={errors.origin ? 'err-origin' : undefined}
          >
            <option value="">Select origin</option>
            {airports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} — {a.name} ({a.code})
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          onClick={swap}
          aria-label="Swap origin and destination"
          className="mx-auto mt-0 inline-flex h-11 w-11 items-center justify-center self-end rounded-full border border-silver/25 text-silver transition hover:rotate-180 hover:border-gold hover:text-gold md:mb-1"
        >
          <ArrowLeftRight size={16} />
        </button>
        <Field id="destination" label="To" error={errors.destination}>
          <select
            id="field-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={`${fieldBase} ${errors.destination ? 'border-red-400/70' : 'border-silver/20'}`}
            aria-invalid={!!errors.destination}
            aria-describedby={errors.destination ? 'err-destination' : undefined}
          >
            <option value="">Select destination</option>
            {airports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} — {a.name} ({a.code})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="departDate" label="Departure" error={errors.departDate}>
          <input
            id="field-departDate"
            type="date"
            value={departDate}
            min={today}
            max={addDaysISO(today, MAX_ADVANCE_DAYS)}
            onChange={(e) => changeDepart(e.target.value)}
            className={`${fieldBase} ${errors.departDate ? 'border-red-400/70' : 'border-silver/20'}`}
            aria-invalid={!!errors.departDate}
            aria-describedby={errors.departDate ? 'err-departDate' : undefined}
          />
        </Field>
        <Field id="returnDate" label="Return" error={errors.returnDate}>
          <input
            id="field-returnDate"
            type="date"
            value={tripType === 'round' ? returnDate : ''}
            min={departDate || today}
            max={addDaysISO(today, MAX_ADVANCE_DAYS)}
            disabled={tripType === 'oneway'}
            onChange={(e) => setReturnDate(e.target.value)}
            className={`${fieldBase} disabled:cursor-not-allowed disabled:opacity-40 ${errors.returnDate ? 'border-red-400/70' : 'border-silver/20'}`}
            aria-invalid={!!errors.returnDate}
            aria-describedby={errors.returnDate ? 'err-returnDate' : undefined}
          />
        </Field>
        <Field id="passengers" label="Passengers" error={errors.passengers}>
          <PassengerPicker value={passengers} onChange={setPassengers} invalid={!!errors.passengers} />
        </Field>
        <Field id="class" label="Travel class">
          <select
            id="field-class"
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value as TravelClass)}
            className={`${fieldBase} border-silver/20`}
          >
            {travelClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted">Fictional demonstration data only. No live availability, no payments.</p>
        <Button type="submit" size="lg" disabled={loading} icon={<Search size={16} />} className="justify-center">
          {loading ? 'Searching…' : 'Search flights'}
        </Button>
      </div>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`field-${id}`} className="eyebrow !text-[0.6rem]">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`err-${id}`} role="alert" className="text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PassengerPicker({ value, onChange, invalid }: { value: Passengers; onChange: (p: Passengers) => void; invalid: boolean }) {
  const [open, setOpen] = useState(false);
  const popId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const total = value.adults + value.children + value.infants;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const rows: { key: keyof Passengers; label: string; hint: string; min: number }[] = [
    { key: 'adults', label: 'Adults', hint: '12+ years', min: 1 },
    { key: 'children', label: 'Children', hint: '2–11 years', min: 0 },
    { key: 'infants', label: 'Infants', hint: 'Under 2, on lap', min: 0 },
  ];

  return (
    <div ref={wrap} className="relative">
      <button
        id="field-passengers"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'err-passengers' : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`${fieldBase} flex items-center gap-3 text-left ${invalid ? 'border-red-400/70' : 'border-silver/20'}`}
      >
        <Users size={16} className="shrink-0 text-gold" aria-hidden="true" />
        <span className="truncate text-sm">{passengerSummary(value)}</span>
      </button>
      {open ? (
        <div
          id={popId}
          role="dialog"
          aria-label="Choose passengers"
          className="absolute left-0 right-0 top-full z-30 mt-2 min-w-[260px] rounded-2xl border border-silver/15 bg-navy-900 p-4 shadow-2xl"
        >
          {rows.map((r) => {
            const v = value[r.key];
            const maxReached = total >= MAX_PASSENGERS || (r.key === 'infants' && value.infants >= value.adults);
            return (
              <div key={r.key} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-cloud">{r.label}</p>
                  <p className="text-xs text-muted">{r.hint}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Stepper
                    label={`Remove one ${r.label.toLowerCase().replace(/s$/, '')}`}
                    disabled={v <= r.min}
                    onClick={() => {
                      const next = { ...value, [r.key]: v - 1 };
                      if (r.key === 'adults' && next.infants > next.adults) next.infants = next.adults;
                      onChange(next);
                    }}
                  >
                    <Minus size={14} />
                  </Stepper>
                  <span className="w-5 text-center tabular-nums" aria-live="polite">
                    {v}
                  </span>
                  <Stepper
                    label={`Add one ${r.label.toLowerCase().replace(/s$/, '')}`}
                    disabled={maxReached}
                    onClick={() => onChange({ ...value, [r.key]: v + 1 })}
                  >
                    <Plus size={14} />
                  </Stepper>
                </div>
              </div>
            );
          })}
          <p className="mt-2 text-[0.65rem] text-muted">Up to {MAX_PASSENGERS} passengers. One infant per adult.</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-xl bg-cloud py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-navy-950"
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Stepper({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-silver/25 text-cloud transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
