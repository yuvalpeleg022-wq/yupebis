import * as THREE from 'three';

/** Latitude/longitude (degrees) to a point on a sphere, matching three.js equirectangular UVs. */
export function latLonToVector3(lat: number, lon: number, radius: number, target = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return target.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Points along a great-circle arc lifted above the sphere, for flight-route curves. */
export function arcPoints(from: THREE.Vector3, to: THREE.Vector3, radius: number, segments = 64) {
  const a = from.clone().normalize();
  const b = to.clone().normalize();
  const angle = a.angleTo(b);
  const lift = 0.06 + angle * 0.16;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().copy(a).lerp(b, t);
    // slerp approximation via normalized lerp is enough with enough segments
    p.normalize();
    const h = Math.sin(Math.PI * t) * lift;
    p.multiplyScalar(radius * (1 + h));
    pts.push(p);
  }
  return pts;
}
