export type Vec3 = [number, number, number];

export interface Destination {
  id: string;
  city: string;
  country: string;
  iata: string;
  lat: number;
  lon: number;
  description: string;
  highlight: string;
  /** Hue used by the placeholder artwork until real photography is supplied. */
  hue: number;
  /** Optional licensed photo (relative to /public). When absent, procedural artwork is shown. */
  image?: string;
  imageAlt: string;
  /** Illustrative block time from the fictional hub, in hours. */
  illustrativeHours: number;
}

export interface FleetAircraft {
  id: string;
  name: string;
  category: string;
  tagline: string;
  passengers: number;
  cabins: string[];
  rangeKm: number;
  cruiseMach: number;
  lengthM: number;
  wingspanM: number;
  engines: number;
  /** Proportions used by the procedural profile drawing and 3D viewer scale. */
  profile: { length: number; span: number; engines: 2 | 4 };
  description: string;
}

export type TravelClass = 'economy' | 'premium' | 'business' | 'first';
export type TripType = 'round' | 'oneway';

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
}

export interface Passengers {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightSearchQuery {
  tripType: TripType;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers: Passengers;
  travelClass: TravelClass;
}

export interface FlightSegment {
  flightNumber: string;
  from: string;
  to: string;
  departLocal: string;
  arriveLocal: string;
  durationMin: number;
  aircraft: string;
}

export interface FlightOffer {
  id: string;
  outbound: FlightSegment;
  inbound?: FlightSegment;
  travelClass: TravelClass;
  /** Illustrative fare in EUR — not a real price. */
  illustrativeFare: number;
  seatsLeftDemo: number;
}

export type DeviceTier = 'high' | 'medium' | 'low';

export interface QualitySettings {
  tier: DeviceTier;
  dpr: [number, number];
  fuselageSegments: number;
  liveryWidth: number;
  cloudCount: number;
  cloudSegments: number;
  shadows: boolean;
  lightRays: boolean;
  reducedMotion: boolean;
}
