/**
 * DEV TOOL — renders a single motorcycle still for the image pipeline.
 * Usage: /still.html?bike=strada-rs&paint=graphite&angle=front&bg=dark
 * scripts/render-stills.mjs drives this with Playwright to regenerate
 * every card / gallery image straight from the 3D models.
 */
import { Suspense, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { BikeModel } from './three/BikeModel';
import { StudioStage } from './three/StudioStage';
import { getMotorcycle } from './data/motorcycles';

const q = new URLSearchParams(location.search);
const bike = getMotorcycle(q.get('bike') ?? 'strada-rs');
const paint = bike.paints.find((p) => p.id === q.get('paint')) ?? bike.paints[0];
const angle = q.get('angle') ?? 'front';

const cams: Record<string, [number, number, number]> = {
  front: [2.35, 1.08, 2.62],
  side: [0, 0.85, 3.5],
  rear: [-2.5, 1.2, 2.45],
  top: [1.8, 3.2, 2.4],
  hero: [3.2, 1.0, 2.4],
};

function App() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => {
    // give shaders / shadows a few frames to settle
    setTimeout(() => setReady(true), 900);
  }, []);
  return (
    <>
      <Canvas
        shadows
        dpr={1}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}
        camera={{ position: cams[angle] ?? cams.front, fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.55, 0)}
      >
        <color attach="background" args={['#0b0b0d']} />
        <fog attach="fog" args={['#0b0b0d', 6, 13]} />
        <Suspense fallback={null}>
          <BikeModel model={bike.model3d!} paint={paint} onReady={onReady} />
          <StudioStage />
        </Suspense>
      </Canvas>
      {ready && <div id="ready" style={{ display: 'none' }} />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
