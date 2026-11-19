import * as THREE from 'three';
import { clamp } from '../../utils/math';

/**
 * Procedural geometry for the AERONIX wide-body airliner.
 *
 * Coordinate system (model space, 1 unit ≈ 8.35 m):
 *   +X  forward (nose)     +Y  up     +Z  starboard (right wing)
 *
 * Proportions follow a modern twin-engine wide-body: length/diameter ≈ 11,
 * span ≈ length, 32° leading-edge sweep, upswept tail cone, drooped nose.
 */

export const FUSELAGE = {
  length: 8,
  radius: 0.36,
} as const;

const L = FUSELAGE.length;
const R0 = FUSELAGE.radius;

/** Fuselage radius as a function of t ∈ [0,1] (0 = tail tip, 1 = nose tip). */
export function fuselageRadius(t: number): number {
  if (t < 0.24) {
    const s = t / 0.24;
    return R0 * (0.09 + 0.91 * Math.pow(Math.sin((s * Math.PI) / 2), 0.8));
  }
  if (t > 0.865) {
    const s = (t - 0.865) / 0.135;
    return R0 * Math.pow(Math.max(0, 1 - Math.pow(s, 2.1)), 0.52);
  }
  return R0;
}

/** Vertical offset of the fuselage centre line: upswept tail, slightly drooped nose. */
export function fuselageCenterY(t: number): number {
  const r = fuselageRadius(t);
  if (t < 0.24) return (R0 - r) * 0.86;
  if (t > 0.865) return -(R0 - r) * 0.32;
  return 0;
}

/** Profile sample positions, denser near the nose and tail where curvature is high. */
function profileSamples(count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    // ease in/out so the ends receive more samples
    const t = 0.5 - 0.5 * Math.cos(u * Math.PI);
    out.push(0.62 * t + 0.38 * u);
  }
  return out;
}

/**
 * Lathed fuselage with a deformed centre line.
 * UVs: u = position along the body (0 tail → 1 nose), v = angle around (0 top, 0.25 starboard, 0.5 belly, 0.75 port).
 */
