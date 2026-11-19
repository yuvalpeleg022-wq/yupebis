import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SceneCanvas } from './AircraftScene';
import { AircraftModel } from './AircraftModel';
import { SkyDome } from './SkyDome';
import { CloudDeck } from './CloudEnvironment';
import { SceneLighting } from './SceneLighting';
import { PALETTE } from './environmentConfig';
import { useQuality } from '../hooks/useQuality';
import { SceneLoader } from '../components/ui/SceneLoader';
import { StaticAircraft } from '../components/fallback/StaticAircraft';
import type { FleetAircraft } from '../types';

/** Smoothly scales the shared model to each type's (fictional) relative size. */
function ScaledAircraft({ aircraft, detail, animated }: { aircraft: FleetAircraft; detail: 'high' | 'medium' | 'low'; animated: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const target = 0.55 + aircraft.profile.length * 0.45;
    const k = animated ? 1 - Math.exp(-4 * Math.min(delta, 0.1)) : 1;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, k));
    if (animated) g.rotation.y += Math.min(delta, 0.1) * 0.18; // turntable
  });
  return (
    <group ref={group}>
      <AircraftModel detail={detail} animated={animated} engines={aircraft.profile.engines} />
    </group>
  );
}

/** 3D turntable for the fleet page: drag to rotate, auto-rotates otherwise. */
export default function FleetShowcase({ aircraft }: { aircraft: FleetAircraft }) {
  const quality = useQuality();
  const animated = !quality.reducedMotion;
  // Touch devices: no OrbitControls, so a finger swipe over the canvas still scrolls the page.
  const finePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
  return (
    <div className="absolute inset-0">
      <SceneCanvas
        label={`Interactive 3D turntable showing the ${aircraft.name}. Drag to rotate with a mouse.`}
        camera={{ fov: 30, near: 0.1, far: 4000, position: [9.5, 2.6, 10.5] }}
        fallback={<StaticAircraft engines={aircraft.profile.engines} className="h-full w-full" />}
      >
        <color attach="background" args={[PALETTE.zenith]} />
        <fog attach="fog" args={[PALETTE.horizon, 60, 320]} />
        <SkyDome />
        <CloudDeck y={-8} animated={animated} />
        <SceneLighting environment />
        <Suspense fallback={null}>
          <ScaledAircraft aircraft={aircraft} detail={quality.tier} animated={animated} />
        </Suspense>
        {finePointer ? (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            enableDamping={animated}
            minPolarAngle={0.9}
            maxPolarAngle={1.65}
            target={[0, -0.2, 0]}
          />
        ) : null}
      </SceneCanvas>
      <SceneLoader label="Loading aircraft" />
    </div>
  );
}
