/**
 * MOTORCYCLE CATALOGUE — DEMO DATA
 * ------------------------------------------------------------------
 * ⚠️  Everything in this file is DEMO CONTENT.
 *
 * The models below are fictional designs created for this showcase.
 * Their specifications, prices and features are illustrative only and
 * do not describe any real motorcycle. Replace this file (or feed the
 * same shape from a CMS / API) with the dealership's real inventory.
 *
 * Shape notes:
 *  - `model3d` is optional. When present the 3D viewer loads the GLB;
 *    when absent the viewer shows a clear "3D model not yet available"
 *    state with the gallery image instead.
 *  - `paints[].tint` is applied in-shader on top of the model's baked
 *    texture (see `src/three/paintMaterial.ts`). `null` = factory paint.
 */

export type Category = 'Naked' | 'Adventure' | 'Heritage';

export interface SpecItem {
  label: string;
  value: string;
}

export interface PaintOption {
  id: string;
  name: string;
  /** Swatch colour shown in the UI */
  swatch: string;
  /** Target paint colour for the 3D recolour; null keeps the factory texture */
  tint: string | null;
  /** Optional roughness override for the paint (0 = mirror, 1 = matte) */
  roughness?: number;
  /** Rendered still for this paint, used in cards / fallbacks */
  image: string;
}

export interface Model3D {
  url: string;
  /**
   * Hue (0–1) of the factory paint baked into the texture. The shader
   * replaces pixels near this hue with the selected paint colour.
   */
  paintHue: number;
  /** Hue tolerance (0–0.5). Wider = more of the texture gets recoloured. */
  hueRange: number;
  /** Minimum saturation for a pixel to count as paint. */
  minSaturation: number;
  /** Typical brightness of the factory paint, used to preserve shading. */
  paintValue: number;
  /** Rotation (radians, Y axis) so the bike faces +X (right) at rest. */
  yaw: number;
  /** Optional uniform scale tweak after auto-normalisation. */
  scale?: number;
}

export interface Motorcycle {
  id: string;
  name: string;
  category: Category;
  headline: string;
  summary: string;
  /** Short spec used on cards, e.g. "1,078 cc · 152 hp" */
  keySpec: string;
  /** null = price on request */
  priceFrom: number | null;
  currency: 'USD' | 'EUR' | 'GBP' | 'ILS';
  isDemo: true;
  model3d?: Model3D;
  paints: PaintOption[];
  performance: SpecItem[];
  dimensions: SpecItem[];
  features: { title: string; body: string }[];
  gallery: { src: string; alt: string; caption: string }[];
}

const img = (file: string) => `${import.meta.env.BASE_URL}images/${file}`;
const glb = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;

