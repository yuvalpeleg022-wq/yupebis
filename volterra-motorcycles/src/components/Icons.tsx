/* Minimal inline icon set (stroke icons, 24px grid). */
import type { SVGProps } from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const ArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 12h15M13 6l6 6-6 6" /></svg>
);
export const ArrowDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 4v15M6 13l6 6 6-6" /></svg>
);
export const Plus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const Minus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M5 12h14" /></svg>
);
export const Reset = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></svg>
);
export const Rotate = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M3 12c0 2.2 4 4 9 4s9-1.8 9-4-4-4-9-4" /><path d="M9 13l3 3-3 3" /></svg>
);
export const Close = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const Menu = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 8h16M4 16h16" /></svg>
);
export const Check = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const ChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M15 5l-7 7 7 7" /></svg>
);
export const ChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M9 5l7 7-7 7" /></svg>
);
export const Expand = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
export const Hand = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12m0-1.5v-6a1.5 1.5 0 0 1 3 0V12m0-4.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.7 15a1.5 1.5 0 0 1 2.5-1.7L8 15.5" /></svg>
);
export const Alert = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17.5v.01" /></svg>
);
