import type { FlightOffer, FlightSearchQuery, FlightSegment, Passengers } from '../types';
import { airportCoords, classMultiplier } from '../data/flights';
import { greatCircleKm, hashString, seeded } from '../utils/math';

/**
 * Booking architecture.
 * The UI depends only on the `FlightSearchProvider` interface. The portfolio build ships
 * `DemoFlightProvider`, which generates deterministic FICTIONAL results locally.
 * A future integration (e.g. an NDC / GDS-backed API) implements the same interface and is
 * swapped in via `getFlightProvider()` — no UI changes required.
 */
export interface FlightSearchProvider {
  readonly isDemo: boolean;
  search(query: FlightSearchQuery, signal?: AbortSignal): Promise<FlightOffer[]>;
}

export interface ValidationErrors {
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  passengers?: string;
}

/** Today's date in the visitor's local time zone, as YYYY-MM-DD. */
export function todayISO(now = new Date()) {
  return toLocalISO(now);
}

export function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return toLocalISO(new Date(y, m - 1, d + days));
}

export const MAX_PASSENGERS = 9;
export const MAX_ADVANCE_DAYS = 355;

export function validateQuery(q: FlightSearchQuery, today = todayISO()): ValidationErrors {
  const e: ValidationErrors = {};
  if (!q.origin) e.origin = 'Select a departure airport.';
  if (!q.destination) e.destination = 'Select a destination airport.';
  if (q.origin && q.destination && q.origin === q.destination) e.destination = 'Destination must differ from origin.';
  if (!q.departDate) e.departDate = 'Choose a departure date.';
  else if (q.departDate < today) e.departDate = 'Departure date cannot be in the past.';
  else if (q.departDate > addDaysISO(today, MAX_ADVANCE_DAYS)) e.departDate = `Bookings open ${MAX_ADVANCE_DAYS} days ahead.`;
  if (q.tripType === 'round') {
    if (!q.returnDate) e.returnDate = 'Choose a return date.';
    else if (q.departDate && q.returnDate < q.departDate) e.returnDate = 'Return must be on or after departure.';
    else if (q.returnDate > addDaysISO(today, MAX_ADVANCE_DAYS)) e.returnDate = `Bookings open ${MAX_ADVANCE_DAYS} days ahead.`;
  }
  const p = q.passengers;
  const total = p.adults + p.children + p.infants;
  if (p.adults < 1) e.passengers = 'At least one adult is required.';
  else if (total > MAX_PASSENGERS) e.passengers = `Up to ${MAX_PASSENGERS} passengers per booking.`;
  else if (p.infants > p.adults) e.passengers = 'Each infant must travel with an adult.';
  return e;
}

export function passengerSummary(p: Passengers) {
  const parts = [`${p.adults} adult${p.adults === 1 ? '' : 's'}`];
  if (p.children) parts.push(`${p.children} child${p.children === 1 ? '' : 'ren'}`);
  if (p.infants) parts.push(`${p.infants} infant${p.infants === 1 ? '' : 's'}`);
  return parts.join(', ');
}

function durationFor(from: string, to: string) {
  const a = airportCoords[from];
  const b = airportCoords[to];
  if (!a || !b) return 180;
  const km = greatCircleKm(a, b);
  return Math.round((km / 850) * 60 + 35); // illustrative: 850 km/h block speed + taxi
}

function hhmm(minutes: number) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function makeSegment(rand: () => number, from: string, to: string, date: string, slot: number): FlightSegment {
  const duration = durationFor(from, to);
  const departMin = [7 * 60 + 15, 11 * 60 + 40, 16 * 60 + 5, 21 * 60 + 30][slot % 4]! + Math.floor(rand() * 4) * 5;
  const arriveMin = departMin + duration; // displayed without time-zone conversion (demo)
  const dayOffset = Math.floor(arriveMin / 1440);
  return {
    flightNumber: `AX ${100 + Math.floor(rand() * 899)}`,
    from,
    to,
    departLocal: `${date} ${hhmm(departMin)}`,
    arriveLocal: `${dayOffset ? addDaysISO(date, dayOffset) : date} ${hhmm(arriveMin)}`,
    durationMin: duration,
    aircraft: duration > 360 ? 'AX-950 Horizon' : duration > 200 ? 'AX-780 Meridian' : 'AX-320 Swift',
  };
}

export class DemoFlightProvider implements FlightSearchProvider {
  readonly isDemo = true;

  async search(query: FlightSearchQuery, signal?: AbortSignal): Promise<FlightOffer[]> {
    // simulate network latency so loading states can be designed & tested
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 700);
      signal?.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
    const rand = seeded(hashString(JSON.stringify(query)));
    const count = 3 + Math.floor(rand() * 2);
    const km = greatCircleKm(airportCoords[query.origin] ?? [0, 0], airportCoords[query.destination] ?? [0, 0]);
    const baseFare = 60 + km * 0.085;
    const pax = query.passengers.adults + query.passengers.children + query.passengers.infants * 0.1;
    return Array.from({ length: count }, (_, i) => {
      const outbound = makeSegment(rand, query.origin, query.destination, query.departDate, i);
      const inbound =
        query.tripType === 'round' && query.returnDate
          ? makeSegment(rand, query.destination, query.origin, query.returnDate, i + 1)
          : undefined;
      const fare = baseFare * classMultiplier[query.travelClass] * (inbound ? 1.85 : 1) * (0.85 + rand() * 0.4) * pax;
      return {
        id: `${query.origin}-${query.destination}-${i}`,
        outbound,
        inbound,
        travelClass: query.travelClass,
        illustrativeFare: Math.round(fare / 5) * 5,
        seatsLeftDemo: 2 + Math.floor(rand() * 7),
      } satisfies FlightOffer;
    }).sort((a, b) => a.outbound.departLocal.localeCompare(b.outbound.departLocal));
  }
}

let provider: FlightSearchProvider | null = null;
/** Swap this for a real API-backed provider when integrating with a booking system. */
export function getFlightProvider(): FlightSearchProvider {
  provider ??= new DemoFlightProvider();
  return provider;
}
