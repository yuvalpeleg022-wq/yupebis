import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SUN_DIRECTION, PALETTE } from './environmentConfig';

const vertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // render at the far plane
}
`;

const fragment = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.22, h));
  col = mix(col, uZenith, smoothstep(0.18, 0.85, h));
  // below the horizon the cloud sea fog colour continues (no dark band)
  col = mix(col, uHorizon, smoothstep(0.0, -0.08, h));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(sd, 6.0) * 0.32 + pow(sd, 64.0) * 0.7 + pow(sd, 900.0) * 3.0);
  // subtle horizon haze band
  col += vec3(0.62, 0.74, 0.88) * exp(-abs(h) * 26.0) * 0.1;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Procedural atmospheric sky (no textures). */
export function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uZenith: { value: new THREE.Color(PALETTE.zenith) },
          uMid: { value: new THREE.Color(PALETTE.mid) },
          uHorizon: { value: new THREE.Color(PALETTE.horizon) },
          uSunColor: { value: new THREE.Color(PALETTE.sun) },
          uSunDir: { value: SUN_DIRECTION.clone() },
        },
      }),
    [],
  );
  const geometry = useMemo(() => new THREE.SphereGeometry(1600, 48, 24), []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );
  return <mesh geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />;
}
