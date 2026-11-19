import { useCallback, useState, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { useQuality } from '../hooks/useQuality';

interface SceneCanvasProps extends Omit<CanvasProps, 'children'> {
  children: ReactNode;
  /** Rendered instead of the canvas after an unrecoverable WebGL context loss. */
  fallback: ReactNode;
  label: string;
}

/**
 * Shared <Canvas> wrapper used by every 3D experience:
 *  - quality-tier DPR with runtime adaptation (PerformanceMonitor)
 *  - graceful WebGL context loss handling (auto-remount on restore, fallback after 3 losses)
 *  - GPU cleanup on unmount is performed by R3F (renderer.dispose + forceContextLoss);
 *    scene components dispose their own geometries, materials and textures.
 */
export function SceneCanvas({ children, fallback, label, ...canvasProps }: SceneCanvasProps) {
  const quality = useQuality();
  const [dpr, setDpr] = useState(quality.dpr[1]);
  const [epoch, setEpoch] = useState(0);
  const [losses, setLosses] = useState(0);
  const [lost, setLost] = useState(false);

  const onCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault(); // allows the browser to restore the context
      setLost(true);
      setLosses((n) => n + 1);
    };
    const onRestored = () => {
      setLost(false);
      setEpoch((n) => n + 1); // remount the scene so all GPU resources are re-created
    };
    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);
  }, []);

  if (losses >= 3) return <>{fallback}</>;

  return (
    <div className="absolute inset-0" aria-label={label} role="img">
      <Canvas
        key={epoch}
        dpr={dpr}
        gl={{ antialias: quality.tier !== 'low', powerPreference: 'high-performance', alpha: false, stencil: false }}
        onCreated={onCreated}
        {...canvasProps}
      >
        <PerformanceMonitor
          bounds={() => [45, 58]}
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(quality.dpr[0], d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(quality.dpr[1], d + 0.25))}
          onFallback={() => setDpr(quality.dpr[0])}
        />
        <AdaptiveDpr pixelated={false} />
        {children}
      </Canvas>
      {lost ? (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-950/70 text-sm text-silver" role="status">
          Restoring 3D view…
        </div>
      ) : null}
    </div>
  );
}
