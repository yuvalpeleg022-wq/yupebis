import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { scrollState } from '../lib/scroll';
import { lerp, range, smooth } from '../lib/math';
import { finaleFlash, finaleStone } from '../lib/choreography';
import { useQuality } from '../hooks/useQuality';
import { Dust, Nebula } from './Cosmos';
import { Relic } from './Relic';


function Rig() {
  const { camera } = useThree();
  const q = useQuality();
  const sp = useRef(0);
  useFrame((s, dt) => {
    sp.current += (scrollState.finale - sp.current) * (q.reducedMotion ? 1 : 1 - Math.exp(-dt * 5));
    const p = sp.current;
    const approach = smooth(range(p, 0, 0.25));
    const z = lerp(14, 5.4, approach) - range(p, 0.55, 0.78) * 1.2;
    const a = lerp(-0.9, 0, approach) + Math.sin(s.clock.elapsedTime * 0.2) * 0.05;
    const shake = q.reducedMotion ? 0 : range(p, 0.6, 0.79) * (1 - range(p, 0.8, 0.84)) * 0.04;
    camera.position.set(Math.sin(a) * z + (Math.random() - 0.5) * shake, 0.4 + (Math.random() - 0.5) * shake, Math.cos(a) * z);
    camera.lookAt(0, 0.2, 0);
  });
  return null;
}

function Shockwave() {
  const m = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const p = scrollState.finale;
    const k = range(p, 0.6, 0.82);
    if (m.current) m.current.scale.setScalar(0.5 + k * 9);
    if (mat.current) mat.current.opacity = k > 0 && k < 1 ? (1 - k) * 0.9 : 0;
  });
  return (
    <mesh ref={m} rotation={[Math.PI / 2.2, 0, 0]}>
      <ringGeometry args={[0.95, 1, 128]} />
      <meshBasicMaterial ref={mat} color="#fff2d0" transparent side={THREE.DoubleSide} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function EnergyColumn() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; uniform float uK; varying vec2 vUv;
      vec3 pal(float x){ x=fract(x); vec3 c[6]; c[0]=vec3(.18,.48,1.); c[1]=vec3(1.,.82,.25); c[2]=vec3(1.,.16,.24); c[3]=vec3(.64,.23,1.); c[4]=vec3(.13,.9,.54); c[5]=vec3(1.,.54,.12);
        float f=x*6.; int i=int(floor(f)); float t=fract(f); vec3 a=c[0], b=c[1];
        for(int k=0;k<6;k++){ if(k==i){ a=c[k]; b=c[(k+1)-((k+1)/6)*6]; } } return mix(a,b,t); }
      void main(){ float stripe = pow(abs(sin((vUv.x*6.0 + vUv.y*2.0 - uT*1.5)*3.14159)), 18.0);
        float edge = smoothstep(0.0,0.3,vUv.y)*smoothstep(1.0,0.6,vUv.y);
        gl_FragColor = vec4(pal(vUv.x + uT*0.1) * stripe * 2.0, stripe * edge * uK); }`,
  }), []);
  useFrame((s) => { mat.uniforms.uT.value = s.clock.elapsedTime; mat.uniforms.uK.value = range(scrollState.finale, 0.5, 0.78) * (1 - range(scrollState.finale, 0.84, 0.95)); });
  return (
    <mesh material={mat} position={[0, 0.55, 0]}>
      <cylinderGeometry args={[2.8, 2.8, 6, 64, 1, true]} />
    </mesh>
  );
}

export default function FinaleScene() {
  const q = useQuality();
  const p = () => scrollState.finale;
  return (
    <>
      <Rig />
      <ambientLight intensity={0.08} />
      <spotLight position={[3, 5, 6]} angle={0.5} penumbra={0.9} intensity={90} color="#fff1dc" />
      <pointLight position={[-4, 1, -3]} intensity={35} color="#ff2a3d" />
      <Nebula a="#2a0610" b="#0d0626" c="#6a4a10" mix={() => range(p(), 0.2, 0.8)} flash={() => finaleFlash(p()) * 1.4} />
      <Dust count={q.particles} intensity={() => 0.2 + range(p(), 0.4, 0.8) * 1.6} />
      <group position={[0, 0.55, 0]}>
        <Relic stoneIntensity={(i) => 0.05 + finaleStone(i, p()) * 0.95 + finaleFlash(p()) * 0.6} energy={() => range(p(), 0.55, 0.85)} />
        <Shockwave />
      </group>
      <EnergyColumn />
      {q.postFx && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={1.3} luminanceThreshold={0.55} radius={0.85} />
          <Vignette offset={0.2} darkness={0.9} />
        </EffectComposer>
      )}
    </>
  );
}
