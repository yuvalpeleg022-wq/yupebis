import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STONES } from '../data/stones';
import type { StoneId } from '../data/films';
import { Gem } from './Gem';
import { useQuality } from '../hooks/useQuality';

/**
 * THE CONVERGENCE ENGINE — an original placeholder artifact.
 *
 * This is deliberately NOT a stand-in sculpture of Iron Man or the Infinity
 * Gauntlet. It is an abstract red-and-gold armillary that carries the six
 * stones so the scroll choreography, lighting and VFX can be built and
 * reviewed. When a licensed hero model is configured (src/config/assets.ts),
 * HeroModel renders it and the stones snap to its sockets instead.
 */

export const RELIC_STONE_POSITIONS: Record<StoneId, [number, number, number]> = (() => {
  const out = {} as Record<StoneId, [number, number, number]>;
  STONES.forEach((s, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
    out[s.id] = [Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0];
  });
  return out;
})();

function ArcBand({ radius, tube, arc, color, metal = 1, rough = 0.22 }: { radius: number; tube: number; arc: number; color: string; metal?: number; rough?: number }) {
  return (
    <mesh>
      <torusGeometry args={[radius, tube, 24, 160, arc]} />
      <meshStandardMaterial color={color} metalness={metal} roughness={rough} envMapIntensity={1.4} />
    </mesh>
  );
}

export function Relic({ stoneIntensity, energy }: { stoneIntensity: (i: number) => number; energy: () => number }) {
  const q = useQuality();
  const r1 = useRef<THREE.Group>(null);
  const r2 = useRef<THREE.Group>(null);
  const r3 = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const plates = useMemo(() => {
    // Gold faceted plates around the core
    const arr: { pos: THREE.Vector3; rot: THREE.Euler }[] = [];
    const n = 14;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const pos = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(0.42);
      const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
      arr.push({ pos, rot: new THREE.Euler().setFromRotationMatrix(m) });
    }
    return arr;
  }, []);

  useFrame((s, dt) => {
    const e = energy();
    const sp = 1 + e * 3;
    if (r1.current) { r1.current.rotation.z += dt * 0.12 * sp; r1.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.2) * 0.25; }
    if (r2.current) { r2.current.rotation.y += dt * 0.18 * sp; }
    if (r3.current) { r3.current.rotation.x += dt * 0.09 * sp; r3.current.rotation.z -= dt * 0.05 * sp; }
    if (halo.current) halo.current.rotation.z += dt * (0.05 + e * 0.6);
    if (coreMat.current) coreMat.current.emissiveIntensity = 0.25 + e * 2.5;
  });

  return (
    <group>
      {/* Core */}
      <group>
        <mesh>
          <icosahedronGeometry args={[0.36, 1]} />
          <meshStandardMaterial ref={coreMat} color="#e8b04b" emissive="#ff6a2a" emissiveIntensity={0.3} metalness={1} roughness={0.18} flatShading />
        </mesh>
        {plates.map((p, i) => (
          <mesh key={i} position={p.pos} rotation={p.rot}>
            <boxGeometry args={[0.2, 0.2, 0.03]} />
            <meshStandardMaterial color={i % 3 === 0 ? '#8f0a1f' : '#c99a3e'} metalness={1} roughness={0.28} />
          </mesh>
        ))}
      </group>

      {/* Armillary rings — red lacquer and gold */}
      <group ref={r1}>
        <ArcBand radius={1.6} tube={0.035} arc={Math.PI * 1.7} color="#a10d24" metal={0.85} rough={0.3} />
        <group rotation={[0, 0, Math.PI]}><ArcBand radius={1.68} tube={0.012} arc={Math.PI * 1.2} color="#e8b04b" /></group>
      </group>
      <group ref={r2} rotation={[Math.PI / 2.4, 0, 0]}>
        <ArcBand radius={1.95} tube={0.022} arc={Math.PI * 2} color="#d4a24a" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.95, Math.sin(a) * 1.95, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.02, 0.12, 0.02]} />
              <meshStandardMaterial color="#e8b04b" metalness={1} roughness={0.2} />
            </mesh>
          );
        })}
      </group>
      <group ref={r3} rotation={[0.4, 0.8, 0]}>
        <ArcBand radius={2.35} tube={0.016} arc={Math.PI * 1.35} color="#8f0a1f" metal={0.9} rough={0.35} />
      </group>

      {/* Six-stone halo */}
      <group ref={halo}>
        <mesh>
          <torusGeometry args={[1.15, 0.05, 16, 120]} />
          <meshStandardMaterial color="#b8862f" metalness={1} roughness={0.2} />
        </mesh>
        {STONES.map((st, i) => {
          const p = RELIC_STONE_POSITIONS[st.id];
          return (
            <group key={st.id} position={p}>
              {/* socket */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.2, 0.035, 12, 32]} />
                <meshStandardMaterial color="#c99a3e" metalness={1} roughness={0.15} />
              </mesh>
              <group scale={0.26}>
                <Gem id={st.id} color={st.color} intensity={() => stoneIntensity(i)} light={q.tier !== 'low'} spin={0.6} />
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/**
 * Holographic "model bay" that marks where the licensed hero model will stand.
 * It is labelled in the DOM overlay so no one mistakes it for the character.
 */
export function ModelBay({ visible }: { visible: () => number }) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv; varying vec3 vPos;
          void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uOpacity; varying vec2 vUv; varying vec3 vPos;
          void main(){
            float grid = step(0.97, fract(vUv.x * 24.0)) + step(0.96, fract(vPos.y * 3.0));
            float scan = smoothstep(0.06, 0.0, abs(fract(vUv.y - uTime * 0.12) - 0.5));
            float edge = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
            vec3 col = mix(vec3(0.91,0.69,0.29), vec3(1.0,0.3,0.25), scan);
            float a = (grid * 0.18 + scan * 0.5 + 0.03) * edge * uOpacity;
            gl_FragColor = vec4(col, a);
          }`,
      }),
    [],
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uOpacity.value = visible();
    if (group.current) group.current.visible = visible() > 0.01;
  });
  return (
    <group ref={group}>
      <mesh material={mat} position={[0, 0, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 4.2, 48, 1, true]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]}>
        <ringGeometry args={[1.05, 1.4, 64]} />
        <meshBasicMaterial color="#e8b04b" transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}
