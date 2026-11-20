import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { Stone } from '../data/stones';

/** Each environment fades with `level()` (0 idle → 1 selected). */
type EnvProps = { stone: Stone; level: () => number };

function useFade(level: () => number) {
  const v = useRef(0);
  useFrame(() => { v.current += (level() - v.current) * 0.08; });
  return v;
}

function Lattice({ stone, level }: EnvProps) {
  const g = useRef<THREE.Group>(null);
  const mats = useRef<THREE.LineBasicMaterial[]>([]);
  const f = useFade(level);
  const edges = useMemo(() => [1.1, 1.6, 2.2].map((s) => new THREE.EdgesGeometry(new THREE.BoxGeometry(s, s, s))), []);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.children.forEach((c, i) => { c.rotation.x += dt * 0.2 * (i + 1) * (i % 2 ? -1 : 1); c.rotation.y += dt * 0.15 * (i + 1); });
    mats.current.forEach((m, i) => (m.opacity = (0.12 + f.current * 0.6) * (1 - i * 0.22)));
  });
  return (
    <group ref={g}>
      {edges.map((e, i) => (
        <lineSegments key={i} geometry={e}>
          <lineBasicMaterial ref={(m) => { if (m) mats.current[i] = m; }} color={stone.color} transparent toneMapped={false} />
        </lineSegments>
      ))}
    </group>
  );
}

function Neural({ stone, level }: EnvProps) {
  const f = useFade(level);
  const lines = useRef<THREE.LineSegments>(null);
  const pts = useRef<THREE.Points>(null);
  const { lineGeo, pointGeo } = useMemo(() => {
    const n = 46;
    const P: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) P.push(new THREE.Vector3().randomDirection().multiplyScalar(0.9 + Math.random() * 1.1));
    const seg: number[] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (P[i].distanceTo(P[j]) < 0.85) seg.push(...P[i].toArray(), ...P[j].toArray());
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    const pg = new THREE.BufferGeometry().setFromPoints(P);
    return { lineGeo: lg, pointGeo: pg };
  }, []);
  useFrame((s, dt) => {
    if (lines.current) { lines.current.rotation.y += dt * 0.1; (lines.current.material as THREE.LineBasicMaterial).opacity = 0.08 + f.current * (0.4 + Math.sin(s.clock.elapsedTime * 3) * 0.1); }
    if (pts.current) { pts.current.rotation.y = lines.current?.rotation.y ?? 0; (pts.current.material as THREE.PointsMaterial).opacity = 0.2 + f.current * 0.8; }
  });
  return (
    <group>
      <lineSegments ref={lines} geometry={lineGeo}><lineBasicMaterial color={stone.color} transparent toneMapped={false} /></lineSegments>
      <points ref={pts} geometry={pointGeo}><pointsMaterial color={stone.color} size={0.06} transparent toneMapped={false} /></points>
    </group>
  );
}

function Fluid({ stone, level }: EnvProps) {
  const f = useFade(level);
  const m = useRef<THREE.MeshPhysicalMaterial & { distort: number }>(null);
  useFrame(() => {
    if (m.current) { m.current.opacity = 0.05 + f.current * 0.3; m.current.distort = 0.35 + f.current * 0.3; }
  });
  return (
    <mesh scale={1.7}>
      <icosahedronGeometry args={[1, 24]} />
      <MeshDistortMaterial ref={m as never} color={stone.color} emissive={stone.deep} speed={1.6} distort={0.4} transparent roughness={0.1} metalness={0.2} depthWrite={false} />
    </mesh>
  );
}

function Shards({ stone, level }: EnvProps) {
  const f = useFade(level);
  const inst = useRef<THREE.InstancedMesh>(null);
  const n = 40;
  const data = useMemo(() => Array.from({ length: n }, () => ({
    r: 1.0 + Math.random() * 1.2, a: Math.random() * Math.PI * 2, y: (Math.random() - 0.5) * 1.6,
    s: 0.05 + Math.random() * 0.12, sp: 0.2 + Math.random() * 0.6, rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, 0),
  })), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((st) => {
    if (!inst.current) return;
    const t = st.clock.elapsedTime;
    data.forEach((d, i) => {
      const a = d.a + t * d.sp * (0.3 + f.current);
      const r = d.r * (1 + f.current * 0.25 * Math.sin(t * 2 + i));
      dummy.position.set(Math.cos(a) * r, d.y, Math.sin(a) * r);
      dummy.rotation.set(d.rot.x + t, d.rot.y + t * 0.7, 0);
      dummy.scale.setScalar(d.s * (0.6 + f.current * 0.8));
      dummy.updateMatrix();
      inst.current!.setMatrixAt(i, dummy.matrix);
    });
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, n]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={stone.color} emissive={stone.color} emissiveIntensity={0.8} metalness={0.3} roughness={0.2} flatShading />
    </instancedMesh>
  );
}

function Rings({ stone, level }: EnvProps) {
  const f = useFade(level);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    g.current?.children.forEach((c, i) => {
      c.rotation.z += dt * (0.15 + i * 0.12) * (i % 2 ? -1 : 1) * (0.5 + f.current * 1.5);
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + f.current * 0.55;
    });
  });
  return (
    <group ref={g}>
      {[0.95, 1.25, 1.55, 1.9].map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.35, i * 0.4, 0]}>
          <ringGeometry args={[r, r + 0.02 + (i % 2) * 0.03, 96, 1, 0, Math.PI * (1.2 + i * 0.2)]} />
          <meshBasicMaterial color={stone.color} transparent side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Void({ stone, level }: EnvProps) {
  const f = useFade(level);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(stone.color) }, uLevel: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uLevel; uniform float uTime; varying vec3 vN; varying vec3 vV;
      void main(){ float fr = pow(1.0 - abs(dot(vN, vV)), 2.5); float w = 0.8 + 0.2*sin(uTime*1.5); gl_FragColor = vec4(uColor * fr * w, fr * (0.15 + uLevel*0.7)); }`,
  }), [stone.color]);
  useFrame((s) => { mat.uniforms.uLevel.value = f.current; mat.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <group>
      <mesh material={mat} scale={1.9}><sphereGeometry args={[1, 48, 32]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <circleGeometry args={[1.8, 64]} />
        <meshStandardMaterial color="#0b0604" metalness={1} roughness={0.05} />
      </mesh>
    </group>
  );
}

export function StoneEnvironment(props: EnvProps) {
  switch (props.stone.environment) {
    case 'lattice': return <Lattice {...props} />;
    case 'neural': return <Neural {...props} />;
    case 'fluid': return <Fluid {...props} />;
    case 'shards': return <Shards {...props} />;
    case 'rings': return <Rings {...props} />;
    case 'void': return <Void {...props} />;
  }
}
