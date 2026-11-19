import { Environment, Lightformer } from '@react-three/drei';
import { SUN_DIRECTION } from './environmentConfig';

interface Props {
  /** Bake a procedural environment map for metallic reflections (no HDR download). */
  environment?: boolean;
  intensity?: number;
}

/** Directional key (sun), cool rim, sky/ground hemisphere and a baked studio-sky environment. */
export function SceneLighting({ environment = true, intensity = 1 }: Props) {
  const sun = SUN_DIRECTION.clone().multiplyScalar(40);
  return (
    <>
      <hemisphereLight args={['#bcd4ea', '#0b1f35', 0.65 * intensity]} />
      <directionalLight position={[sun.x, sun.y, sun.z]} intensity={2.6 * intensity} color="#fff1dc" />
      <directionalLight position={[18, 6, 24]} intensity={1.15 * intensity} color="#cfe0f3" />
      <directionalLight position={[-10, -8, 14]} intensity={0.35 * intensity} color="#7893ac" />
      {environment ? (
        <Environment resolution={256} frames={1} environmentIntensity={0.9}>
          <color attach="background" args={['#0d2440']} />
          {/* sky dome panel */}
          <Lightformer form="rect" intensity={2.2} color="#cfe1f3" scale={[60, 20, 1]} position={[0, 18, 0]} rotation-x={Math.PI / 2} />
          {/* bright horizon band = cloud sea reflection */}
          <Lightformer form="ring" intensity={1.6} color="#dfe9f4" scale={30} position={[0, -4, 0]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={1.2} color="#9fbad3" scale={[80, 4, 1]} position={[0, 0, -30]} />
          <Lightformer form="rect" intensity={1.2} color="#9fbad3" scale={[80, 4, 1]} position={[0, 0, 30]} rotation-y={Math.PI} />
          {/* warm sun key */}
          <Lightformer form="circle" intensity={7} color="#ffe6c7" scale={6} position={[sun.x * 0.6, sun.y * 0.6, sun.z * 0.6]} />
        </Environment>
      ) : null}
    </>
  );
}
