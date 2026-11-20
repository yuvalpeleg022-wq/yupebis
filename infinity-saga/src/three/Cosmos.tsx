import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ───────────── Floating dust / cosmic particles ───────────── */

const dustVert = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPixelRatio;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float t = uTime * (0.05 + aSeed * 0.08);
    p.x += sin(t + aSeed * 40.0) * 0.6;
    p.y += cos(t * 0.8 + aSeed * 13.0) * 0.5 + uIntensity * sin(uTime * 0.6 + aSeed * 9.0) * 0.4;
    p.z += sin(t * 0.6 + aSeed * 21.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.6 + aSeed * 2.2) * (1.0 + uIntensity * 1.4);
    gl_PointSize = size * uPixelRatio * (38.0 / -mv.z);
    vColor = aColor;
    float tw = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 100.0);
    vAlpha = tw * (0.25 + uIntensity * 0.75) * smoothstep(60.0, 8.0, -mv.z);
  }
`;
const dustFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor * 1.6, a * vAlpha);
  }
`;

const PALETTE = ['#e8b04b', '#ffffff', '#c8102e', '#2f7bff', '#ffd23f', '#a43bff', '#22e58a', '#ff8a1f'];

export function Dust({ count, radius = 22, intensity }: { count: number; radius?: number; intensity: () => number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = radius * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.6;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      seed[i] = Math.random();
      c.set(Math.random() < 0.6 ? PALETTE[Math.random() < 0.6 ? 0 : 1] : PALETTE[2 + Math.floor(Math.random() * 6)]);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    return g;
  }, [count, radius]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uIntensity: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } }),
    [],
  );

  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
    uniforms.uIntensity.value += (intensity() - uniforms.uIntensity.value) * 0.06;
  });

  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={dustVert}
        fragmentShader={dustFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ───────────── Procedural nebula sky ───────────── */

const nebulaVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const nebulaFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform float uMix;
  uniform float uFlash;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(17.1, 113.7, 41.3))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    vec3 d = normalize(vDir);
    float t = uTime * 0.012;
    float n = fbm(d * 2.2 + vec3(t, -t * 0.6, t * 0.3));
    float n2 = fbm(d * 4.5 - vec3(t * 0.4, t, 0.0) + n);
    float band = smoothstep(0.75, 0.0, abs(d.y + 0.15 + (n - 0.5) * 0.6));
    vec3 col = mix(uA, uB, smoothstep(0.35, 0.8, n2));
    col = mix(col, uC, uMix * smoothstep(0.4, 0.9, n));
    float density = pow(n2, 2.6) * band * 1.35;
    vec3 c = col * density;
    // stars
    vec3 sp = d * 380.0;
    float s = step(0.9975, hash(floor(sp)));
    c += vec3(s) * (0.4 + 0.6 * hash(floor(sp) + 3.0));
    c += uFlash * vec3(1.0, 0.95, 0.9);
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function Nebula({
  a = '#3a0612', b = '#1a0b30', c = '#5a3a08', mix = () => 0, flash = () => 0,
}: { a?: string; b?: string; c?: string; mix?: () => number; flash?: () => number }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uA: { value: new THREE.Color(a) },
      uB: { value: new THREE.Color(b) },
      uC: { value: new THREE.Color(c) },
      uMix: { value: 0 },
      uFlash: { value: 0 },
    }),
    [a, b, c],
  );
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
    uniforms.uMix.value = mix();
    uniforms.uFlash.value = flash();
  });
  return (
    <mesh scale={90} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial vertexShader={nebulaVert} fragmentShader={nebulaFrag} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}
