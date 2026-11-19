import { forwardRef, Suspense, use, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { KTX2Loader } from 'three-stdlib';
import {
  createFanGeometry,
  createFuselageGeometry,
  createLiftingSurfaceGeometry,
  createNacelleGeometry,
  enginePosition,
  LAYOUT,
  wingTipLeadingEdge,
  wingTipPosition,
} from './aircraft/geometry';
import { createFuselageLivery, createTailLivery } from './aircraft/livery';
import { AIRCRAFT_MODEL } from './aircraft/aircraftConfig';

export interface AircraftModelProps {
  /** Show extended landing gear (viewer) or retracted (in flight). */
  gearDown?: boolean;
  /** Detail level, derived from the device quality tier. */
  detail?: 'high' | 'medium' | 'low';
  /** Spin the fans and blink navigation lights. */
  animated?: boolean;
  /** Override for a four-engine variant (fleet viewer). */
  engines?: 2 | 4;
}

// Fonts must be ready before the livery canvas is painted, or the wordmark falls back to Arial.
let fontsPromise: Promise<unknown> | null = null;
function fontsReady() {
  if (!fontsPromise) {
    fontsPromise =
      typeof document !== 'undefined' && 'fonts' in document
        ? Promise.race([
            Promise.all([
              document.fonts.load('700 64px "Inter Tight Variable"'),
              document.fonts.load('500 64px "Inter Variable"'),
            ]),
            new Promise((r) => setTimeout(r, 2500)),
          ])
        : Promise.resolve();
  }
  return fontsPromise;
}

/** Disposes GPU resources when the owning component unmounts. */
function useDispose(resources: { dispose: () => void }[]) {
  useEffect(() => () => resources.forEach((r) => r.dispose()), [resources]);
}

function ProceduralAircraft({ gearDown = false, detail = 'high', animated = true, engines = 2 }: AircraftModelProps) {
  use(fontsReady());
  const segments = detail === 'high' ? 72 : detail === 'medium' ? 56 : 40;
  const liveryWidth = detail === 'low' ? 2048 : detail === 'medium' ? 2048 : 4096;
  const gl = useThree((s) => s.gl);

  const geo = useMemo(() => {
    const w = LAYOUT.wing;
    const wingBase = {
      rootChord: w.rootChord,
      tipChord: w.tipChord,
      span: w.span,
      sweepDeg: w.sweepDeg,
      dihedralDeg: w.dihedralDeg,
      thicknessRoot: 0.13,
      thicknessTip: 0.09,
      camber: 0.02,
      stations: detail === 'low' ? 8 : 16,
      chordPoints: detail === 'low' ? 14 : 24,
      taperCurve: 0.85,
    };
    const tipChord = w.tipChord;
    const winglet = {
      rootChord: tipChord,
      tipChord: tipChord * 0.35,
      span: 0.42,
      sweepDeg: 48,
      dihedralDeg: 78,
      thicknessRoot: 0.09,
      thicknessTip: 0.07,
      stations: 6,
      chordPoints: 12,
    };
    const h = LAYOUT.hStab;
    const hBase = {
      rootChord: h.rootChord,
      tipChord: h.tipChord,
      span: h.span,
      sweepDeg: h.sweepDeg,
      dihedralDeg: h.dihedralDeg,
      thicknessRoot: 0.11,
      thicknessTip: 0.09,
      stations: 8,
      chordPoints: 16,
    };
    const v = LAYOUT.vStab;
    const vertical = createLiftingSurfaceGeometry({
      rootChord: v.rootChord,
      tipChord: v.tipChord,
      span: v.span,
      sweepDeg: v.sweepDeg,
      dihedralDeg: 0,
      thicknessRoot: 0.11,
      thicknessTip: 0.09,
      stations: 10,
      chordPoints: 18,
    });
    vertical.rotateX(-Math.PI / 2);
    return {
      fuselage: createFuselageGeometry(segments, detail === 'low' ? 80 : 130),
      wingR: createLiftingSurfaceGeometry(wingBase),
      wingL: createLiftingSurfaceGeometry({ ...wingBase, mirror: true }),
      wingletR: createLiftingSurfaceGeometry(winglet),
      wingletL: createLiftingSurfaceGeometry({ ...winglet, mirror: true }),
      hStabR: createLiftingSurfaceGeometry(hBase),
      hStabL: createLiftingSurfaceGeometry({ ...hBase, mirror: true }),
      vStab: vertical,
      nacelle: createNacelleGeometry(LAYOUT.nacelle.length, LAYOUT.nacelle.radius, detail === 'low' ? 24 : 44),
      fan: createFanGeometry(LAYOUT.nacelle.radius * 0.8, detail === 'low' ? 14 : 22),
      spinner: new THREE.ConeGeometry(0.055, 0.12, 24).rotateZ(-Math.PI / 2),
      fanDisc: new THREE.CircleGeometry(LAYOUT.nacelle.radius * 0.8, 32).rotateY(Math.PI / 2),
      core: new THREE.CylinderGeometry(0.1, 0.085, 0.22, 24, 1, true).rotateZ(Math.PI / 2),
      plug: new THREE.ConeGeometry(0.07, 0.2, 24).rotateZ(Math.PI / 2),
      lip: new THREE.TorusGeometry(LAYOUT.nacelle.radius * 0.88, 0.016, 10, 48).rotateY(Math.PI / 2),
      pylon: createLiftingSurfaceGeometry({
        rootChord: 0.78,
        tipChord: 0.5,
        span: 0.2,
        sweepDeg: -35,
        dihedralDeg: 90,
        thicknessRoot: 0.08,
        thicknessTip: 0.08,
        stations: 2,
        chordPoints: 10,
      }),
      fairing: new THREE.SphereGeometry(1, 32, 16),
      strut: new THREE.CylinderGeometry(0.022, 0.022, 1, 10),
      wheel: new THREE.CylinderGeometry(0.075, 0.075, 0.06, 20).rotateX(Math.PI / 2),
      light: new THREE.SphereGeometry(0.022, 10, 8),
    };
  }, [segments, detail]);

  const textures = useMemo(
    () => ({
      fuselage: createFuselageLivery(liveryWidth),
      tail: createTailLivery(detail === 'low' ? 512 : 1024),
    }),
    [liveryWidth, detail],
  );

  useEffect(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    textures.fuselage.anisotropy = aniso;
    textures.tail.anisotropy = aniso;
  }, [gl, textures]);

  const mats = useMemo(
    () => ({
      fuselage: new THREE.MeshPhysicalMaterial({
        map: textures.fuselage,
        roughness: 0.3,
        metalness: 0.12,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
      }),
      tail: new THREE.MeshPhysicalMaterial({
        map: textures.tail,
        roughness: 0.32,
        metalness: 0.15,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
      }),
      wing: new THREE.MeshPhysicalMaterial({ color: '#c9d1da', roughness: 0.36, metalness: 0.55, clearcoat: 0.3 }),
      cowl: new THREE.MeshPhysicalMaterial({
        color: '#f1f4f7',
        roughness: 0.28,
        metalness: 0.1,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
      }),
      chrome: new THREE.MeshStandardMaterial({ color: '#e3e8ed', roughness: 0.14, metalness: 1 }),
      fan: new THREE.MeshStandardMaterial({ color: '#1a222c', roughness: 0.38, metalness: 0.85 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0c131b', roughness: 0.7, metalness: 0.3 }),
      exhaust: new THREE.MeshStandardMaterial({ color: '#59636e', roughness: 0.45, metalness: 0.9, side: THREE.DoubleSide }),
      navy: new THREE.MeshPhysicalMaterial({ color: '#0b1f35', roughness: 0.34, metalness: 0.2, clearcoat: 0.8 }),
      gold: new THREE.MeshStandardMaterial({ color: '#c5a46d', roughness: 0.25, metalness: 1 }),
      gear: new THREE.MeshStandardMaterial({ color: '#b9c2cc', roughness: 0.3, metalness: 0.9 }),
      tyre: new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.9 }),
      red: new THREE.MeshBasicMaterial({ color: '#ff3344', toneMapped: false }),
      green: new THREE.MeshBasicMaterial({ color: '#33ff88', toneMapped: false }),
      strobe: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true }),
      beacon: new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false, transparent: true }),
    }),
    [textures],
  );

  const disposables = useMemo(
    () => [...Object.values(geo), ...Object.values(textures), ...Object.values(mats)],
    [geo, textures, mats],
  );
  useDispose(disposables);

  const fanRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state, delta) => {
    if (!animated) return;
    const dt = Math.min(delta, 0.1);
    fanRefs.current.forEach((f) => {
      if (f) f.rotation.x += dt * 9;
    });
    const t = state.clock.elapsedTime;
    mats.strobe.opacity = t % 1.4 < 0.07 ? 1 : 0;
    mats.beacon.opacity = (t + 0.5) % 1.1 < 0.12 ? 1 : 0.08;
  });

  const enginePositions = useMemo(() => {
    const fractions = engines === 4 ? [0.27, 0.56] : [LAYOUT.engineSpanFraction];
    return fractions.flatMap((f) => [enginePosition(1, f), enginePosition(-1, f)]);
  }, [engines]);

  const w = LAYOUT.wing;
  const tipR = wingTipPosition(1);
  const tipL = wingTipPosition(-1);
  const wingTipLE = wingTipLeadingEdge;

  return (
    <group name="aeronix-aircraft" dispose={null}>
      <mesh name="fuselage" geometry={geo.fuselage} material={mats.fuselage} />

      {/* Wings, winglets */}
      <group position={w.rootLE}>
        <mesh name="wing-starboard" geometry={geo.wingR} material={mats.wing} />
        <mesh name="wing-port" geometry={geo.wingL} material={mats.wing} />
      </group>
      <mesh geometry={geo.wingletR} material={mats.wing} position={wingTipLE(1)} />
      <mesh geometry={geo.wingletL} material={mats.wing} position={wingTipLE(-1)} />

      {/* Belly fairing (navy, continues the lower fuselage livery) */}
      <mesh geometry={geo.fairing} material={mats.navy} position={[0.05, -0.27, 0]} scale={[1.95, 0.17, 0.42]} />

      {/* Tail */}
      <group position={LAYOUT.hStab.rootLE}>
        <mesh geometry={geo.hStabR} material={mats.wing} />
        <mesh geometry={geo.hStabL} material={mats.wing} />
      </group>
      <mesh name="vertical-stabilizer" geometry={geo.vStab} material={mats.tail} position={LAYOUT.vStab.rootLE} />

      {/* Engines */}
      {enginePositions.map((p, i) => (
        <group key={i} position={p} name={`engine-${i}`}>
          <mesh geometry={geo.nacelle} material={mats.cowl} />
          <mesh geometry={geo.lip} material={mats.chrome} position={[LAYOUT.nacelle.length / 2 - 0.004, 0, 0]} />
          <mesh
            geometry={geo.lip}
            material={mats.gold}
            position={[LAYOUT.nacelle.length * 0.18, 0, 0]}
            scale={[1, 1.135, 1.135]}
          />
          <mesh geometry={geo.fanDisc} material={mats.dark} position={[LAYOUT.nacelle.length / 2 - 0.13, 0, 0]} />
          <mesh
            ref={(m) => {
              fanRefs.current[i] = m;
            }}
            geometry={geo.fan}
            material={mats.fan}
            position={[LAYOUT.nacelle.length / 2 - 0.11, 0, 0]}
          />
          <mesh geometry={geo.spinner} material={mats.chrome} position={[LAYOUT.nacelle.length / 2 - 0.06, 0, 0]} />
          <mesh geometry={geo.core} material={mats.exhaust} position={[-LAYOUT.nacelle.length / 2 - 0.08, 0, 0]} />
          <mesh geometry={geo.plug} material={mats.exhaust} position={[-LAYOUT.nacelle.length / 2 - 0.22, 0, 0]} />
          <mesh geometry={geo.pylon} material={mats.wing} position={[0.3, 0.13, 0]} />
        </group>
      ))}

      {/* Navigation & anti-collision lights */}
      <mesh geometry={geo.light} material={mats.green} position={[tipR.x + 0.1, tipR.y, tipR.z + 0.02]} />
      <mesh geometry={geo.light} material={mats.red} position={[tipL.x + 0.1, tipL.y, tipL.z - 0.02]} />
      <mesh geometry={geo.light} material={mats.strobe} position={[-4.04, 0.31, 0]} scale={1.2} />
      <mesh geometry={geo.light} material={mats.beacon} position={[0.6, 0.37, 0]} />
      <mesh geometry={geo.light} material={mats.beacon} position={[0.2, -0.43, 0]} />

      {/* Landing gear */}
      <group visible={gearDown} name="landing-gear">
        {[1, -1].map((side) => (
          <group key={side} position={[-0.32, -0.34, 0.5 * side]}>
            <mesh geometry={geo.strut} material={mats.gear} position={[0, -0.24, 0]} scale={[1.4, 0.48, 1.4]} />
            {[0.14, -0.14].map((dx) =>
              [0.06, -0.06].map((dz) => (
                <mesh key={`${dx}${dz}`} geometry={geo.wheel} material={mats.tyre} position={[dx, -0.5, dz]} />
              )),
            )}
            <mesh geometry={geo.strut} material={mats.gear} position={[0, -0.5, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 0.36, 1]} />
          </group>
        ))}
        <group position={[3.15, -0.3, 0]}>
          <mesh geometry={geo.strut} material={mats.gear} position={[0, -0.26, 0]} scale={[1, 0.52, 1]} />
          {[0.05, -0.05].map((dz) => (
            <mesh key={dz} geometry={geo.wheel} material={mats.tyre} position={[0, -0.53, dz]} scale={0.8} />
          ))}
        </group>
      </group>
    </group>
  );
}

function GLBAircraft({ url }: { url: string }) {
  const gl = useThree((s) => s.gl);
  const gltf = useGLTF(url, AIRCRAFT_MODEL.dracoPath, true, (loader) => {
    const ktx2 = new KTX2Loader().setTranscoderPath(AIRCRAFT_MODEL.ktx2Path).detectSupport(gl);
    loader.setKTX2Loader(ktx2);
  });
  return (
    <primitive
      object={gltf.scene}
      scale={AIRCRAFT_MODEL.scale}
      rotation={AIRCRAFT_MODEL.rotation}
      position={AIRCRAFT_MODEL.position}
    />
  );
}

/**
 * The AERONIX aircraft. Uses the GLB defined in aircraftConfig when available,
 * otherwise the procedural model. Wrap in <Suspense>.
 */
export const AircraftModel = forwardRef<THREE.Group, AircraftModelProps>(function AircraftModel(props, ref) {
  return (
    <group ref={ref}>
      <Suspense fallback={null}>
        {AIRCRAFT_MODEL.url ? <GLBAircraft url={AIRCRAFT_MODEL.url} /> : <ProceduralAircraft {...props} />}
      </Suspense>
    </group>
  );
});
