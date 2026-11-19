import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import gsap from 'gsap';

export type ViewPreset = 'hero' | 'front' | 'side' | 'top' | 'wing' | 'engine' | 'tail';

export const VIEW_PRESETS: Record<ViewPreset, { label: string; cam: [number, number, number]; target: [number, number, number] }> = {
  hero: { label: 'Three-quarter', cam: [8.6, 2.4, 8.4], target: [0, 0, 0] },
  front: { label: 'Front', cam: [10.5, 0.6, 0.01], target: [0, 0, 0] },
  side: { label: 'Side', cam: [0, 0.4, 11.5], target: [0, 0, 0] },
  top: { label: 'Top', cam: [0.01, 13, 0.6], target: [0, 0, 0] },
  wing: { label: 'Wing', cam: [-2.4, 2.2, 5.6], target: [-0.6, -0.1, 2.2] },
  engine: { label: 'Engine', cam: [3.4, -0.3, 3.4], target: [0.4, -0.35, 1.3] },
  tail: { label: 'Tail', cam: [-7.2, 1.8, 4.2], target: [-3, 0.7, 0] },
};

export const ORBIT_LIMITS = {
  minDistance: 3.2,
  maxDistance: 18,
  minPolarAngle: 0.12,
  maxPolarAngle: Math.PI * 0.64,
} as const;

export interface AircraftControlsHandle {
  setView: (preset: ViewPreset) => void;
  reset: () => void;
  rotate: (radians: number) => void;
  tilt: (radians: number) => void;
  zoom: (factor: number) => void;
  setAutoRotate: (on: boolean) => void;
}

interface Props {
  reducedMotion: boolean;
  onInteract?: () => void;
}

const offset = new THREE.Vector3();
const spherical = new THREE.Spherical();

/**
 * OrbitControls with carefully configured limits plus an imperative API so that
 * on-screen buttons and keyboard shortcuts can drive the same camera.
 */
export const AircraftControls = forwardRef<AircraftControlsHandle, Props>(function AircraftControls(
  { reducedMotion, onInteract },
  ref,
) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const animateTo = (cam: THREE.Vector3Tuple, target: THREE.Vector3Tuple) => {
    const c = controls.current;
    if (!c) return;
    gsap.killTweensOf([camera.position, c.target]);
    const duration = reducedMotion ? 0 : 1.4;
    gsap.to(camera.position, { x: cam[0], y: cam[1], z: cam[2], duration, ease: 'power3.inOut', onUpdate: () => c.update() });
    gsap.to(c.target, { x: target[0], y: target[1], z: target[2], duration, ease: 'power3.inOut', onUpdate: () => c.update() });
  };

  const orbitBy = (dTheta: number, dPhi: number, scale = 1) => {
    const c = controls.current;
    if (!c) return;
    offset.copy(camera.position).sub(c.target);
    spherical.setFromVector3(offset);
    spherical.theta += dTheta;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPhi, ORBIT_LIMITS.minPolarAngle, ORBIT_LIMITS.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius * scale, ORBIT_LIMITS.minDistance, ORBIT_LIMITS.maxDistance);
    offset.setFromSpherical(spherical).add(c.target);
    animateTo([offset.x, offset.y, offset.z], [c.target.x, c.target.y, c.target.z]);
  };

  useImperativeHandle(ref, () => ({
    setView: (p) => animateTo(VIEW_PRESETS[p].cam, VIEW_PRESETS[p].target),
    reset: () => animateTo(VIEW_PRESETS.hero.cam, VIEW_PRESETS.hero.target),
    rotate: (r) => orbitBy(r, 0),
    tilt: (r) => orbitBy(0, r),
    zoom: (f) => orbitBy(0, 0, f),
    setAutoRotate: (on) => {
      if (controls.current) controls.current.autoRotate = on && !reducedMotion;
      invalidate();
    },
  }));

  useEffect(() => {
    camera.position.set(...VIEW_PRESETS.hero.cam);
    const c = controls.current;
    if (c) c.autoRotate = !reducedMotion;
    return () => {
      if (c) gsap.killTweensOf([camera.position, c.target]);
    };
  }, [camera, reducedMotion]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
      autoRotateSpeed={0.5}
      minDistance={ORBIT_LIMITS.minDistance}
      maxDistance={ORBIT_LIMITS.maxDistance}
      minPolarAngle={ORBIT_LIMITS.minPolarAngle}
      maxPolarAngle={ORBIT_LIMITS.maxPolarAngle}
      onStart={() => {
        if (controls.current) gsap.killTweensOf([camera.position, controls.current.target]);
        onInteract?.();
      }}
    />
  );
});
