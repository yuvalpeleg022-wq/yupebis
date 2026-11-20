import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { STONES } from '../data/stones';
import { useQuality } from '../hooks/useQuality';
import { Gem } from './Gem';
import { Dust, Nebula } from './Cosmos';
import { StoneEnvironment } from './StoneEnvironments';

export function stoneLayout(i: number, narrow: boolean): [number, number, number] {
  if (narrow) {
    // 2 × 3 grid for portrait screens
    const col = i % 2, row = Math.floor(i / 2);
    return [(col - 0.5) * 3.2, (1 - row) * 3.1, 0];
  }
  const a = ((i - 2.5) / 6) * Math.PI * 0.9;
  return [Math.sin(a) * 9, Math.sin(i * 1.7) * 0.5, -Math.cos(a) * 9 + 9];
}

interface Props {
  selected: number | null;
  hovered: number | null;
  onHover: (i: number | null) => void;
  onSelect: (i: number) => void;
}

function Rig({ selected }: { selected: number | null }) {
  const { camera, size, pointer } = useThree();
  const narrow = size.width < size.height;
  const target = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const curLook = useRef(new THREE.Vector3());
  const q = useQuality();
  useFrame((_, dt) => {
    if (selected == null) {
      target.current.set(0, narrow ? 0 : 0.6, narrow ? 15 : 13.5);
      look.current.set(0, 0, narrow ? 0 : 3);
    } else {
      const p = new THREE.Vector3(...stoneLayout(selected, narrow));
      // Frame the stone off-center so the DOM info panel has room
      const side = narrow ? 0 : 1.7;
      target.current.copy(p).add(new THREE.Vector3(side, 0.35, narrow ? 5.2 : 4.4));
      look.current.copy(p).add(new THREE.Vector3(side * 0.85, narrow ? -0.9 : 0, 0));
    }
    if (!q.reducedMotion && !q.isTouch) target.current.x += pointer.x * 0.3;
    const k = q.reducedMotion ? 1 : 1 - Math.exp(-dt * 2.6);
    camera.position.lerp(target.current, k);
    curLook.current.lerp(look.current, k);
    camera.lookAt(curLook.current);
  });
  return null;
}

export default function StonesScene({ selected, hovered, onHover, onSelect }: Props) {
  const q = useQuality();
  const { size } = useThree();
  const narrow = size.width < size.height;
  return (
    <>
      <Rig selected={selected} />
      <ambientLight intensity={0.1} />
      <directionalLight position={[3, 5, 6]} intensity={1.2} color="#fff2e0" />
      <Nebula a="#120624" b="#06122c" c="#2a1a02" />
      <Dust count={Math.round(q.particles * 0.5)} radius={26} intensity={() => 0.4} />
      {STONES.map((s, i) => {
        const lvl = () => (selected === i ? 1 : hovered === i ? 0.65 : selected == null ? 0.15 : 0.05);
        return (
          <group key={s.id} position={stoneLayout(i, narrow)}>
            <StoneEnvironment stone={s} level={lvl} />
            <group scale={0.95}>
              <Gem id={s.id} color={s.color} intensity={() => (selected === i ? 1 : hovered === i ? 0.85 : selected == null ? 0.45 : 0.2)} />
            </group>
            {/* generous invisible hit target for pointer + touch */}
            <mesh
              visible={false}
              onPointerOver={(e) => { e.stopPropagation(); onHover(i); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { onHover(null); document.body.style.cursor = ''; }}
              onClick={(e) => { e.stopPropagation(); onSelect(i); }}
            >
              <sphereGeometry args={[1.2, 12, 12]} />
            </mesh>
          </group>
        );
      })}
      {q.postFx && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.55} radius={0.75} />
          <Vignette offset={0.2} darkness={0.8} />
        </EffectComposer>
      )}
    </>
  );
}
