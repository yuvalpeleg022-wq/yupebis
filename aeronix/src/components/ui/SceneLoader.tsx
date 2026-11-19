import { useProgress } from '@react-three/drei';

/**
 * Lightweight HTML overlay showing real 3D asset loading progress.
 * Rendered outside the Canvas; never blocks page interaction (pointer-events: none).
 */
export function SceneLoader({ label = 'Loading 3D scene' }: { label?: string }) {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-10 z-20 flex justify-center" role="status" aria-live="polite">
      <div className="glass flex items-center gap-4 rounded-full px-5 py-2.5">
        <span className="eyebrow !text-[0.6rem]">{label}</span>
        <span className="h-px w-24 overflow-hidden bg-silver/20">
          <span className="block h-full bg-gold transition-[width] duration-300" style={{ width: `${Math.round(progress)}%` }} />
        </span>
        <span className="text-[0.65rem] tabular-nums text-silver">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
