import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Clouds } from '@react-three/drei';
import * as THREE from 'three';
import { noiseGLSL } from './shaders';
import { PALETTE, SUN_DIRECTION } from './environmentConfig';
import { seeded } from '../utils/math';

/**
 * Soft cloud puff texture generated on a canvas (no download). Returned as a data URL
 * because drei's <Clouds> loads its sprite through useTexture.
 */
let puffUrl: string | null = null;
function cloudPuffTexture(): string {
  if (puffUrl) return puffUrl;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const rand = seeded(7);
  // overlapping radial blobs build an irregular, fluffy alpha mask
  for (let i = 0; i < 26; i++) {
    const x = size * (0.3 + rand() * 0.4);
    const y = size * (0.3 + rand() * 0.4);
    const r = size * (0.12 + rand() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.32)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  puffUrl = c.toDataURL('image/png');
  return puffUrl;
}

interface CloudSpec {
  position: THREE.Vector3;
  bounds: [number, number, number];
  volume: number;
  seed: number;
  opacity: number;
  speed: number;
}

interface CloudFieldProps {
  count: number;
  segments: number;
  /** World units per second the clouds drift past (aircraft flies toward +X). */
  speed?: number;
  /** Range of the wrapping volume along X. */
  range?: number;
  animated?: boolean;
}

/** Instanced, lit volumetric-style clouds (drei <Clouds> = single InstancedMesh). */
export function CloudField({ count, segments, speed = 6, range = 70, animated = true }: CloudFieldProps) {
  const texture = useMemo(cloudPuffTexture, []);
  const specs = useMemo<CloudSpec[]>(() => {
    const rand = seeded(42);
    return Array.from({ length: count }, (_, i) => {
      const layer = i % 3; // 0 low/near, 1 mid, 2 far/high
      const x = -range + rand() * range * 2;
      const z = layer === 0 ? -14 + rand() * 28 : layer === 1 ? -40 + rand() * 20 : -90 + rand() * 40;
      const y = layer === 0 ? -5 - rand() * 3 : layer === 1 ? -3 + rand() * 6 : 2 + rand() * 10;
      // keep the immediate aircraft area clear
      const safeZ = Math.abs(z) < 5 && Math.abs(y) < 3 ? z + 10 * Math.sign(z || 1) : z;
      return {
        position: new THREE.Vector3(x, y, safeZ),
        bounds: [8 + rand() * 10, 2 + rand() * 2.5, 4 + rand() * 4] as [number, number, number],
        volume: 6 + rand() * 6,
        seed: Math.floor(rand() * 1000),
        opacity: layer === 2 ? 0.45 : layer === 1 ? 0.6 : 0.5,
        speed: layer === 2 ? 0.4 : layer === 1 ? 0.75 : 1,
      };
    });
  }, [count, range]);

  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, delta) => {
    if (!animated) return;
    const dt = Math.min(delta, 0.1);
    refs.current.forEach((g, i) => {
      const s = specs[i];
      if (!g || !s) return;
      g.position.x -= dt * speed * s.speed;
      if (g.position.x < -range) g.position.x += range * 2;
    });
  });

  return (
    <Clouds texture={texture} limit={Math.max(64, count * segments)} material={THREE.MeshLambertMaterial} frustumCulled={false}>
      {specs.map((s, i) => (
        <Cloud
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
          position={s.position}
          seed={s.seed}
          segments={segments}
          bounds={s.bounds}
          volume={s.volume}
          opacity={s.opacity}
          color={PALETTE.cloudLight}
          fade={60}
          growth={4}
          speed={animated ? 0.08 : 0}
        />
      ))}
    </Clouds>
  );
}

