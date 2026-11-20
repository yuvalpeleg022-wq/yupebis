import { Suspense, useCallback, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { scrollState } from '../lib/scroll';
import { lerp, range, smooth } from '../lib/math';
import { heroStoneIntensity } from '../lib/choreography';
import { useQuality } from '../hooks/useQuality';
import { HERO_MODEL } from '../config/assets';
import { STONES } from '../data/stones';
import { Dust, Nebula } from './Cosmos';
import { Relic, ModelBay } from './Relic';
import { HeroModel, type SocketMap } from './HeroModel';
import { Gem } from './Gem';

/**
 * Camera choreography keyed to hero scroll progress (0 → 1).
 * Extreme close-up → pull back → reveal → orbit → rise into the next section.
 */
type Key = { t: number; pos: [number, number, number]; look: [number, number, number]; fov: number };
const RELIC_Y = 0.55;
const KEYS: Key[] = [
  { t: 0.0, pos: [0.15, RELIC_Y + 1.55, 1.05], look: [0, RELIC_Y + 1.0, 0], fov: 28 },
  { t: 0.14, pos: [0.6, RELIC_Y + 0.9, 2.2], look: [0, RELIC_Y + 0.7, 0], fov: 32 },
  { t: 0.32, pos: [1.2, RELIC_Y + 0.3, 5.4], look: [0, RELIC_Y, 0], fov: 34 },
  { t: 0.5, pos: [0, 0.2, 8.6], look: [0, 0.1, 0], fov: 36 },
  { t: 0.68, pos: [-6.4, 1.2, 5.6], look: [0, 0.2, 0], fov: 36 },
  { t: 0.84, pos: [-7.6, 2.6, -3.4], look: [0, 0.4, 0], fov: 38 },
  { t: 1.0, pos: [-2, 7.5, -12], look: [0, 1.5, 0], fov: 44 },
];

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
function sample(p: number, outPos: THREE.Vector3, outLook: THREE.Vector3): number {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const k = smooth(range(p, a.t, b.t));
  // Orbit-aware interpolation: blend in spherical space around the subject
  const sa = new THREE.Spherical().setFromVector3(tmpA.fromArray(a.pos));
  const sb = new THREE.Spherical().setFromVector3(tmpB.fromArray(b.pos));
  let dTheta = sb.theta - sa.theta;
  if (dTheta > Math.PI) dTheta -= Math.PI * 2;
  if (dTheta < -Math.PI) dTheta += Math.PI * 2;
  const s = new THREE.Spherical(lerp(sa.radius, sb.radius, k), lerp(sa.phi, sb.phi, k), sa.theta + dTheta * k);
  outPos.setFromSpherical(s);
  outLook.set(lerp(a.look[0], b.look[0], k), lerp(a.look[1], b.look[1], k), lerp(a.look[2], b.look[2], k));
  return lerp(a.fov, b.fov, k);
}


function CameraRig() {
  const { camera, pointer } = useThree();
  const q = useQuality();
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const smoothP = useRef(0);
  const cur = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    // Critically damped follow of the scroll value — smooth even on wheel jumps
    smoothP.current += (scrollState.hero - smoothP.current) * (q.reducedMotion ? 1 : 1 - Math.exp(-dt * 4.5));
    const fov = sample(smoothP.current, pos.current, look.current);
    if (!q.reducedMotion && !q.isTouch) {
      pos.current.x += pointer.x * 0.25;
      pos.current.y += pointer.y * 0.15;
    }
    camera.position.copy(pos.current);
    cur.current.lerp(look.current, 0.25);
    camera.lookAt(cur.current);
    const pc = camera as THREE.PerspectiveCamera;
    if (Math.abs(pc.fov - fov) > 0.01) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }
  });
  return null;
}

function Lights() {
  const rim = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (rim.current) rim.current.intensity = 30 + range(scrollState.hero, 0.4, 0.9) * 50;
  });
  return (
    <>
      <ambientLight intensity={0.08} />
      <spotLight position={[4, 6, 6]} angle={0.45} penumbra={0.8} intensity={120} color="#fff1dc" distance={30} decay={2} />
      <pointLight ref={rim} position={[-4, 2, -4]} intensity={30} color="#ff2a3d" distance={20} decay={2} />
      <pointLight position={[4, -1, -3]} intensity={25} color="#e8b04b" distance={18} decay={2} />
    </>
  );
}

function Effects() {
  const q = useQuality();
  const dof = useRef<{ bokehScale: number } | null>(null);
  useFrame(() => {
    // Shallow focus during the close-up, opening up as the camera pulls back
    if (dof.current) dof.current.bokehScale = lerp(4, 0, range(scrollState.hero, 0.05, 0.35));
  });
  if (!q.postFx) return null;
  return (
    <EffectComposer multisampling={0}>
      {q.tier === 'high' ? (
        <DepthOfField ref={dof as never} target={[0, RELIC_Y + 1.1, 0]} focalLength={0.02} bokehScale={4} height={480} />
      ) : (
        <></>
      )}
      <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.62} luminanceSmoothing={0.2} radius={0.8} />
      <Noise opacity={0.035} premultiply />
      <Vignette eskil={false} offset={0.18} darkness={0.85} />
    </EffectComposer>
  );
}

export default function HeroScene() {
  const q = useQuality();
  const [sockets, setSockets] = useState<SocketMap | null>(null);
  const onSockets = useCallback((s: SocketMap) => setSockets(Object.keys(s).length ? s : null), []);
  const hasModel = !!HERO_MODEL.url;

  const p = () => scrollState.hero;
  const stoneI = (i: number) => heroStoneIntensity(i, p());
  const energy = () => range(p(), 0.55, 1);

  return (
    <>
      <CameraRig />
      <Lights />
      <Nebula mix={() => range(p(), 0.6, 1)} />
      <Dust count={q.particles} intensity={() => 0.15 + range(p(), 0.3, 0.85) * 0.85} />

      {hasModel ? (
        <Suspense fallback={null}>
          <HeroModel url={HERO_MODEL.url!} onSockets={onSockets} />
          {sockets &&
            STONES.map((s, i) =>
              sockets[s.id] ? (
                <group key={s.id} position={sockets[s.id]} scale={0.06}>
                  <Gem id={s.id} color={s.color} intensity={() => stoneI(i)} spin={0} />
                </group>
              ) : null,
            )}
        </Suspense>
      ) : null}

      {(!hasModel || !sockets) && (
        <group position={[0, RELIC_Y, 0]}>
          <Relic stoneIntensity={stoneI} energy={energy} />
        </group>
      )}

      {!hasModel && (
        <group position={[0, 0, 0]}>
          <ModelBay visible={() => range(p(), 0.36, 0.5) * (1 - range(p(), 0.86, 0.98))} />
        </group>
      )}

      <Effects />
    </>
  );
}
