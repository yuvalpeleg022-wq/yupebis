/**
 * Lightweight vector illustration of the AERONIX wide-body, used when WebGL is unavailable
 * or as a pre-render placeholder. Pure SVG, no JS cost.
 */
export function StaticAircraft({
  className = '',
  engines = 2,
  slice = false,
}: {
  className?: string;
  engines?: 2 | 4;
  slice?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 1200 520"
      preserveAspectRatio={slice ? 'xMidYMid slice' : 'xMidYMid meet'}
      className={className}
      role="img" aria-label="Illustration of an AERONIX AIRWAYS wide-body aircraft in pearl white and navy livery">
      <defs>
        <linearGradient id="sa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#071629" />
          <stop offset="0.7" stopColor="#183A5A" />
          <stop offset="1" stopColor="#7893AC" />
        </linearGradient>
        <linearGradient id="sa-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e6eaef" />
          <stop offset="0.56" stopColor="#0B1F35" />
          <stop offset="1" stopColor="#071629" />
        </linearGradient>
        <linearGradient id="sa-wing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d7dde4" />
          <stop offset="1" stopColor="#8d9aa8" />
        </linearGradient>
      </defs>
      <rect width="1200" height="520" fill="url(#sa-sky)" />
      <ellipse cx="600" cy="470" rx="760" ry="70" fill="#AEBBC8" opacity="0.18" />
      {/* far wing */}
      <path d="M640 250 L470 140 L440 140 L560 250 Z" fill="#9aa7b4" />
      {/* tail */}
      <path d="M215 238 L150 92 L205 92 L300 236 Z" fill="#0B1F35" />
      <path d="M160 120 C200 140 230 175 262 210" stroke="#C5A46D" strokeWidth="3" fill="none" />
      <path d="M190 252 L95 226 L118 214 L240 244 Z" fill="#c3ccd5" />
      {/* fuselage */}
      <path d="M130 248 C150 226 230 218 330 216 L960 214 C1040 214 1080 228 1102 248 C1080 268 1040 282 960 284 L330 284 C230 282 160 270 130 248 Z" fill="url(#sa-body)" />
      <path d="M330 258 L1000 254" stroke="#AEBBC8" strokeWidth="2.5" />
      <path d="M330 262 L1000 258" stroke="#C5A46D" strokeWidth="1.2" />
      {Array.from({ length: 38 }, (_, i) => (
        <rect key={i} x={360 + i * 17} y="234" width="7" height="9" rx="3.5" fill="#101a26" />
      ))}
      <path d="M1040 230 L1068 234 L1066 242 L1040 240 Z" fill="#101a26" />
      <text x="560" y="230" fill="#0B1F35" fontFamily="Inter Tight Variable, Inter Variable, Arial" fontWeight="700" fontSize="20" letterSpacing="5">
        AERONIX
      </text>
      {/* near wing */}
      <path d="M560 262 L820 262 L540 430 L500 430 Z" fill="url(#sa-wing)" />
      <path d="M500 430 L488 404 L512 404 L540 430 Z" fill="#c9d1da" />
      {/* engines */}
      {(engines === 4 ? [610, 700] : [640]).map((x) => (
        <g key={x}>
          <rect x={x - 70} y={300 + (x - 610) * 0.4} width="150" height="52" rx="26" fill="#f1f4f7" />
          <ellipse cx={x + 78} cy={326 + (x - 610) * 0.4} rx="9" ry="25" fill="#1a222c" stroke="#e3e8ed" strokeWidth="4" />
          <rect x={x - 70} y={322 + (x - 610) * 0.4} width="150" height="2" fill="#C5A46D" />
        </g>
      ))}
    </svg>
  );
}
