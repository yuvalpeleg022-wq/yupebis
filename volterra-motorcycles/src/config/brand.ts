/**
 * BRAND & DEALERSHIP CONFIG
 * ------------------------------------------------------------------
 * Every piece of brand / business identity used across the site lives
 * here. Replace these values with the real dealership details.
 *
 * Everything below is PLACEHOLDER content. No real address, phone
 * number or social account is implied.
 */
export const brand = {
  name: 'Volterra',
  fullName: 'Volterra Motorcycles',
  tagline: 'Engineered for the long way home.',
  description:
    'An independent premium motorcycle showroom. Hand-picked machines, honest advice, and a test ride on every model we sell.',

  contact: {
    // PLACEHOLDER — replace with real details
    phone: '+00 (0) 000 000 000',
    phoneHref: null as string | null, // e.g. 'tel:+441234567890' once real
    email: 'hello@your-dealership.example',
    emailHref: null as string | null, // e.g. 'mailto:sales@dealer.com' once real
    addressLines: ['Showroom address placeholder', 'City, Postcode', 'Country'],
    mapUrl: null as string | null, // e.g. Google Maps link once real
    hours: [
      { days: 'Tue – Fri', time: '10:00 – 18:00' },
      { days: 'Saturday', time: '09:00 – 17:00' },
      { days: 'Sun – Mon', time: 'Closed' },
    ],
  },

  // PLACEHOLDER — set `url` to the real profile to activate each link.
  social: [
    { label: 'Instagram', url: null as string | null },
    { label: 'YouTube', url: null as string | null },
    { label: 'Facebook', url: null as string | null },
  ],

  established: '20XX', // PLACEHOLDER
} as const;

export const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'motorcycles', label: 'Motorcycles' },
  { id: 'experience', label: '3D Experience' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;

export type SectionId = (typeof navItems)[number]['id'] | 'details';
