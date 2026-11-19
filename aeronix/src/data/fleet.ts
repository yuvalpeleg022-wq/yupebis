import type { FleetAircraft } from '../types';

/**
 * FICTIONAL DEMONSTRATION DATA.
 * Aircraft names, capacities, cabins and ranges below are invented for the
 * AERONIX AIRWAYS portfolio brand and do not describe any real aircraft type.
 */
export const fleet: FleetAircraft[] = [
  {
    id: 'ax-950',
    name: 'Aeronix AX-950 Horizon',
    category: 'Long-haul wide-body',
    tagline: 'The flagship of the fleet.',
    passengers: 312,
    cabins: ['First Suites', 'Business Studios', 'Premium Economy', 'Economy'],
    rangeKm: 15200,
    cruiseMach: 0.85,
    lengthM: 66.8,
    wingspanM: 64.7,
    engines: 2,
    profile: { length: 1, span: 0.97, engines: 2 },
    description:
      'Our flagship twin-engine wide-body, designed around quiet cabins, softer light and the longest routes in the network.',
  },
  {
    id: 'ax-780',
    name: 'Aeronix AX-780 Meridian',
    category: 'Medium-to-long-haul wide-body',
    tagline: 'Efficiency, refined.',
    passengers: 264,
    cabins: ['Business Studios', 'Premium Economy', 'Economy'],
    rangeKm: 12800,
    cruiseMach: 0.84,
    lengthM: 57.3,
    wingspanM: 60.1,
    engines: 2,
    profile: { length: 0.86, span: 0.9, engines: 2 },
    description:
      'A versatile wide-body that balances range and efficiency — the backbone of our intercontinental schedule.',
  },
  {
    id: 'ax-1000',
    name: 'Aeronix AX-1000 Sovereign',
    category: 'Ultra-long-haul four-engine',
    tagline: 'The grand tourer of the skies.',
    passengers: 420,
    cabins: ['The Residence', 'First Suites', 'Business Studios', 'Economy'],
    rangeKm: 16000,
    cruiseMach: 0.86,
    lengthM: 72.7,
    wingspanM: 79.8,
    engines: 4,
    profile: { length: 1.09, span: 1.2, engines: 4 },
    description:
      'A four-engine statement aircraft with an upper-deck lounge concept, reserved for the most prestigious routes.',
  },
  {
    id: 'ax-320',
    name: 'Aeronix AX-320 Swift',
    category: 'Short-haul narrow-body',
    tagline: 'European agility.',
    passengers: 168,
    cabins: ['Business', 'Economy'],
    rangeKm: 6300,
    cruiseMach: 0.78,
    lengthM: 37.6,
    wingspanM: 35.8,
    engines: 2,
    profile: { length: 0.56, span: 0.55, engines: 2 },
    description:
      'Light, quiet and quick-turning — connecting our hub with the great capitals of Europe several times a day.',
  },
];