const deckVertex = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const deckFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uLight;
uniform vec3 uShadow;
uniform vec3 uFog;
uniform vec3 uSunDir;
uniform vec3 uCam;
uniform vec3 uSunColor;
varying vec3 vWorld;
varying vec2 vUv;
${noiseGLSL}
void main() {
  vec2 p = vWorld.xz * 0.035 + vec2(uTime * 0.05, 0.0);
  float n = fbm(p);
  float n2 = fbm(p * 2.3 + 7.1);
  float density = smoothstep(0.32, 0.78, n * 0.75 + n2 * 0.35);
  // fake lighting: brighter on the sun-facing slopes of the noise field
  float e = 0.04;
  float nx = fbm(p + vec2(e, 0.0)) - n;
  float nz = fbm(p + vec2(0.0, e)) - n;
  vec3 nrm = normalize(vec3(-nx * 8.0, 1.0, -nz * 8.0));
  float lit = clamp(dot(nrm, normalize(uSunDir)) * 0.5 + 0.55, 0.0, 1.0);
  vec3 col = mix(uShadow, uLight, pow(lit * density, 1.35) * 0.9 + 0.04);
  float dist = length(vWorld.xz - uCam.xz);
  float fog = smoothstep(80.0, 520.0, dist);
  // fog colour = sky colour at the horizon in this view direction (incl. sun glow) → seamless horizon
  vec3 viewDir = normalize(vWorld - uCam);
  // identical to SkyDome at h = 0
  float sd = max(dot(normalize(vec3(viewDir.x, 0.0, viewDir.z)), normalize(uSunDir)), 0.0);
  vec3 fogCol = uFog + uSunColor * (pow(sd, 6.0) * 0.32 + pow(sd, 64.0) * 0.7) + vec3(0.62, 0.74, 0.88) * 0.1;
  col = mix(col, fogCol, fog);
  float alpha = mix(0.55 + density * 0.45, 1.0, fog);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Endless cloud sea far below the aircraft — one shader-driven plane, no overdraw stack. */
export function CloudDeck({ y = -14, animated = true }: { y?: number; animated?: boolean }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: deckVertex,
        fragmentShader: deckFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uLight: { value: new THREE.Color(PALETTE.cloudLight) },
          uShadow: { value: new THREE.Color(PALETTE.cloudShadow) },
          uFog: { value: new THREE.Color(PALETTE.deckFog) },
          uSunDir: { value: SUN_DIRECTION.clone() },
          uCam: { value: new THREE.Vector3() },
          uSunColor: { value: new THREE.Color(PALETTE.sun) },
        },
      }),
    [],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(3000, 3000, 1, 1).rotateX(-Math.PI / 2), []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );
  useFrame((state, delta) => {
    if (animated) material.uniforms.uTime!.value += Math.min(delta, 0.1) * 2.2;
    (material.uniforms.uCam!.value as THREE.Vector3).copy(state.camera.position);
  });
  return <mesh geometry={geometry} material={material} position={[0, y, 0]} renderOrder={-5} />;
}

const rayFragment = /* glsl */ `
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
void main() {
  float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
  float fall = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.08, vUv.y);
  float flicker = 0.75 + 0.25 * sin(uTime * 0.3 + uSeed * 10.0);
  gl_FragColor = vec4(vec3(1.0, 0.94, 0.85), edge * fall * 0.075 * flicker);
}
`;

/** A few additive light shafts emanating from the sun direction. Cheap and subtle. */
export function LightRays() {
  const rays = useMemo(() => {
    const rand = seeded(11);
    return Array.from({ length: 6 }, (_, i) => ({
      rotation: -0.55 + i * 0.22 + rand() * 0.08,
      width: 6 + rand() * 10,
      seed: rand(),
    }));
  }, []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0), []);
  const materials = useMemo(
    () =>
      rays.map(
        (r) =>
          new THREE.ShaderMaterial({
            vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
            fragmentShader: rayFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: { uTime: { value: 0 }, uSeed: { value: r.seed } },
          }),
      ),
    [rays],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
    },
    [geometry, materials],
  );
  useFrame((state) => {
    materials.forEach((m) => {
      m.uniforms.uTime!.value = state.clock.elapsedTime;
    });
  });
  const origin = SUN_DIRECTION.clone().multiplyScalar(120);
  return (
    <group position={origin}>
      <group rotation={[0, Math.atan2(-SUN_DIRECTION.x, -SUN_DIRECTION.z), 0]}>
        {rays.map((r, i) => (
          <mesh key={i} geometry={geometry} material={materials[i]} rotation={[0, 0, r.rotation]} scale={[r.width, 140, 1]} />
        ))}
      </group>
    </group>
  );
}
