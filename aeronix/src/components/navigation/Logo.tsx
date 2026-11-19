import { Link } from 'react-router-dom';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`group flex items-center gap-3 ${className}`} aria-label="AERONIX AIRWAYS — home">
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden="true">
        <path d="M20 5 L33 33 H27 L20 17 L13 33 H7 Z" fill="currentColor" />
        <path d="M11.5 27.5 H28.5" stroke="#C5A46D" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.95rem] font-semibold tracking-[0.28em]">AERONIX</span>
        <span className="mt-1 text-[0.55rem] tracking-[0.5em] text-silver">AIRWAYS</span>
      </span>
    </Link>
  );
}
