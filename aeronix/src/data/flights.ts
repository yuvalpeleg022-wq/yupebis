import type { Airport, TravelClass } from '../types';

/**
 * Airports used by the DEMONSTRATION booking engine. IATA codes are real
 * identifiers; every flight generated from them is fictional.
 */
export const airports: Airport[] = [
  { code: 'LHR', city: 'London', name: 'Heathrow', country: 'United Kingdom' },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle', country: 'France' },
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy', country: 'United States' },
  { code: 'HND', city: 'Tokyo', name: 'Haneda', country: 'Japan' },
  { code: 'FCO', city: 'Rome', name: 'Fiumicino', country: 'Italy' },
  { code: 'SIN', city: 'Singapore', name: 'Changi', country: 'Singapore' },
  { code: 'DXB', city: 'Dubai', name: 'Dubai International', country: 'United Arab Emirates' },
  { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi', country: 'Thailand' },
];

export const travelClasses: { id: TravelClass; label: string }[] = [
  { id: 'economy', label: 'Economy' },
  { id: 'premium', label: 'Premium Economy' },
  { id: 'business', label: 'Business' },
  { id: 'first', label: 'First' },
];

/** Approximate coordinates for illustrative distance-based durations. */
export const airportCoords: Record<string, [number, number]> = {
  LHR: [51.47, -0.45],
  CDG: [49.01, 2.55],
  JFK: [40.64, -73.78],
  HND: [35.55, 139.78],
  FCO: [41.8, 12.25],
  SIN: [1.36, 103.99],
  DXB: [25.25, 55.36],
  BKK: [13.69, 100.75],
};

export const classMultiplier: Record<TravelClass, number> = {
  economy: 1,
  premium: 1.7,
  business: 3.6,
  first: 6.2,
};
