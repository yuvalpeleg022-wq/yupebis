import { STONES } from '../data/stones';

/** No-WebGL fallback: a lightweight CSS composition so the page stays usable. */
export function StaticCosmos({ note = true }: { note?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#2a0610_0%,#0d0626_45%,#030306_80%)]">
      <div className="absolute left-1/2 top-[42%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/40" />
      {STONES.map((s, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        return (
          <span
            key={s.id}
            className="absolute h-5 w-5 rotate-45 rounded-sm"
            style={{
              left: `calc(50% + ${Math.cos(a) * 128}px - 10px)`,
              top: `calc(42% + ${Math.sin(a) * 128}px - 10px)`,
              background: s.color,
              boxShadow: `0 0 24px 6px ${s.color}88`,
            }}
          />
        );
      })}
      {note && (
        <p className="absolute bottom-24 inset-x-0 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-mist">
          3D view unavailable on this device — showing a static composition
        </p>
      )}
    </div>
  );
}
