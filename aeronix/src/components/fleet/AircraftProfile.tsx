import type { FleetAircraft } from '../../types';

/** Procedural plan-view silhouette drawn from each (fictional) type's proportions. */
export function AircraftProfile({ aircraft, className = '' }: { aircraft: FleetAircraft; className?: string }) {
  const { length, span, engines } = aircraft.profile;
  const L = 180 * length;
  const S = 150 * span;
  const cx = 100;
  const cy = 50;
  const nose = cx + L / 2;
  const tail = cx - L / 2;
  const wingRoot = cx + L * 0.06;
  const sweep = S * 0.34;
  const enginesAt = engines === 4 ? [0.3, 0.6] : [0.36];
  return (
    <svg viewBox="-20 0 240 100" className={className} role="img" aria-label={`Plan view silhouette of the ${aircraft.name}`}>
      <g fill="none" stroke="#AEBBC8" strokeWidth="1.2" strokeLinejoin="round">
        <path
          d={`M${tail},${cy} Q${tail + 6},${cy - 4.5} ${tail + 20},${cy - 4.8} L${nose - 14},${cy - 4.8} Q${nose},${cy - 4} ${nose},${cy} Q${nose},${cy + 4} ${nose - 14},${cy + 4.8} L${tail + 20},${cy + 4.8} Q${tail + 6},${cy + 4.5} ${tail},${cy} Z`}
          fill="#0B1F35"
        />
        {[-1, 1].map((s) => (
          <g key={s}>
            <path
              d={`M${wingRoot},${cy + 4 * s} L${wingRoot - sweep},${cy + (S / 2) * s * 0.62} L${wingRoot - sweep - 7},${cy + (S / 2) * s * 0.62} L${wingRoot - 26},${cy + 4 * s} Z`}
              fill="#183A5A"
            />
            <path
              d={`M${tail + 18},${cy + 3 * s} L${tail + 4},${cy + 20 * s * span} L${tail - 1},${cy + 20 * s * span} L${tail + 6},${cy + 3 * s} Z`}
              fill="#183A5A"
            />
            {enginesAt.map((f) => (
              <rect
                key={f}
                x={wingRoot - sweep * f - 2}
                y={cy + (S / 2) * s * 0.62 * f - 2.2}
                width="11"
                height="4.4"
                rx="2.2"
                fill="#C5A46D"
                stroke="none"
              />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}
