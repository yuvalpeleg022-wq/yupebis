import type { Destination } from '../types';

/**
 * Demonstration destinations for the fictional AERONIX AIRWAYS network.
 * Coordinates are approximate city centres. Block times are illustrative only.
 */
export const HUB = { city: 'London', iata: 'LHR', lat: 51.47, lon: -0.45 } as const;

export const destinations: Destination[] = [
  {
    id: 'london',
    city: 'London',
    country: 'United Kingdom',
    iata: 'LHR',
    lat: 51.507,
    lon: -0.128,
    description:
      'Our home port. Royal parks at dawn, a skyline written in centuries, and an evening that always ends somewhere unexpected.',
    highlight: 'Fictional network hub',
    hue: 212,
    imageAlt: 'Illustrative artwork of the London skyline at blue hour',
    illustrativeHours: 0,
  },
  {
    id: 'paris',
    city: 'Paris',
    country: 'France',
    iata: 'CDG',
    lat: 48.857,
    lon: 2.352,
    description:
      'Wide boulevards, stone the colour of champagne and a quiet confidence that turns an afternoon into an occasion.',
    highlight: 'Art, cuisine, couture',
    hue: 32,
    imageAlt: 'Illustrative artwork of Paris rooftops in warm evening light',
    illustrativeHours: 1.3,
  },
  {
    id: 'new-york',
    city: 'New York',
    country: 'United States',
    iata: 'JFK',
    lat: 40.713,
    lon: -74.006,
    description:
      'A vertical city of light. Arrive in the morning, and by nightfall Manhattan will have rewritten your itinerary.',
    highlight: 'Skyline, culture, energy',
    hue: 222,
    imageAlt: 'Illustrative artwork of the Manhattan skyline at night',
    illustrativeHours: 8,
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    iata: 'HND',
    lat: 35.676,
    lon: 139.65,
    description:
      'Precision and poetry in equal measure — neon avenues, silent gardens and the most considered hospitality on earth.',
    highlight: 'Design, gastronomy, calm',
    hue: 338,
    imageAlt: 'Illustrative artwork of Tokyo towers under a violet dusk',
    illustrativeHours: 13.5,
  },
  {
    id: 'rome',
    city: 'Rome',
    country: 'Italy',
    iata: 'FCO',
    lat: 41.903,
    lon: 12.496,
    description:
      'Two thousand years of ambition, softened by espresso, terracotta light and long Roman evenings.',
    highlight: 'History, piazzas, light',
    hue: 18,
    imageAlt: 'Illustrative artwork of Roman domes at golden hour',
    illustrativeHours: 2.6,
  },
  {
    id: 'singapore',
    city: 'Singapore',
    country: 'Singapore',
    iata: 'SIN',
    lat: 1.352,
    lon: 103.82,
    description:
      'A garden city of the future, where tropical greenery climbs glass towers and every hawker stall is a masterclass.',
    highlight: 'Gardens, skyline, flavour',
    hue: 168,
    imageAlt: 'Illustrative artwork of the Singapore waterfront skyline',
    illustrativeHours: 13,
  },
  {
    id: 'dubai',
    city: 'Dubai',
    country: 'United Arab Emirates',
    iata: 'DXB',
    lat: 25.205,
    lon: 55.271,
    description:
      'Desert horizons meet record-breaking architecture. Effortless luxury, golden dunes and nights that shimmer.',
    highlight: 'Desert, architecture, luxury',
    hue: 40,
    imageAlt: 'Illustrative artwork of the Dubai skyline rising from the desert',
    illustrativeHours: 7,
  },
  {
    id: 'bangkok',
    city: 'Bangkok',
    country: 'Thailand',
    iata: 'BKK',
    lat: 13.756,
    lon: 100.502,
    description:
      'Gilded temples, river light and an unforgettable street-food symphony in the city of angels.',
    highlight: 'Temples, river, street food',
    hue: 268,
    imageAlt: 'Illustrative artwork of Bangkok temples along the river at dusk',
    illustrativeHours: 11.5,
  },
];

export const routeDestinations = destinations.filter((d) => d.id !== 'london');
