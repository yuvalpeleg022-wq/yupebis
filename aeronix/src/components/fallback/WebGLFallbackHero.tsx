import { StaticAircraft } from './StaticAircraft';

/** Static hero shown when WebGL is unavailable. Keeps the brand impression and all functionality. */
export function WebGLFallbackHero() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <StaticAircraft slice className="absolute inset-0 h-full w-full opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/40 to-transparent" />
      <p className="absolute bottom-6 right-6 text-[0.6rem] uppercase tracking-[0.2em] text-muted">
        3D unavailable on this device — showing illustrated view
      </p>
    </div>
  );
}