export function createFuselageGeometry(radialSegments = 64, profileCount = 120): THREE.BufferGeometry {
  const ts = profileSamples(profileCount);
  const points = ts.map((t) => new THREE.Vector2(Math.max(fuselageRadius(t), 0.0001), -L / 2 + L * t));
  // close the tail cone
  points.unshift(new THREE.Vector2(0.0001, -L / 2 - 0.02));
  const geo = new THREE.LatheGeometry(points, radialSegments, (3 * Math.PI) / 2, Math.PI * 2);
  // Lathe axis (Y) → model X. (x,y,z) → (y,-x,z)
  geo.rotateZ(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const rows = points.length;
  for (let i = 0; i <= radialSegments; i++) {
    for (let j = 0; j < rows; j++) {
      const idx = i * rows + j;
      const x = pos.getX(idx);
      const t = clamp((x + L / 2) / L, 0, 1);
      pos.setY(idx, pos.getY(idx) + fuselageCenterY(t));
      uv.setXY(idx, t, i / radialSegments);
    }
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeVertexNormals();

  // Average normals across the lathe seam (top centre line) to avoid a visible crease.
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  const n = new THREE.Vector3();
  for (let j = 0; j < rows; j++) {
    const a = j;
    const b = radialSegments * rows + j;
    n.set(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, n.x, n.y, n.z);
    nrm.setXYZ(b, n.x, n.y, n.z);
  }
  nrm.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

export interface LiftingSurfaceParams {
  rootChord: number;
  tipChord: number;
  span: number;
  sweepDeg: number;
  dihedralDeg: number;
  thicknessRoot: number;
  thicknessTip: number;
  camber?: number;
  stations?: number;
  chordPoints?: number;
  /** Mirror to the port side (negative Z). */
  mirror?: boolean;
  /** Spanwise shaping exponent for the chord taper (1 = linear). */
  taperCurve?: number;
}

/** NACA 4-digit style airfoil, returns closed loop of [x, y] in chord units (x: 0 LE → 1 TE). */
function airfoilLoop(points: number, thickness: number, camber: number): [number, number][] {
  const p = 0.4;
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const beta = (i / points) * Math.PI;
    const x = 0.5 * (1 - Math.cos(beta));
    const yt =
      5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = x < p ? (camber / (p * p)) * (2 * p * x - x * x) : (camber / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * x - x * x);
    upper.push([x, yc + yt]);
    lower.push([x, yc - yt]);
  }
  // TE(upper) → LE → TE(lower)
  return [...upper.reverse(), ...lower.slice(1)];
}

/**
 * Lofted, swept, tapered lifting surface (wing / stabiliser).
 * Root leading edge at the origin, chord toward -X, span toward +Z (or -Z when mirrored).
 * UVs: u = chordwise (0 LE → 1 TE), v = spanwise (0 root → 1 tip).
 */
export function createLiftingSurfaceGeometry(params: LiftingSurfaceParams): THREE.BufferGeometry {
  const {
    rootChord,
    tipChord,
    span,
    sweepDeg,
    dihedralDeg,
    thicknessRoot,
    thicknessTip,
    camber = 0,
    stations = 14,
    chordPoints = 22,
    mirror = false,
    taperCurve = 1,
  } = params;
  const sweep = Math.tan(THREE.MathUtils.degToRad(sweepDeg));
  const dihedralRad = THREE.MathUtils.degToRad(dihedralDeg);
  const spanCos = Math.cos(dihedralRad);
  const spanSin = Math.sin(dihedralRad);
  const loopLen = chordPoints * 2 + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const zSign = mirror ? -1 : 1;

  for (let s = 0; s <= stations; s++) {
    const f = s / stations;
    const fc = Math.pow(f, taperCurve);
    const chord = rootChord + (tipChord - rootChord) * fc;
    const thick = thicknessRoot + (thicknessTip - thicknessRoot) * f;
    // span runs along (0, sin d, cos d): length-preserving dihedral / cant angle
    const along = f * span;
    const z = along * spanCos;
    const xLE = -along * sweep;
    const yBase = along * spanSin;
    const loop = airfoilLoop(chordPoints, thick, camber);
    loop.forEach(([xc, yc], k) => {
      positions.push(xLE - xc * chord, yBase + yc * chord, z * zSign);
      uvs.push(xc, f);
      void k;
    });
  }

  for (let s = 0; s < stations; s++) {
    for (let k = 0; k < loopLen - 1; k++) {
      const a = s * loopLen + k;
      const b = a + 1;
      const c = a + loopLen;
      const d = c + 1;
      if (mirror) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }

  // Tip cap (fan)
  const tipStart = stations * loopLen;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let k = 0; k < loopLen; k++) {
    cx += positions[(tipStart + k) * 3]!;
    cy += positions[(tipStart + k) * 3 + 1]!;
    cz += positions[(tipStart + k) * 3 + 2]!;
  }
  const centerIndex = positions.length / 3;
  positions.push(cx / loopLen, cy / loopLen, cz / loopLen);
  uvs.push(0.5, 1);
  for (let k = 0; k < loopLen - 1; k++) {
    const a = tipStart + k;
    const b = tipStart + k + 1;
    if (mirror) indices.push(a, centerIndex, b);
    else indices.push(a, b, centerIndex);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Outer engine cowl: lathe along +X (inlet at +X). */
export function createNacelleGeometry(length: number, radius: number, segments = 40): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 = exhaust, 1 = inlet
    let r: number;
    if (t > 0.86) {
      const s = (t - 0.86) / 0.14;
      r = radius * (1 - 0.13 * s * s);
    } else {
      const s = t / 0.86;
      r = radius * (0.74 + 0.26 * Math.sin((s * Math.PI) / 2) ** 0.7);
    }
    pts.push(new THREE.Vector2(r, -length / 2 + length * t));
  }
  // Inner inlet duct back into the cowl so the inlet reads as a hollow lip
  pts.push(new THREE.Vector2(radius * 0.84, length / 2 - 0.004));
  pts.push(new THREE.Vector2(radius * 0.8, length / 2 - length * 0.12));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateZ(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Merged fan blades (one draw call). Disc in the YZ plane, facing +X. */
export function createFanGeometry(radius: number, blades = 20): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < blades; i++) {
    const g = new THREE.BoxGeometry(0.006, radius * 0.78, radius * 0.16);
    g.translate(0, radius * 0.5, 0);
    g.rotateY(0.45); // blade pitch
    g.rotateX((i / blades) * Math.PI * 2);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Minimal non-indexed merge for simple, same-attribute geometries. */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  for (const g of geos) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.attributes.position as THREE.BufferAttribute;
    const nr = ng.attributes.normal as THREE.BufferAttribute | undefined;
    const u = ng.attributes.uv as THREE.BufferAttribute | undefined;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      if (nr) nor.push(nr.getX(i), nr.getY(i), nr.getZ(i));
      if (u) uv.push(u.getX(i), u.getY(i));
    }
    if (ng !== g) ng.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (nor.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (uv.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

/** Geometric layout shared by the model, camera sequences and the viewer hotspots. */
export const LAYOUT = {
  wing: {
    rootLE: new THREE.Vector3(0.78, -0.2, 0),
    rootChord: 1.6,
    tipChord: 0.32,
    span: 3.92,
    sweepDeg: 32,
    dihedralDeg: 6,
  },
  engineSpanFraction: 0.33,
  hStab: { rootLE: new THREE.Vector3(-3.0, 0.08, 0), rootChord: 0.86, tipChord: 0.3, span: 1.56, sweepDeg: 34, dihedralDeg: 6 },
  vStab: { rootLE: new THREE.Vector3(-2.5, 0.24, 0), rootChord: 1.38, tipChord: 0.46, span: 1.5, sweepDeg: 40 },
  nacelle: { length: 1.02, radius: 0.205 },
} as const;

/** Position of an engine centre given the side (+1 starboard / -1 port) and span fraction. */
export function enginePosition(side: 1 | -1, spanFraction: number = LAYOUT.engineSpanFraction) {
  const w = LAYOUT.wing;
  const along = spanFraction * w.span;
  const d = THREE.MathUtils.degToRad(w.dihedralDeg);
  const xLE = w.rootLE.x - along * Math.tan(THREE.MathUtils.degToRad(w.sweepDeg));
  const y = w.rootLE.y + along * Math.sin(d);
  return new THREE.Vector3(xLE + 0.32, y - 0.31, along * Math.cos(d) * side);
}

/** Leading edge of the wing tip (where the winglet attaches). */
export function wingTipLeadingEdge(side: 1 | -1) {
  const w = LAYOUT.wing;
  const d = THREE.MathUtils.degToRad(w.dihedralDeg);
  return new THREE.Vector3(
    w.rootLE.x - w.span * Math.tan(THREE.MathUtils.degToRad(w.sweepDeg)),
    w.rootLE.y + w.span * Math.sin(d),
    w.span * Math.cos(d) * side,
  );
}

export function wingTipPosition(side: 1 | -1) {
  const le = wingTipLeadingEdge(side);
  return le.setX(le.x - LAYOUT.wing.tipChord * 0.5);
}
