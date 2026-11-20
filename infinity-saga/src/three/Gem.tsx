import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StoneId } from '../data/films';
import { useQuality } from '../hooks/useQuality';

/* ───────────────────────── Faceted gem geometry ─────────────────────────
 * Gems are built ring by ring (table → crown → girdle → pavilion → culet).
 * Alternate rings are rotated half a facet so the bands triangulate into
 * star / kite / girdle facets like a real brilliant cut rather than a lathe.
 * A shaping function then bends the round outline into oval, cushion,
 * pear or step-cut silhouettes.
 */
type Ring = { y: number; r: number; twist: number };
type Cut = { facets: number; rings: Ring[]; shape: (a: number) => [number, number] };

const round = (a: number): [number, number] => [Math.cos(a), Math.sin(a)];
const oval = (sx: number, sz: number) => (a: number): [number, number] => [Math.cos(a) * sx, Math.sin(a) * sz];
const cushion = (a: number): [number, number] => {
  const c = Math.cos(a), s = Math.sin(a);
  const k = 1 / Math.pow(Math.pow(Math.abs(c), 3.2) + Math.pow(Math.abs(s), 3.2), 1 / 3.2);
  return [c * k * 0.92, s * k * 0.92];
};
const pear = (a: number): [number, number] => {
  const c = Math.cos(a), s = Math.sin(a);
  const taper = 1 - 0.38 * Math.max(0, c) ** 1.6;
  return [c * 1.18, s * taper * 0.86];
};
const octagon = (a: number): [number, number] => {
  // emerald / step cut: rectangle with clipped corners
  const c = Math.cos(a), s = Math.sin(a);
  const k = 1 / Math.max(Math.abs(c) / 1.0, Math.abs(s) / 0.78, (Math.abs(c) + Math.abs(s)) / 1.42);
  return [c * k, s * k];
};

const BRILLIANT: Ring[] = [
  { y: 0.30, r: 0.0, twist: 0 },     // table centre
  { y: 0.30, r: 0.56, twist: 0 },    // table edge
  { y: 0.22, r: 0.80, twist: 0.5 },  // star facets
  { y: 0.12, r: 0.97, twist: 0 },    // upper girdle
  { y: 0.08, r: 1.0, twist: 0.25 },  // girdle
  { y: 0.04, r: 1.0, twist: 0.25 },  // girdle
  { y: -0.20, r: 0.74, twist: 0.5 }, // lower girdle
  { y: -0.62, r: 0.0, twist: 0 },    // culet
];

const CUTS: Record<StoneId, Cut> = {
  // Step / emerald cut — architectural, crisp steps
  space: {
    facets: 8, shape: octagon, rings: [
      { y: 0.26, r: 0, twist: 0 }, { y: 0.26, r: 0.62, twist: 0 }, { y: 0.2, r: 0.76, twist: 0 }, { y: 0.13, r: 0.9, twist: 0 },
      { y: 0.06, r: 1, twist: 0 }, { y: -0.08, r: 0.84, twist: 0 }, { y: -0.24, r: 0.62, twist: 0 }, { y: -0.4, r: 0.34, twist: 0 }, { y: -0.48, r: 0.0, twist: 0 },
    ],
  },
  // Oval brilliant
  mind: { facets: 16, shape: oval(1.0, 0.72), rings: BRILLIANT },
  // Round brilliant
  reality: { facets: 16, shape: round, rings: BRILLIANT },
  // Cushion cut — dense, heavy
  power: { facets: 16, shape: cushion, rings: BRILLIANT.map((r) => ({ ...r, y: r.y * 1.1 })) },
  // Rose cut — domed, no table, flat back
  time: {
    facets: 12, shape: oval(1.0, 0.86), rings: [
      { y: 0.42, r: 0, twist: 0 }, { y: 0.32, r: 0.42, twist: 0.5 }, { y: 0.16, r: 0.78, twist: 0 },
      { y: 0.02, r: 1, twist: 0.5 }, { y: -0.06, r: 1, twist: 0.5 }, { y: -0.12, r: 0, twist: 0 },
    ],
  },
  // Pear brilliant
  soul: { facets: 16, shape: pear, rings: BRILLIANT },
};

