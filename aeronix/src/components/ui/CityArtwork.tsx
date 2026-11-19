import { memo, useId, useMemo } from 'react';
import { hashString, seeded } from '../../utils/math';

interface Props {
  seed: string;
  hue: number;
  alt: string;
  image?: string;
  className?: string;
  showLabel?: boolean;
}

interface Building {
  x: number;
  w: number;
  h: number;
  top: 'flat' | 'spire' | 'dome' | 'step';
}

function skyline(rand: () => number, width: number, minH: number, maxH: number, density: number): Building[] {
  const out: Building[] = [];
  let x = -20;
  while (x < width + 20) {
    const w = 14 + rand() * 46 * density;
    const r = rand();
    const h = minH + Math.pow(rand(), 1.6) * (maxH - minH);
    const top: Building['top'] = r > 0.93 ? 'spire' : r > 0.86 ? 'dome' : r > 0.7 ? 'step' : 'flat';
    out.push({ x, w, h, top });
    x += w + rand() * 6;
  }
  return out;
}

function buildingPath(b: Building, ground: number) {
  const { x, w, h, top } = b;
  const t = ground - h;
  switch (top) {
    case 'spire':
      return `M${x},${ground} V${t} H${x + w * 0.38} L${x + w / 2},${t - h * 0.45} L${x + w * 0.62},${t} H${x + w} V${ground} Z`;
    case 'dome':
      return `M${x},${ground} V${t} A${w / 2},${w / 2.2} 0 0 1 ${x + w},${t} V${ground} Z`;
    case 'step':
      return `M${x},${ground} V${t + h * 0.12} H${x + w * 0.2} V${t} H${x + w * 0.8} V${t + h * 0.12} H${x + w} V${ground} Z`;
    default:
      return `M${x},${ground} V${t} H${x + w} V${ground} Z`;
  }
}

/**
 * Procedural, art-directed placeholder imagery. Replaced automatically by `image`
 * once licensed photography is added (see ASSET_REQUIREMENTS.md).
 */
export const CityArtwork = memo(function CityArtwork({ seed, hue, alt, image, className = '', showLabel = true }: Props) {
  const uid = useId().replace(/:/g, '');
  const scene = useMemo(() => {
    const rand = seeded(hashString(seed));
    const W = 800;
    const ground = 380;
    return {
      far: skyline(rand, W, 30, 120, 0.8),
      mid: skyline(rand, W, 50, 190, 1),
      near: skyline(rand, W, 30, 110, 1.3),
      stars: Array.from({ length: 40 }, () => [rand() * W, rand() * 220, rand() * 1.1 + 0.2] as const),
      sunX: 160 + rand() * 480,
      windows: Array.from({ length: 160 }, () => [rand() * W, ground - 10 - rand() * 170, rand()] as const),
      ground,
    };
  }, [seed]);

  if (image) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        <img src={image} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        {showLabel ? <AiLabel /> : null}
      </div>
    );
  }

  const sky1 = `hsl(${hue} 55% 9%)`;
  const sky2 = `hsl(${(hue + 10) % 360} 48% 22%)`;
  const glow = `hsl(${(hue + 25) % 360} 70% 62%)`;
  const { ground } = scene;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label={alt}>
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky1} />
            <stop offset="0.65" stopColor={sky2} />
            <stop offset="1" stopColor={glow} stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id={`sun-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff6e6" stopOpacity="0.95" />
            <stop offset="0.18" stopColor={glow} stopOpacity="0.55" />
            <stop offset="1" stopColor={glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 40% 18%)`} />
            <stop offset="1" stopColor="#071629" />
          </linearGradient>
          <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.55" stopColor="#071629" stopOpacity="0" />
            <stop offset="1" stopColor="#071629" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <rect width="800" height="520" fill={`url(#sky-${uid})`} />
        {scene.stars.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#F4F7FA" opacity={0.35} />
        ))}
        <circle cx={scene.sunX} cy={ground - 40} r="190" fill={`url(#sun-${uid})`} />
        <g fill={`hsl(${hue} 30% 30%)`} opacity="0.55">
          {scene.far.map((b, i) => (
            <path key={i} d={buildingPath(b, ground)} />
          ))}
        </g>
        <g fill={`hsl(${hue} 35% 16%)`}>
          {scene.mid.map((b, i) => (
            <path key={i} d={buildingPath(b, ground)} />
          ))}
        </g>
        <g fill="#f6dfb0">
          {scene.windows.map(([x, y, o], i) => (
            <rect key={i} x={x} y={y} width="2" height="3" opacity={o > 0.55 ? 0.7 : 0.15} />
          ))}
        </g>
        <g fill="#071629">
          {scene.near.map((b, i) => (
            <path key={i} d={buildingPath(b, ground)} />
          ))}
        </g>
        <rect y={ground} width="800" height={520 - ground} fill={`url(#water-${uid})`} />
        <g transform={`translate(0 ${ground * 2}) scale(1 -1)`} opacity="0.18" fill={`hsl(${hue} 35% 40%)`}>
          {scene.mid.map((b, i) => (
            <path key={i} d={buildingPath(b, ground)} />
          ))}
        </g>
        <ellipse cx={scene.sunX} cy={ground + 30} rx="120" ry="5" fill={glow} opacity="0.35" />
        <rect width="800" height="520" fill={`url(#fade-${uid})`} />
      </svg>
      {showLabel ? (
        <span className="absolute right-3 top-3 rounded-full bg-navy-950/70 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.2em] text-silver backdrop-blur">
          Illustrative artwork
        </span>
      ) : null}
    </div>
  );
});

/** Small, honest provenance label for generated imagery. */
export function AiLabel() {
  return (
    <span className="absolute right-3 top-3 rounded-full bg-navy-950/60 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.2em] text-silver/80 backdrop-blur">
      AI-generated image
    </span>
  );
}
