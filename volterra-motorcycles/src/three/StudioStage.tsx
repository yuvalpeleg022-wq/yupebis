import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface Props {
  /** Lower quality for small / low-power screens */
  lowPower?: boolean;
  /** Accent rim light colour */
  accent?: string;
  /** Change to re-bake the contact shadow (e.g. when the bike changes) */
  shadowKey?: string;
}

/**
 * Shared dark studio: a procedural softbox environment (rendered locally —
 * no HDR download), a key light with soft shadows, a cool rim and a warm
 * accent kicker, plus a floor that fades into darkness.
 */
export function StudioStage({ lowPower = false, accent = '#e3262f', shadowKey }: Props) {
  const floorMat = useMemo(() => {
    // Radial fade so the floor melts into the background
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const alpha = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
      color: '#060607',
      roughness: 0.6,
      metalness: 0.0,
      transparent: true,
      alphaMap: alpha,
      depthWrite: false,
    });
  }, []);

  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#dfe4ee', '#0a0a0a', 0.5]} />
      {/* Key light */}
      <spotLight
        position={[3.5, 5.5, 3]}
        angle={0.45}
        penumbra={0.9}
        intensity={110}
        decay={2}
        castShadow={!lowPower}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      {/* Cool rim from behind */}
      <spotLight position={[-4, 3, -4]} angle={0.5} penumbra={1} intensity={70} color="#cfdcff" decay={2} />
      {/* Accent kicker, low and to the side */}
      <pointLight position={[-3.5, 1.4, -1.5]} intensity={2.5} color={accent} decay={2} distance={8} />

      <Environment resolution={lowPower ? 128 : 256} frames={1}>
        <color attach="background" args={['#050506']} />
        {/* Overhead softbox */}
        <Lightformer form="rect" intensity={3.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 2.2, 1]} />
        {/* Long strip lights for crisp tank / chrome reflections */}
        <Lightformer form="rect" intensity={4.5} position={[-5, 1.5, 1]} rotation-y={Math.PI / 2} scale={[10, 0.35, 1]} />
        <Lightformer form="rect" intensity={4.5} position={[5, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[10, 0.35, 1]} />
        <Lightformer form="rect" intensity={2} position={[0, 2, -6]} scale={[10, 1.2, 1]} color="#dfe6ff" />
        <Lightformer form="rect" intensity={2.5} position={[0, 1.2, 6]} scale={[8, 1.5, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[2, 3, 5]} scale={1.6} color={accent} />
      </Environment>

      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[26, 26]} />
      </mesh>

      <ContactShadows
        key={shadowKey}
        position={[0, 0.002, 0]}
        opacity={0.85}
        scale={6}
        blur={2.4}
        far={1.6}
        resolution={lowPower ? 256 : 512}
        frames={1}
        color="#000000"
      />
    </>
  );
}
