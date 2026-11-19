import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useTexture } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import gsap from 'gsap';
import type { Destination } from '../types';
import { latLonToVector3 } from '../utils/geo';
import { FlightRoutes } from './FlightRoutes';

export const GLOBE_RADIUS = 2;
const LIGHT_DIR = new THREE.Vector3(-0.6, 0.35, 0.75).normalize();

const earthVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const earthFragment = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uSpec;
uniform vec3 uLight;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vec3 day = texture2D(uDay, vUv).rgb;
  float lum = dot(day, vec3(0.299, 0.587, 0.114));
  // brand grade: land in silver-blue, oceans in deep navy
  vec3 graded = mix(vec3(0.03, 0.09, 0.17), vec3(0.47, 0.58, 0.68), smoothstep(0.08, 0.55, lum));
  float ocean = texture2D(uSpec, vUv).r;
  graded = mix(graded, vec3(0.025, 0.075, 0.15), ocean * 0.9);
  float ndl = dot(normalize(vNormalW), uLight);
  float dayMix = smoothstep(-0.2, 0.35, ndl);
  vec3 col = graded * (0.25 + 0.95 * max(ndl, 0.0));
  // ocean sheen
  vec3 h = normalize(uLight + vViewDir);
  col += vec3(0.75, 0.82, 0.9) * pow(max(dot(normalize(vNormalW), h), 0.0), 90.0) * ocean * 0.22;
  // city lights in champagne gold on the night side
  vec3 lights = texture2D(uNight, vUv).rgb;
  col += vec3(0.95, 0.78, 0.48) * lights * (1.0 - dayMix) * 1.4;
  // fresnel rim
  float rim = pow(1.0 - max(dot(normalize(vNormalW), vViewDir), 0.0), 3.0);
  col += vec3(0.35, 0.55, 0.8) * rim * 0.35;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const atmosphereFragment = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  // Back faces of a slightly larger shell: 0 at the outer silhouette, max hugging the planet's limb.
  float d = -dot(normalize(vNormalW), vViewDir);
  float glow = smoothstep(0.0, 0.5, d);
  glow = glow * glow * 0.75;
  gl_FragColor = vec4(vec3(0.42, 0.62, 0.9) * glow, 1.0);
}
`;

export interface EarthGlobeHandle {
  reset: () => void;
}

interface Props {
  destinations: Destination[];
  hub: { lat: number; lon: number; iata: string };
  selectedId: string | null;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
}

const BASE = '/textures/earth/';

/**
 * Interactive Earth: textured sphere (NASA-derived imagery, see ASSET_REQUIREMENTS.md),
 * fresnel atmosphere, city markers, illustrative routes and smooth camera fly-to on selection.
 */
export const EarthGlobe = forwardRef<EarthGlobeHandle, Props>(function EarthGlobe(
  { destinations, hub, selectedId, onSelect, reducedMotion },
  ref,
) {
  const { day, night, spec } = useTexture({
    day: `${BASE}earth_atmos_2048.jpg`,
    night: `${BASE}earth_lights_2048.jpg`,
    spec: `${BASE}earth_specular_2048.jpg`,
  });
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useRef<OrbitControlsImpl>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    [day, night, spec].forEach((t) => {
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
    });
  }, [day, night, spec, gl]);

  const earthMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVertex,
        fragmentShader: earthFragment,
        uniforms: {
          uDay: { value: day },
          uNight: { value: night },
          uSpec: { value: spec },
          uLight: { value: LIGHT_DIR },
        },
      }),
    [day, night, spec],
  );
  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVertex,
        fragmentShader: atmosphereFragment,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const geos = useMemo(
    () => ({
      earth: new THREE.SphereGeometry(GLOBE_RADIUS, 96, 64),
      atmo: new THREE.SphereGeometry(GLOBE_RADIUS * 1.12, 64, 32),
      dot: new THREE.SphereGeometry(0.022, 16, 12),
      ring: new THREE.RingGeometry(0.035, 0.05, 40),
      hit: new THREE.SphereGeometry(0.11, 8, 6),
    }),
    [],
  );
  const markerMats = useMemo(
    () => ({
      city: new THREE.MeshBasicMaterial({ color: '#F4F7FA', toneMapped: false }),
      gold: new THREE.MeshBasicMaterial({ color: '#C5A46D', toneMapped: false }),
      hit: new THREE.MeshBasicMaterial({ visible: false }),
    }),
    [],
  );
  const ringMats = useMemo(
    () =>
      Object.fromEntries(
        destinations.map((d) => [
          d.id,
          new THREE.MeshBasicMaterial({ color: '#C5A46D', transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
        ]),
      ),
    [destinations],
  );
  useEffect(() => () => Object.values(ringMats).forEach((m) => m.dispose()), [ringMats]);
  useEffect(
    () => () => {
      earthMat.dispose();
      atmoMat.dispose();
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(markerMats).forEach((m) => m.dispose());
    },
    [earthMat, atmoMat, geos, markerMats],
  );

  const markers = useMemo(
    () =>
      destinations.map((d) => {
        const pos = latLonToVector3(d.lat, d.lon, GLOBE_RADIUS * 1.003);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
        return { d, pos, quat };
      }),
    [destinations],
  );
  const hubPos = useMemo(() => latLonToVector3(hub.lat, hub.lon, GLOBE_RADIUS * 1.003), [hub]);

  // Fly the camera to the selected destination along a great circle (never through the globe).
  const flyTo = (dir: THREE.Vector3, distance: number) => {
    const c = controls.current;
    const startDir = camera.position.clone().normalize();
    const startDist = camera.position.length();
    const q = new THREE.Quaternion().setFromUnitVectors(startDir, dir.clone().normalize());
    const identity = new THREE.Quaternion();
    const tmpQ = new THREE.Quaternion();
    const state = { t: 0 };
    gsap.killTweensOf(state);
    if (c) c.autoRotate = false;
    gsap.to(state, {
      t: 1,
      duration: reducedMotion ? 0 : 1.8,
      ease: 'power3.inOut',
      onUpdate: () => {
        tmpQ.slerpQuaternions(identity, q, state.t);
        const d = THREE.MathUtils.lerp(startDist, distance, state.t);
        camera.position.copy(startDir).applyQuaternion(tmpQ).multiplyScalar(d);
        c?.update();
      },
    });
  };

  useEffect(() => {
    if (!selectedId) return;
    const m = markers.find((x) => x.d.id === selectedId);
    if (!m) return;
    // look at the city slightly from the south for a more cinematic angle
    const dir = m.pos.clone().normalize();
    dir.y -= 0.12;
    flyTo(dir, 7.4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useImperativeHandle(ref, () => ({
    reset: () => flyTo(new THREE.Vector3(0.3, 0.5, 1), 7.5),
  }));

  // Pulse the selected ring
  const ringRefs = useRef<Record<string, THREE.Mesh | null>>({});
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    Object.entries(ringRefs.current).forEach(([id, mesh]) => {
      if (!mesh) return;
      const active = id === selectedId || id === hovered;
      const s = active ? 1 + ((t * 0.9) % 1) * 1.6 : 1;
      mesh.scale.setScalar(s);
      (mesh.material as THREE.MeshBasicMaterial).opacity = active ? 1 - ((t * 0.9) % 1) : 0.35;
    });
  });

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.07}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        minDistance={3.4}
        maxDistance={11}
        autoRotate={!reducedMotion && !selectedId}
        autoRotateSpeed={0.35}
        onStart={() => {
          if (controls.current) controls.current.autoRotate = false;
        }}
      />
      <group>
        <mesh geometry={geos.earth} material={earthMat} />
        <mesh geometry={geos.atmo} material={atmoMat} />
        <FlightRoutes hub={hub} destinations={destinations} radius={GLOBE_RADIUS} selectedId={selectedId} animated={!reducedMotion} />
        {/* Hub */}
        <mesh geometry={geos.dot} material={markerMats.gold} position={hubPos} scale={1.4} />
        {markers.map(({ d, pos, quat }) => (
          <group key={d.id} position={pos} quaternion={quat}>
            <mesh geometry={geos.dot} material={d.id === selectedId ? markerMats.gold : markerMats.city} />
            <mesh
              ref={(m) => {
                ringRefs.current[d.id] = m;
              }}
              geometry={geos.ring}
              material={ringMats[d.id]}
            />
            <mesh
              geometry={geos.hit}
              material={markerMats.hit}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect(d.id);
              }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                setHovered(d.id);
              }}
              onPointerOut={() => setHovered((h) => (h === d.id ? null : h))}
            />
            {d.id === selectedId || d.id === hovered ? (
              <Html position={[0, 0, 0.02]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                <span className="block -translate-y-6 whitespace-nowrap rounded-full bg-navy-950/80 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-cloud backdrop-blur">
                  {d.city}
                </span>
              </Html>
            ) : null}
          </group>
        ))}
      </group>
    </>
  );
});
