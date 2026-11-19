import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Destination } from '../types';
import { arcPoints, latLonToVector3 } from '../utils/geo';

const routeVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const routeFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uActive;
varying vec2 vUv;
void main() {
  // travelling dashes along the route (u = 0 hub → 1 destination)
  float dash = smoothstep(0.35, 0.5, fract(vUv.x * 14.0 - uTime * 0.6)) * smoothstep(0.85, 0.7, fract(vUv.x * 14.0 - uTime * 0.6));
  float ends = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
  float base = mix(0.16, 0.55, uActive);
  float a = (base + dash * mix(0.25, 0.8, uActive)) * ends;
  gl_FragColor = vec4(uColor, a);
}
`;

interface Props {
  hub: { lat: number; lon: number };
  destinations: Destination[];
  radius: number;
  selectedId: string | null;
  animated: boolean;
}

/** Illustrative great-circle routes from the fictional hub with animated, shader-driven dashes. */
export function FlightRoutes({ hub, destinations, radius, selectedId, animated }: Props) {
  const routes = useMemo(() => {
    const from = latLonToVector3(hub.lat, hub.lon, radius);
    return destinations.map((d) => {
      const to = latLonToVector3(d.lat, d.lon, radius);
      const curve = new THREE.CatmullRomCurve3(arcPoints(from, to, radius, 72));
      const geometry = new THREE.TubeGeometry(curve, 96, 0.0032 * radius, 6, false);
      const material = new THREE.ShaderMaterial({
        vertexShader: routeVertex,
        fragmentShader: routeFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#AEBBC8') },
          uActive: { value: 0 },
        },
      });
      return { id: d.id, geometry, material };
    });
  }, [hub.lat, hub.lon, destinations, radius]);

  useEffect(
    () => () =>
      routes.forEach((r) => {
        r.geometry.dispose();
        r.material.dispose();
      }),
    [routes],
  );

  const gold = useMemo(() => new THREE.Color('#C5A46D'), []);
  const silver = useMemo(() => new THREE.Color('#AEBBC8'), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    routes.forEach((r) => {
      const u = r.material.uniforms;
      if (animated) u.uTime!.value = state.clock.elapsedTime;
      const target = r.id === selectedId ? 1 : 0;
      u.uActive!.value += (target - u.uActive!.value) * (1 - Math.exp(-6 * dt));
      (u.uColor!.value as THREE.Color).lerpColors(silver, gold, u.uActive!.value);
    });
  });

  return (
    <group>
      {routes.map((r) => (
        <mesh key={r.id} geometry={r.geometry} material={r.material} renderOrder={2} />
      ))}
    </group>
  );
}
