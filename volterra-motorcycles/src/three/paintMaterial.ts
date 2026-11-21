import * as THREE from 'three';
import type { Model3D } from '../data/motorcycles';

/**
 * Hue-keyed paint recolouring.
 *
 * Generated / scanned motorcycle models usually ship as a single baked
 * texture, so there is no separate "paint" material to swap. Instead we
 * patch the standard PBR shader: texels whose hue sits close to the
 * factory paint hue (and are saturated enough to be paint, not chrome
 * or rubber) are re-tinted to the selected colour while keeping the
 * original light/dark variation. When a real model with a dedicated
 * paint material arrives, simply set that material's `color` instead.
 */
export interface PaintUniforms {
  uPaintMix: { value: number };
  uPaintTint: { value: THREE.Color };
  uPaintHue: { value: number };
  uPaintRange: { value: number };
  uPaintMinSat: { value: number };
  uPaintSrcV: { value: number };
  uPaintRough: { value: number };
  uPaintRoughMix: { value: number };
}

const GLSL_HELPERS = /* glsl */ `
uniform float uPaintMix;
uniform vec3  uPaintTint;
uniform float uPaintHue;
uniform float uPaintRange;
uniform float uPaintMinSat;
uniform float uPaintSrcV;
uniform float uPaintRough;
uniform float uPaintRoughMix;
float vtPaintMask = 0.0;

vec3 vt_rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 vt_hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

const GLSL_RECOLOR = /* glsl */ `
#include <map_fragment>
{
  vec3 s = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
  vec3 hsv = vt_rgb2hsv(s);
  float dh = abs(hsv.x - uPaintHue);
  dh = min(dh, 1.0 - dh);
  float m = 1.0 - smoothstep(uPaintRange * 0.55, uPaintRange, dh);
  m *= smoothstep(uPaintMinSat * 0.6, uPaintMinSat, hsv.y);
  m *= smoothstep(0.03, 0.10, hsv.z);
  vtPaintMask = m * uPaintMix;
  vec3 t = vt_rgb2hsv(uPaintTint);
  float v = clamp(t.z * pow(hsv.z / uPaintSrcV, 0.85), 0.0, 1.0);
  vec3 rc = vt_hsv2rgb(vec3(t.x, t.y, v));
  diffuseColor.rgb = mix(diffuseColor.rgb, pow(rc, vec3(2.2)), vtPaintMask);
}
`;

const GLSL_ROUGH = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, uPaintRough, vtPaintMask * uPaintRoughMix);
`;

export function patchPaintMaterial(material: THREE.MeshStandardMaterial, cfg: Model3D): PaintUniforms {
  const uniforms: PaintUniforms = {
    uPaintMix: { value: 0 },
    // stored in sRGB (shader works in sRGB space for keying)
    uPaintTint: { value: new THREE.Color(1, 1, 1) },
    uPaintHue: { value: cfg.paintHue },
    uPaintRange: { value: cfg.hueRange },
    uPaintMinSat: { value: cfg.minSaturation },
    uPaintSrcV: { value: cfg.paintValue },
    uPaintRough: { value: 0.5 },
    uPaintRoughMix: { value: 0 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_HELPERS}`)
      .replace('#include <map_fragment>', GLSL_RECOLOR)
      .replace('#include <roughnessmap_fragment>', GLSL_ROUGH);
  };
  material.customProgramCacheKey = () => 'volterra-paint-v1';
  material.needsUpdate = true;
  return uniforms;
}

/** Parse a hex colour into the sRGB triplet the shader expects. */
export function srgbFromHex(hex: string, target = new THREE.Color()): THREE.Color {
  const c = new THREE.Color(hex);
  // THREE.Color stores linear values; convert back to sRGB components.
  c.getRGB(target, THREE.SRGBColorSpace);
  return target;
}
