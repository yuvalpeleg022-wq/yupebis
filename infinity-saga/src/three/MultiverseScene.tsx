import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { UNIVERSES } from '../data/universes';
import { useQuality } from '../hooks/useQuality';

export function universePos(i: number): THREE.Vector3 {
  const a = i * 1.15;
  return new THREE.Vector3(Math.cos(a) * 4.2, Math.sin(a * 1.3) * 1.6, -i * 9);
}

const bubbleVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){ vN = normalize(normalMatrix*normal); vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }
`;
const bubbleFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uTime; uniform float uActive; uniform float uRift;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
  float n(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
  void main(){
    float fr = pow(1.0 - abs(dot(vN, vV)), 2.2);
    float sw = n(vP*2.5 + vec3(uTime*0.3, -uTime*0.2, uTime*0.1)) * n(vP*5.0 - uTime*0.15);
    float rift = smoothstep(0.03, 0.0, abs(vP.y + sin(vP.x*4.0 + uTime)*0.15)) * uRift;
    vec3 c = uColor * (fr*1.6 + sw*0.9*(0.4+uActive)) + vec3(1.0)*rift;
    gl_FragColor = vec4(c, clamp(fr*0.9 + sw*0.35 + rift, 0.0, 1.0) * (0.55 + uActive*0.45));
  }
`;

function Universe({ i, active, onSelect }: { i: number; active: boolean; onSelect: (i: number) => void }) {
  const u = UNIVERSES[i];
  const g = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: bubbleVert, fragmentShader: bubbleFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(u.color) }, uTime: { value: 0 }, uActive: { value: 0 }, uRift: { value: u.canon === 'fan-theory' ? 1 : 0.25 } },
  }), [u]);
  const pos = useMemo(() => universePos(i), [i]);
  useFrame((s, dt) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime + i * 3;
    mat.uniforms.uActive.value += ((active ? 1 : 0) - mat.uniforms.uActive.value) * 0.06;
    if (g.current) g.current.position.y = pos.y + Math.sin(s.clock.elapsedTime * 0.5 + i) * 0.25;
    if (rings.current) rings.current.children.forEach((c, k) => { c.rotation.z += dt * (0.3 + k * 0.25) * (k % 2 ? -1 : 1) * (active ? 2.2 : 1); });
  });
  return (
    <group ref={g} position={pos}>
      <mesh material={mat} onClick={(e) => { e.stopPropagation(); onSelect(i); }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <sphereGeometry args={[1.6, 64, 48]} />
      </mesh>
      <group ref={rings}>
        {[2.1, 2.45, 2.9].map((r, k) => (
          <mesh key={k} rotation={[Math.PI / 2 + k * 0.5, k * 0.7, 0]}>
            <torusGeometry args={[r, 0.008 + k * 0.004, 8, 160, Math.PI * (1.4 + k * 0.25)]} />
            <meshBasicMaterial color={u.color} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
      <pointLight color={u.color} intensity={active ? 14 : 4} distance={8} />
    </group>
  );
}

function Rig({ active }: { active: number }) {
  const { camera, pointer } = useThree();
  const q = useQuality();
  const look = useRef(new THREE.Vector3());
  const prev = useRef(new THREE.Vector3());
  const speed = useRef(0);
  useFrame((_, dt) => {
    const p = universePos(active);
    const target = new THREE.Vector3(p.x - 2.6, p.y + 0.5, p.z + 7.4);
    if (!q.reducedMotion && !q.isTouch) { target.x += pointer.x * 0.5; target.y += pointer.y * 0.3; }
    const k = q.reducedMotion ? 1 : 1 - Math.exp(-dt * 1.8);
    prev.current.copy(camera.position);
    camera.position.lerp(target, k);
    look.current.lerp(new THREE.Vector3(p.x - 2.9, p.y, p.z - 2), k);
    camera.lookAt(look.current);
    speed.current = camera.position.distanceTo(prev.current) / Math.max(dt, 1e-3);
    // Warp: widen FOV with travel speed
    const pc = camera as THREE.PerspectiveCamera;
    const fov = 42 + Math.min(speed.current * 0.9, 22);
    pc.fov += (fov - pc.fov) * 0.15;
    pc.updateProjectionMatrix();
    multiverseSpeed.value = speed.current;
  });
  return null;
}

const multiverseSpeed = { value: 0 };

function Fx() {
  const q = useQuality();
  const offset = useMemo(() => new THREE.Vector2(0, 0), []);
  useFrame(() => {
    const s = Math.min(multiverseSpeed.value * 0.0006, 0.006);
    offset.set(s, s * 0.6);
  });
  if (!q.postFx) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={1.2} luminanceThreshold={0.5} radius={0.8} />
      <ChromaticAberration offset={offset} blendFunction={BlendFunction.NORMAL} radialModulation={false} modulationOffset={0} />
      <Vignette offset={0.2} darkness={0.85} />
    </EffectComposer>
  );
}

export default function MultiverseScene({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  const q = useQuality();
  return (
    <>
      <Rig active={active} />
      <ambientLight intensity={0.15} />
      <Stars radius={80} depth={60} count={q.tier === 'low' ? 1500 : 5000} factor={3.2} saturation={0.6} fade speed={0.6} />
      {UNIVERSES.map((_, i) => <Universe key={i} i={i} active={i === active} onSelect={onSelect} />)}
      <Fx />
    </>
  );
}