export const motorcycles: Motorcycle[] = [
  {
    id: 'strada-rs',
    name: 'Strada RS',
    category: 'Naked',
    headline: 'Raw torque. Precise poise.',
    summary:
      'A hyper-naked built around a compact inline-four and a trellis frame. Aggressive, communicative and calm when you need it to be.',
    keySpec: '998 cc · 148 hp',
    priceFrom: 18900,
    currency: 'USD',
    isDemo: true,
    model3d: {
      url: glb('strada-rs.glb'),
      paintHue: 0.99,
      hueRange: 0.06,
      minSaturation: 0.35,
      paintValue: 0.55,
      yaw: -Math.PI / 2,
    },
    paints: [
      { id: 'crimson', name: 'Crimson Gloss', swatch: '#8f1420', tint: null, image: img('strada-rs-crimson.webp') },
      { id: 'graphite', name: 'Graphite Matte', swatch: '#2a2c30', tint: '#2a2c30', roughness: 0.62, image: img('strada-rs-graphite.webp') },
      { id: 'arctic', name: 'Arctic Silver', swatch: '#b9bdc3', tint: '#b9bdc3', image: img('strada-rs-arctic.webp') },
      { id: 'amber', name: 'Solar Amber', swatch: '#c8771a', tint: '#c8771a', image: img('strada-rs-amber.webp') },
    ],
    performance: [
      { label: 'Engine', value: 'Inline-four, liquid-cooled, DOHC 16v' },
      { label: 'Displacement', value: '998 cc' },
      { label: 'Max power', value: '148 hp @ 11,500 rpm' },
      { label: 'Max torque', value: '108 Nm @ 9,000 rpm' },
      { label: 'Transmission', value: '6-speed, bi-directional quickshifter' },
      { label: 'Riding modes', value: 'Rain · Road · Sport · Track' },
    ],
    dimensions: [
      { label: 'Wet weight', value: '201 kg' },
      { label: 'Seat height', value: '830 mm' },
      { label: 'Wheelbase', value: '1,435 mm' },
      { label: 'Fuel capacity', value: '16.5 L' },
      { label: 'Front suspension', value: '43 mm USD fork, fully adjustable' },
      { label: 'Brakes', value: '320 mm discs, radial 4-piston calipers' },
    ],
    features: [
      { title: 'Six-axis IMU', body: 'Lean-sensitive traction control, ABS and wheelie management calibrated per riding mode.' },
      { title: 'Single-sided swingarm', body: 'Cast aluminium arm that keeps the rear wheel fully on show.' },
      { title: '5" TFT cockpit', body: 'Bonded-glass display with phone pairing and turn-by-turn prompts.' },
      { title: 'Full LED lighting', body: 'Signature daytime running light and self-cancelling indicators.' },
    ],
    gallery: [
      { src: img('strada-rs-crimson.webp'), alt: 'Strada RS three-quarter front view in Crimson Gloss', caption: 'Three-quarter front' },
      { src: img('strada-rs-side.webp'), alt: 'Strada RS side profile', caption: 'Profile' },
      { src: img('strada-rs-rear.webp'), alt: 'Strada RS three-quarter rear view', caption: 'Three-quarter rear' },
      { src: img('strada-rs-studio.webp'), alt: 'Strada RS studio concept photograph', caption: 'Studio concept' },
    ],
  },
  {
    id: 'ventura-gt',
    name: 'Ventura GT',
    category: 'Adventure',
    headline: 'Any road. Every road.',
    summary:
      'A long-legged adventure tourer with a smooth triple, long-travel suspension and the comfort to cross continents.',
    keySpec: '1,160 cc · 136 hp',
    priceFrom: 21400,
    currency: 'USD',
    isDemo: true,
    model3d: {
      url: glb('ventura-gt.glb'),
      paintHue: 0.6,
      hueRange: 0.08,
      minSaturation: 0.3,
      paintValue: 0.5,
      yaw: 0,
    },
    paints: [
      { id: 'sapphire', name: 'Sapphire Metallic', swatch: '#1f3f86', tint: null, image: img('ventura-gt-sapphire.webp') },
      { id: 'bronze', name: 'Desert Bronze', swatch: '#8f6b3a', tint: '#9a7442', image: img('ventura-gt-bronze.webp') },
      { id: 'graphite', name: 'Graphite Matte', swatch: '#2a2c30', tint: '#2a2c30', roughness: 0.62, image: img('ventura-gt-graphite.webp') },
    ],
    performance: [
      { label: 'Engine', value: 'Inline-triple, liquid-cooled, DOHC 12v' },
      { label: 'Displacement', value: '1,160 cc' },
      { label: 'Max power', value: '136 hp @ 9,500 rpm' },
      { label: 'Max torque', value: '125 Nm @ 7,000 rpm' },
      { label: 'Transmission', value: '6-speed, slip-assist clutch' },
      { label: 'Riding modes', value: 'Rain · Road · Off-road · Rider' },
    ],
    dimensions: [
      { label: 'Wet weight', value: '242 kg' },
      { label: 'Seat height', value: '850 – 870 mm (adjustable)' },
      { label: 'Wheelbase', value: '1,560 mm' },
      { label: 'Fuel capacity', value: '20 L' },
      { label: 'Suspension travel', value: '220 mm front / 230 mm rear' },
      { label: 'Wheels', value: '21" front / 18" rear, tubeless spoked' },
    ],
    features: [
      { title: 'Semi-active suspension', body: 'Damping adapts in real time; preload set from the handlebar.' },
      { title: 'Adjustable screen', body: 'One-hand height adjustment across 50 mm of travel.' },
      { title: 'Cornering lights', body: 'Lean-activated auxiliary LEDs illuminate the inside of the bend.' },
      { title: 'Heated grips & cruise', body: 'Five-level heated grips and electronic cruise control as standard.' },
    ],
    gallery: [
      { src: img('ventura-gt-sapphire.webp'), alt: 'Ventura GT three-quarter front view in Sapphire Metallic', caption: 'Three-quarter front' },
      { src: img('ventura-gt-side.webp'), alt: 'Ventura GT side profile', caption: 'Profile' },
      { src: img('ventura-gt-rear.webp'), alt: 'Ventura GT three-quarter rear view', caption: 'Three-quarter rear' },
      { src: img('ventura-gt-studio.webp'), alt: 'Ventura GT studio concept photograph', caption: 'Studio concept' },
    ],
  },
  {
    id: 'classica-900',
    name: 'Classica 900',
    category: 'Heritage',
    headline: 'Old soul. Modern manners.',
    summary:
      'A café racer with an air-cooled parallel twin, hand-stitched leather and the clean lines of the sixties — plus ABS and traction control.',
    keySpec: '900 cc · 68 hp',
    priceFrom: 11900,
    currency: 'USD',
    isDemo: true,
    model3d: {
      url: glb('classica-900.glb'),
      paintHue: 0.38,
      hueRange: 0.08,
      minSaturation: 0.3,
      paintValue: 0.27,
      yaw: -Math.PI / 2,
    },
    paints: [
      { id: 'racing-green', name: 'Racing Green', swatch: '#14512c', tint: null, image: img('classica-900-racing-green.webp') },
      { id: 'oxblood', name: 'Oxblood', swatch: '#5b1a1c', tint: '#5b1a1c', image: img('classica-900-oxblood.webp') },
      { id: 'ivory', name: 'Ivory', swatch: '#d9d1bd', tint: '#d9d1bd', image: img('classica-900-ivory.webp') },
    ],
    performance: [
      { label: 'Engine', value: 'Parallel twin, air/oil-cooled, SOHC 8v' },
      { label: 'Displacement', value: '900 cc' },
      { label: 'Max power', value: '68 hp @ 7,250 rpm' },
      { label: 'Max torque', value: '80 Nm @ 5,000 rpm' },
      { label: 'Transmission', value: '6-speed, assist-and-slipper clutch' },
      { label: 'Riding modes', value: 'Road · Rain' },
    ],
    dimensions: [
      { label: 'Wet weight', value: '206 kg' },
      { label: 'Seat height', value: '805 mm' },
      { label: 'Wheelbase', value: '1,400 mm' },
      { label: 'Fuel capacity', value: '13.7 L' },
      { label: 'Front suspension', value: '41 mm telescopic fork' },
      { label: 'Wheels', value: '18" wire-spoke, front and rear' },
    ],
    features: [
      { title: 'Hand-stitched seat', body: 'Tan leather single seat with a removable passenger cowl.' },
      { title: 'Twin-pod clocks', body: 'Analogue speedometer and tachometer with a discreet LCD inset.' },
      { title: 'Peashooter exhausts', body: 'Polished stainless silencers tuned for a deep, even beat.' },
      { title: 'Modern safety', body: 'Dual-channel ABS and switchable traction control.' },
    ],
    gallery: [
      { src: img('classica-900-racing-green.webp'), alt: 'Classica 900 three-quarter front view in Racing Green', caption: 'Three-quarter front' },
      { src: img('classica-900-side.webp'), alt: 'Classica 900 side profile', caption: 'Profile' },
      { src: img('classica-900-rear.webp'), alt: 'Classica 900 three-quarter rear view', caption: 'Three-quarter rear' },
      { src: img('classica-900-studio.webp'), alt: 'Classica 900 studio concept photograph', caption: 'Studio concept' },
    ],
  },
];

export const categories: ('All' | Category)[] = ['All', 'Naked', 'Adventure', 'Heritage'];

export function formatPrice(m: Motorcycle): string {
  if (m.priceFrom == null) return 'Price on request';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: m.currency,
    maximumFractionDigits: 0,
  }).format(m.priceFrom);
}

export const getMotorcycle = (id: string) => motorcycles.find((m) => m.id === id) ?? motorcycles[0];
