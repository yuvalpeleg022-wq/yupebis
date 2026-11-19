import { memo, useId } from 'react';

type Variant = 'first' | 'business' | 'economy' | 'design';

const palettes: Record<Variant, { wall: string; seat: string; accent: string; light: string; rows: number }> = {
  first: { wall: '#1a2f47', seat: '#3a2f25', accent: '#C5A46D', light: '#ffe7b8', rows: 3 },
  business: { wall: '#16314f', seat: '#22384f', accent: '#AEBBC8', light: '#dfe9f5', rows: 5 },
  economy: { wall: '#183A5A', seat: '#0B1F35', accent: '#7893AC', light: '#e8f0f8', rows: 9 },
  design: { wall: '#0f2740', seat: '#2b3b4d', accent: '#C5A46D', light: '#fff1d6', rows: 6 },
};

/**
 * Perspective cabin illustration used as a clearly-labelled placeholder for
 * cabin photography (see ASSET_REQUIREMENTS.md).
 */
export const CabinArtwork = memo(function CabinArtwork({ variant, alt, image }: { variant: Variant; alt: string; image?: string }) {
  const uid = useId().replace(/:/g, '');
  if (image) return <img src={image} alt={alt} loading="lazy" className="h-full w-full object-cover" />;
  const p = palettes[variant];
  const vx = 400;
  const vy = 230;
  const rows = Array.from({ length: p.rows }, (_, i) => i);
  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label={alt}>
        <defs>
          <radialGradient id={`glow-${uid}`} cx="0.5" cy="0.42" r="0.6">
            <stop offset="0" stopColor={p.light} stopOpacity="0.55" />
            <stop offset="1" stopColor={p.wall} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1f35" />
            <stop offset="1" stopColor="#050f1d" />
          </linearGradient>
        </defs>
        <rect width="800" height="520" fill={p.wall} />
        {/* ceiling arch */}
        <path d={`M0,0 H800 V120 Q${vx},${vy - 120} 0,120 Z`} fill="#0b1f35" opacity="0.7" />
        {/* floor */}
        <path d={`M0,520 L${vx - 40},${vy + 20} H${vx + 40} L800,520 Z`} fill={`url(#floor-${uid})`} />
        {/* aisle light strip */}
        <path d={`M370,520 L${vx - 4},${vy + 20} H${vx + 4} L430,520 Z`} fill={p.accent} opacity="0.25" />
        {/* side windows */}
        {rows.map((i) => {
          const t = 1 - i / (p.rows + 1);
          const s = 0.25 + t * 0.75;
          const xl = vx - (vx - 30) * t;
          const xr = vx + (vx - 30) * t;
          const y = vy - 70 * t;
          return (
            <g key={`w${i}`} opacity={0.4 + t * 0.6}>
              <rect x={xl - 9 * s} y={y - 18 * s} width={18 * s} height={30 * s} rx={8 * s} fill={p.light} opacity="0.75" />
              <rect x={xr - 9 * s} y={y - 18 * s} width={18 * s} height={30 * s} rx={8 * s} fill={p.light} opacity="0.75" />
            </g>
          );
        })}
        {/* seats */}
        {rows
          .slice()
          .reverse()
          .map((i) => {
            const t = 1 - i / (p.rows + 1);
            const s = 0.2 + t * 0.9;
            const off = 80 + 250 * t;
            const y = vy + 20 + 240 * t * t;
            const w = (variant === 'economy' ? 120 : 150) * s;
            const h = 150 * s;
            return (
              <g key={`s${i}`}>
                {[-1, 1].map((side) => (
                  <g key={side}>
                    <rect x={vx + side * off - w / 2} y={y - h} width={w} height={h} rx={18 * s} fill={p.seat} />
                    <rect x={vx + side * off - w / 2} y={y - h} width={w} height={6 * s} rx={3 * s} fill={p.accent} opacity="0.8" />
                  </g>
                ))}
              </g>
            );
          })}
        <rect width="800" height="520" fill={`url(#glow-${uid})`} />
      </svg>
      <span className="absolute right-3 top-3 rounded-full bg-navy-950/70 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.2em] text-silver backdrop-blur">
        Placeholder illustration
      </span>
    </div>
  );
});