const geoCache = new Map<StoneId, THREE.BufferGeometry>();
export function gemGeometry(id: StoneId) {
  const hit = geoCache.get(id);
  if (hit) return hit;
  const { facets, rings, shape } = CUTS[id];
  const pos: number[] = [];
  const ringPts = rings.map((ring) =>
    Array.from({ length: facets }, (_, i) => {
      const a = ((i + ring.twist) / facets) * Math.PI * 2;
      const [x, z] = shape(a);
      return new THREE.Vector3(x * ring.r, ring.y, z * ring.r);
    }),
  );
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    if (a.distanceToSquared(b) < 1e-9 || b.distanceToSquared(c) < 1e-9 || a.distanceToSquared(c) < 1e-9) return;
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  for (let k = 0; k < ringPts.length - 1; k++) {
    const A = ringPts[k], B = ringPts[k + 1];
    for (let i = 0; i < facets; i++) {
      const j = (i + 1) % facets;
      // two triangles per quad; twisted rings turn these into kite/star facets
      tri(A[i], B[i], B[j]);
      tri(A[i], B[j], A[j]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // ensure outward winding
  g.computeVertexNormals();
  const n = g.getAttribute('normal');
  const p = g.getAttribute('position');
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  let inward = 0;
  for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i); if (v.dot(nn) < 0) inward++; }
  if (inward > p.count / 6) {
    const arr = p.array as Float32Array;
    for (let i = 0; i < arr.length; i += 9) for (let c = 0; c < 3; c++) { const t = arr[i + 3 + c]; arr[i + 3 + c] = arr[i + 6 + c]; arr[i + 6 + c] = t; }
    g.computeVertexNormals();
  }
  geoCache.set(id, g);
  return g;
}

let glowTex: THREE.Texture | null = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

export interface GemProps {
  id: StoneId;
  color: string;
  /** 0 = dormant, 1 = awakened. Called every frame. */
  intensity: () => number;
  scale?: number;
  /** Colored light the stone casts on nearby surfaces. */
  light?: boolean;
  lightDistance?: number;
  lightPower?: number;
  castShadow?: boolean;
  /** Optional soft glow sprite — kept subtle so facets stay readable. */
  halo?: boolean;
  spin?: number;
}

/**
 * A physically-based gemstone: transmission + IOR refraction + dispersion,
 * colored volume absorption for internal depth, clearcoat for the polished
 * surface, and a dim internal emitter so it reads as an energy stone without
 * bloom washing out the facets.
 */
export function Gem({
  id, color, intensity, scale = 1, light = true, lightDistance = 1.2, lightPower = 1,
  castShadow = false, halo = true, spin = 0,
}: GemProps) {
  const q = useQuality();
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const core = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.SpriteMaterial>(null);
  const pl = useRef<THREE.PointLight>(null);
  const col = useMemo(() => new THREE.Color(color), [color]);
  const geo = gemGeometry(id);
  const seed = useMemo(() => Math.random() * 10, []);
  const physical = q.tier !== 'low';

  useFrame((state, dt) => {
    const k = intensity();
    const t = state.clock.elapsedTime + seed;
    const pulse = 0.9 + Math.sin(t * 1.7) * 0.07 + Math.sin(t * 4.3) * 0.03;
    if (group.current && spin) group.current.rotation.y += dt * spin;
    if (mat.current) mat.current.emissiveIntensity = 0.04 + k * 0.55 * pulse;
    if (core.current) core.current.color.copy(col).multiplyScalar(0.15 + k * 2.4 * pulse);
    if (glow.current) glow.current.opacity = k * 0.35 * pulse;
    if (pl.current) pl.current.intensity = k * pulse * lightPower * 2.2 * scale * scale;
  });

  return (
    <group scale={scale}>
      <group ref={group}>
        <mesh geometry={geo} castShadow={castShadow}>
          {physical ? (
            <meshPhysicalMaterial
              ref={mat}
              color={color}
              emissive={color}
              emissiveIntensity={0.05}
              roughness={0.015}
              metalness={0}
              transmission={1}
              thickness={0.9}
              ior={2.15}
              dispersion={4}
              attenuationColor={color}
              attenuationDistance={0.35}
              specularIntensity={1}
              specularColor="#ffffff"
              clearcoat={1}
              clearcoatRoughness={0.0}
              envMapIntensity={2.4}
              flatShading
            />
          ) : (
            <meshStandardMaterial ref={mat as never} color={color} emissive={color} emissiveIntensity={0.3} roughness={0.08} metalness={0.2} flatShading envMapIntensity={2} />
          )}
        </mesh>
        {/* internal energy — small and dim, seen through the refracting body */}
        <mesh scale={0.22} position={[0, -0.05, 0]}>
          <icosahedronGeometry args={[1, 2]} />
          <meshBasicMaterial ref={core} color={color} toneMapped={false} transparent opacity={0.85} />
        </mesh>
      </group>
      {halo && (
        <sprite scale={2.4}>
          <spriteMaterial ref={glow} map={glowTexture()} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      )}
      {light && <pointLight ref={pl} color={color} distance={lightDistance} decay={2} intensity={0} />}
    </group>
  );
}
