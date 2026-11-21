import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BikeModel } from './BikeModel';
import { StudioStage } from './StudioStage';
import type { Motorcycle } from '../data/motorcycles';

interface Props {
  bike: Motorcycle;
  active: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
  onReady: () => void;
  onError: () => void;
}

/**
 * Cinematic hero camera: a slow, subtle orbit, a gentle pointer parallax
 * on desktop, and a scroll-linked dolly as the visitor leaves the hero.
 * Under reduced-motion the camera is fixed.
 */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size, pointer } = useThree();
  const look = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());
  const smooth = useRef({ px: 0, py: 0, scroll: 0 });

  useFrame((state, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const portrait = size.width / size.height < 0.9;
    const s = smooth.current;
    const k = 1 - Math.exp(-delta * 3);

    const scrollTarget = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
    s.scroll += (scrollTarget - s.scroll) * (reducedMotion ? 1 : k);
    if (!reducedMotion && !portrait) {
      s.px += (pointer.x - s.px) * k;
      s.py += (pointer.y - s.py) * k;
    }

    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    // Base framing: 3/4 front, bike on the right on desktop, centred & high on portrait
    const baseAngle = 0.72 + Math.sin(t * 0.12) * 0.14 + s.px * 0.08 - s.scroll * 0.55;
    // Fit the bike to the horizontal field of view so narrow screens never crop it
    const aspect = size.width / size.height;
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect);
    const fitDist = Math.max(5.6, 1.12 / Math.tan(hHalf));
    const dist = fitDist * (1 - s.scroll * 0.16);
    const height = 1.05 + s.py * 0.12 - s.scroll * 0.35;

    pos.current.set(Math.sin(baseAngle) * dist, height, Math.cos(baseAngle) * dist);
    cam.position.copy(pos.current);

    if (portrait) look.current.set(0, -0.62, 0);
    else look.current.set(0, 0.36, 0);
    cam.lookAt(look.current);

    // Shift the subject to the right on wide screens without changing perspective
    if (!portrait) {
      const shift = size.width * 0.2;
      cam.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height);
    } else if (cam.view) {
      cam.clearViewOffset();
    }
  });
  return null;
}

export default function HeroCanvas({ bike, active, reducedMotion, lowPower, onReady, onError }: Props) {
  if (!bike.model3d) return null;
  return (
    <Canvas
      shadows={!lowPower}
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      gl={{
        antialias: !lowPower,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      camera={{ fov: 28, near: 0.1, far: 40, position: [3, 1, 3] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onError();
        });
      }}
      aria-hidden="true"
    >
      <color attach="background" args={['#0a0a0b']} />
      <fog attach="fog" args={['#0a0a0b', 7, 15]} />
      <CameraRig reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <BikeModel model={bike.model3d} paint={bike.paints[0]} onReady={onReady} />
        <StudioStage lowPower={lowPower} shadowKey={bike.id} />
      </Suspense>
    </Canvas>
  );
}
