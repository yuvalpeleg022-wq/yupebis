import { Suspense, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { FlightRig } from '../animations/flightRig';
import type { QualitySettings } from '../types';
import { AircraftModel } from './AircraftModel';
import { SkyDome } from './SkyDome';
import { CloudDeck, CloudField, LightRays } from './CloudEnvironment';
import { SceneLighting } from './SceneLighting';
import { PALETTE } from './environmentConfig';

const tmpTarget = new THREE.Vector3();
const tmpCam = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const planeTarget = new THREE.Vector3();

/** Applies the rig to the camera and aircraft every frame, with critically-damped smoothing. */
function RigDriver({
  rig,
  plane,
  reduced,
  onReady,
}: {
  rig: FlightRig;
  plane: React.RefObject<THREE.Group | null>;
  reduced: boolean;
  onReady?: () => void;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const first = useRef(true);
  const ready = useRef(false);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const snap = rig.snap || first.current;
    const k = (lambda: number) => (snap ? 1 : 1 - Math.exp(-lambda * dt));

    // Camera: rig position + intro dolly (pull back along view axis) + pointer parallax
    const dolly = rig.intro.camDolly;
    tmpCam.set(rig.camX + dolly * 9, rig.camY + dolly * 2.5, rig.camZ + dolly * 8);
    if (!reduced) {
      tmpCam.x += rig.pointerX * 0.35;
      tmpCam.y += rig.pointerY * 0.2;
    }
    camera.position.lerp(tmpCam, k(3.2));
    tmpTarget.set(rig.tgtX, rig.tgtY, rig.tgtZ);
    // Portrait screens: re-centre on the aircraft (kept in the upper half) and widen the lens,
    // so compositions designed for landscape still frame the aircraft on phones.
    const portrait = THREE.MathUtils.clamp((1.05 - camera.aspect) / 0.55, 0, 1);
    if (portrait > 0) {
      tmpTarget.lerp(planeTarget.set(rig.planeX - 0.9, rig.planeY - 2.7, rig.planeZ), portrait * 0.95);
    }
    lookTarget.lerp(tmpTarget, k(3.6));
    if (first.current) lookTarget.copy(tmpTarget);
    camera.lookAt(lookTarget);
    const portraitFov = rig.fov * (1 + THREE.MathUtils.clamp((1.05 - camera.aspect) / 0.55, 0, 1) * 0.55);
    const fov = THREE.MathUtils.lerp(camera.fov, portraitFov, k(3));
    if (Math.abs(fov - camera.fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Exposure fade for the intro (background appears first)
    gl.toneMappingExposure = 0.1 + 0.85 * rig.intro.exposure;

    // Aircraft: rig pose + intro offset + gentle idle motion (turbulence-free cruise)
    const g = plane.current;
    if (g) {
      const bob = reduced ? 0 : Math.sin(t * 0.55) * 0.06;
      const sway = reduced ? 0 : Math.sin(t * 0.37) * 0.025;
      g.position.lerp(
        tmpTarget.set(rig.planeX + rig.intro.planeX, rig.planeY + rig.intro.planeY + bob, rig.planeZ),
        k(2.6),
      );
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, rig.roll + sway, k(2.4));
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, rig.yaw, k(2.4));
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, rig.pitch + bob * 0.08, k(2.4));
    }
    first.current = false;
    if (!ready.current && g) {
      let meshes = 0;
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes++;
      });
      if (meshes > 0) {
        ready.current = true;
        onReady?.();
      }
    }
  });
  return null;
}

export function CinematicFlight({
  rig,
  quality,
  onReady,
}: {
  rig: FlightRig;
  quality: QualitySettings;
  onReady?: () => void;
}) {
  const plane = useRef<THREE.Group>(null);
  const animated = !quality.reducedMotion;
  return (
    <>
      <color attach="background" args={[PALETTE.zenith]} />
      <fog attach="fog" args={[PALETTE.horizon, 45, 300]} />
      <SkyDome />
      <SceneLighting environment />
      <CloudDeck animated={animated} />
      <Suspense fallback={null}>
        <CloudField count={quality.cloudCount} segments={quality.cloudSegments} animated={animated} speed={7} />
      </Suspense>
      {quality.lightRays ? <LightRays /> : null}
      <AircraftModel ref={plane} detail={quality.tier} animated={animated} />
      <RigDriver rig={rig} plane={plane} reduced={quality.reducedMotion} onReady={onReady} />
    </>
  );
}
