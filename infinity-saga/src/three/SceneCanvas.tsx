import { Suspense, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { useQuality } from '../hooks/useQuality';

/**
 * Shared Canvas wrapper:
 *  - adaptive pixel ratio driven by measured FPS (PerformanceMonitor)
 *  - pauses rendering entirely when the section is off-screen
 *  - procedural studio environment (no remote HDR download)
 */
export function SceneCanvas({
  children, active, camera, className = '', label,
}: {
  children: ReactNode;
  active: boolean;
  camera?: { position: [number, number, number]; fov?: number };
  className?: string;
  label: string;
}) {
  const q = useQuality();
  const [dpr, setDpr] = useState(q.dpr[1]);

  return (
    <div className={className} role="img" aria-label={label}>
      <Canvas
        dpr={[q.dpr[0], dpr]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: camera?.position ?? [0, 0, 6], fov: camera?.fov ?? 35, near: 0.05, far: 300 }}
        gl={{ antialias: q.tier !== 'low', powerPreference: 'high-performance', alpha: false, stencil: false }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          scene.background = new THREE.Color('#030306');
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(q.dpr[0], d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(q.dpr[1], d + 0.25))}
        />
        <AdaptiveDpr pixelated={false} />
        <Environment resolution={q.tier === 'high' ? 256 : 128} frames={1}>
          <Lightformer form="rect" intensity={3} color="#fff4e0" position={[3, 3, 4]} scale={[4, 2, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={4} color="#ff2a3d" position={[-5, 1, -3]} scale={[2, 6, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={2.5} color="#e8b04b" position={[4, -2, -4]} scale={[3, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 6, 0]} scale={4} target={[0, 0, 0]} />
        </Environment>
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
