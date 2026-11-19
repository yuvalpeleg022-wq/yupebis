import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { SceneCanvas } from './AircraftScene';
import { mergeGeometries } from './aircraft/geometry';
import { useQuality } from '../hooks/useQuality';
import { SceneLoader } from '../components/ui/SceneLoader';

/**
 * Procedural wide-body cabin interior (fictional AERONIX cabin concept).
 * Layout along -Z: First suites (z 0…-6), Business pods (-7…-14), Economy rows (-15…-34).
 * Units ≈ metres. One canvas, instanced seating, no shadows.
 */

export type CabinZone = 'first' | 'business' | 'economy' | 'design';

const SHOTS: Record<CabinZone, { cam: THREE.Vector3Tuple; target: THREE.Vector3Tuple; fov: number }> = {
  first: { cam: [0.45, 1.75, 1.6], target: [-1.6, 0.4, -2.6], fov: 54 },
  business: { cam: [0.1, 1.7, -5.6], target: [1.4, 0.7, -10.2], fov: 50 },
  economy: { cam: [0, 1.62, -13.2], target: [0, 1.0, -30], fov: 50 },
  design: { cam: [-0.45, 1.5, -3.05], target: [-1.9, 0.45, -1.4], fov: 42 },
};

const HALF_W = 2.75;
const LENGTH = 38;

function roundedBox(w: number, h: number, d: number, r: number, seg = 3) {
  // RoundedBoxGeometry-style: box with bevelled edges via an extruded rounded rectangle.
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, d - 2 * r * 0.5),
    bevelEnabled: true,
    bevelThickness: r * 0.5,
    bevelSize: r * 0.5,
    bevelSegments: seg,
    curveSegments: seg,
  });
  g.center();
  return g;
}

/** Sky seen through the windows: dusk gradient painted once. */
function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#2d5c8c');
    g.addColorStop(0.55, '#a9c4dc');
    g.addColorStop(0.62, '#f1d2a8');
    g.addColorStop(1, '#e8eef5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Cabin({ detail }: { detail: 'high' | 'medium' | 'low' }) {
  const res = useMemo(() => {
    const winTex = windowTexture();
    const mats = {
      wall: new THREE.MeshStandardMaterial({ color: '#b9c3ce', roughness: 0.8, side: THREE.BackSide }),
      floor: new THREE.MeshStandardMaterial({ color: '#0b1f35', roughness: 0.95 }),
      aisle: new THREE.MeshStandardMaterial({ color: '#183a5a', roughness: 0.9 }),
      navy: new THREE.MeshStandardMaterial({ color: '#13283f', roughness: 0.65 }),
      leather: new THREE.MeshStandardMaterial({ color: '#0e2236', roughness: 0.45, metalness: 0.05 }),
      linen: new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.9 }),
      shell: new THREE.MeshStandardMaterial({ color: '#aab5c1', roughness: 0.4, metalness: 0.2 }),
      silver: new THREE.MeshStandardMaterial({ color: '#b9c4cf', roughness: 0.22, metalness: 0.9 }),
      gold: new THREE.MeshStandardMaterial({ color: '#c5a46d', roughness: 0.25, metalness: 1 }),
      headrest: new THREE.MeshStandardMaterial({ color: '#c9d2dc', roughness: 0.85 }),
      screen: new THREE.MeshStandardMaterial({ color: '#0a1520', emissive: '#244a72', emissiveIntensity: 0.6, roughness: 0.3 }),
      window: new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false }),
      lightStrip: new THREE.MeshBasicMaterial({ color: '#fff1d9', toneMapped: false }),
      blueStrip: new THREE.MeshBasicMaterial({ color: '#9fc4ea', toneMapped: false }),
      bin: new THREE.MeshStandardMaterial({ color: '#eef1f5', roughness: 0.6 }),
    };

    // Fuselage interior shell: open cylinder segment covering walls + ceiling
    const shell = new THREE.CylinderGeometry(3.05, 3.05, LENGTH, detail === 'low' ? 24 : 48, 1, true, -Math.PI * 0.62, Math.PI * 1.24);
    shell.rotateX(Math.PI / 2).rotateZ(Math.PI); // axis along Z, opening facing down
    shell.translate(0, 0.62, -LENGTH / 2 + 3);

    const floor = new THREE.PlaneGeometry(HALF_W * 2, LENGTH).rotateX(-Math.PI / 2).translate(0, 0, -LENGTH / 2 + 3);
    const aisle = new THREE.PlaneGeometry(0.9, LENGTH).rotateX(-Math.PI / 2).translate(0, 0.002, -LENGTH / 2 + 3);
    const strip = new THREE.BoxGeometry(0.06, 0.02, LENGTH - 2).translate(0, 0, -LENGTH / 2 + 3);
    const aisleLight = new THREE.BoxGeometry(0.02, 0.01, LENGTH - 4).translate(0, 0.006, -LENGTH / 2 + 3);
    const winGeo = roundedBox(0.28, 0.42, 0.02, 0.1);
    const binGeo = new THREE.BoxGeometry(0.75, 0.42, 19).translate(0, 0, -24.5); // economy only

    // --- First suite (one unit, used ×4)
    const suiteWall = roundedBox(0.05, 1.35, 2.1, 0.02);
    const suiteBack = roundedBox(1.15, 1.35, 0.05, 0.02);
    const bed = roundedBox(0.72, 0.42, 1.95, 0.08);
    const pillow = roundedBox(0.55, 0.16, 0.3, 0.07);
    const duvet = roundedBox(0.7, 0.06, 1.1, 0.03);
    const goldRail = new THREE.BoxGeometry(0.02, 0.02, 2.1);

    // --- Business pod
    const podShell = roundedBox(0.06, 1.1, 1.7, 0.025);
    const podBack = roundedBox(0.9, 1.1, 0.06, 0.025);
    const podSeat = roundedBox(0.6, 0.5, 1.35, 0.1);
    const podScreen = roundedBox(0.5, 0.32, 0.03, 0.02);

    // --- Economy seat (merged) + headrest, instanced
    const pan = roundedBox(0.46, 0.12, 0.48, 0.05).translate(0, 0.45, 0);
    const back = roundedBox(0.46, 0.72, 0.1, 0.05).translate(0, 0.86, 0.22);
    const legL = new THREE.BoxGeometry(0.04, 0.4, 0.04).translate(-0.18, 0.2, 0);
    const legR = new THREE.BoxGeometry(0.04, 0.4, 0.04).translate(0.18, 0.2, 0);
    const ecoSeat = mergeGeometries([pan, back, legL, legR]);
    [pan, back, legL, legR].forEach((g) => g.dispose());
    const ecoHead = roundedBox(0.4, 0.2, 0.04, 0.03).translate(0, 1.12, 0.28);
    const ecoScreen = new THREE.PlaneGeometry(0.24, 0.15).translate(0, 0.95, 0.165).rotateY(Math.PI);

    return {
      winTex,
      mats,
      geos: { shell, floor, aisle, strip, aisleLight, winGeo, binGeo, suiteWall, suiteBack, bed, pillow, duvet, goldRail, podShell, podBack, podSeat, podScreen, ecoSeat, ecoHead, ecoScreen },
    };
  }, [detail]);

  useEffect(
    () => () => {
      res.winTex.dispose();
      Object.values(res.mats).forEach((m) => m.dispose());
      Object.values(res.geos).forEach((g) => g.dispose());
    },
    [res],
  );

  // Instanced economy cabin & windows
  const ecoRows = detail === 'low' ? 14 : 20;
  const ecoSeats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const xs = [-2.15, -1.67, -1.19, 1.19, 1.67, 2.15];
    for (let r = 0; r < ecoRows; r++) {
      const z = -15.5 - r * 0.86;
      xs.forEach((x) => out.push(new THREE.Matrix4().makeTranslation(x, 0, z)));
    }
    return out;
  }, [ecoRows]);
  const windows = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (let z = 0.5; z > -LENGTH + 4; z -= 1.05) {
      for (const side of [-1, 1]) {
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(side * 2.93, 1.28, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (side * Math.PI) / 2, side * 0.18)),
          new THREE.Vector3(1, 1, 1),
        );
        out.push(m);
      }
    }
    return out;
  }, []);

  const ecoSeatRef = useRef<THREE.InstancedMesh>(null);
  const ecoHeadRef = useRef<THREE.InstancedMesh>(null);
  const ecoScreenRef = useRef<THREE.InstancedMesh>(null);
  const winRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    [ecoSeatRef, ecoHeadRef, ecoScreenRef].forEach((ref) => {
      const im = ref.current;
      if (!im) return;
      ecoSeats.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    });
    const w = winRef.current;
    if (w) {
      windows.forEach((m, i) => w.setMatrixAt(i, m));
      w.instanceMatrix.needsUpdate = true;
      w.computeBoundingSphere();
    }
  }, [ecoSeats, windows]);

  const { mats, geos } = res;
  const suites: [number, number, number][] = [
    [-1.75, -1.6, 1],
    [1.75, -1.6, -1],
    [-1.75, -4.2, 1],
    [1.75, -4.2, -1],
  ];
  const pods: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    pods.push([-1.75, -7.6 - i * 1.7]);
    pods.push([1.75, -7.6 - i * 1.7]);
  }

  return (
    <group>
      <mesh geometry={geos.shell} material={mats.wall} />
      <mesh geometry={geos.floor} material={mats.floor} />
      <mesh geometry={geos.aisle} material={mats.aisle} />
      <mesh geometry={geos.aisleLight} material={mats.blueStrip} position={[0.47, 0, 0]} />
      <mesh geometry={geos.aisleLight} material={mats.blueStrip} position={[-0.47, 0, 0]} />
      {/* ceiling light coves & overhead bins */}
      <mesh geometry={geos.strip} material={mats.lightStrip} position={[0.9, 2.62, 0]} />
      <mesh geometry={geos.strip} material={mats.lightStrip} position={[-0.9, 2.62, 0]} />
      <mesh geometry={geos.binGeo} material={mats.bin} position={[-2.05, 2.15, 0]} rotation={[0, 0, -0.35]} />
      <mesh geometry={geos.binGeo} material={mats.bin} position={[2.05, 2.15, 0]} rotation={[0, 0, 0.35]} />
      <instancedMesh ref={winRef} args={[geos.winGeo, mats.window, windows.length]} />

      {/* First suites */}
      {suites.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh geometry={geos.suiteWall} material={mats.shell} position={[-0.58 * s, 0.68, 0]} />
          <mesh geometry={geos.goldRail} material={mats.gold} position={[-0.58 * s, 1.36, 0]} />
          {/* low aisle-side panel (door open) */}
          <mesh geometry={geos.suiteWall} material={mats.navy} position={[0.58 * s, 0.32, 0.55]} scale={[1, 0.48, 0.45]} />
          <mesh geometry={geos.goldRail} material={mats.gold} position={[0.58 * s, 0.65, 0.55]} scale={[1, 1, 0.45]} />
          <mesh geometry={geos.suiteBack} material={mats.shell} position={[0, 0.68, 1.05]} />
          <mesh geometry={geos.bed} material={mats.leather} position={[-0.1 * s, 0.25, 0]} />
          <mesh geometry={geos.duvet} material={mats.linen} position={[-0.1 * s, 0.49, -0.35]} />
          <mesh geometry={geos.pillow} material={mats.linen} position={[-0.1 * s, 0.53, 0.72]} />
          <mesh geometry={geos.goldRail} material={mats.gold} position={[-0.1 * s, 0.47, 0]} scale={[1.5, 1, 0.9]} />
        </group>
      ))}

      {/* Business pods, herringbone */}
      {pods.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, x < 0 ? 0.5 : -0.5, 0]}>
          <mesh geometry={geos.podShell} material={mats.shell} position={[0.44, 0.55, 0]} />
          <mesh geometry={geos.podBack} material={mats.shell} position={[0, 0.55, 0.85]} />
          <mesh geometry={geos.podSeat} material={mats.navy} position={[0, 0.45, 0.05]} />
          <mesh geometry={geos.podScreen} material={mats.screen} position={[0, 1.0, -0.84]} />
          <mesh geometry={geos.goldRail} material={mats.gold} position={[0.46, 1.16, 0]} scale={[1, 1, 0.8]} />
        </group>
      ))}

      {/* Economy (instanced) */}
      <instancedMesh ref={ecoSeatRef} args={[geos.ecoSeat, mats.navy, ecoSeats.length]} />
      <instancedMesh ref={ecoHeadRef} args={[geos.ecoHead, mats.headrest, ecoSeats.length]} />
      <instancedMesh ref={ecoScreenRef} args={[geos.ecoScreen, mats.screen, ecoSeats.length]} />

      {/* bulkhead with AERONIX gold line between cabins */}
      <mesh position={[-1.75, 1.0, -6.3]} material={mats.shell}>
        <boxGeometry args={[1.4, 2, 0.06]} />
      </mesh>
      <mesh position={[1.75, 1.0, -6.3]} material={mats.shell}>
        <boxGeometry args={[1.4, 2, 0.06]} />
      </mesh>
      <mesh position={[0, 1.95, -6.28]} material={mats.gold}>
        <boxGeometry args={[4.6, 0.02, 0.02]} />
      </mesh>
    </group>
  );
}

function CameraDirector({ zone, reduced }: { zone: CabinZone; reduced: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const look = useRef(new THREE.Vector3(...SHOTS.first.target));
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const first = useRef(true);
  useFrame((_, delta) => {
    const shot = SHOTS[zone];
    const k = reduced || first.current ? 1 : 1 - Math.exp(-2.4 * Math.min(delta, 0.1));
    camera.position.lerp(tmp.set(...shot.cam), k);
    look.current.lerp(tmp.set(...shot.target), k);
    camera.lookAt(look.current);
    const fov = THREE.MathUtils.lerp(camera.fov, shot.fov, k);
    if (Math.abs(fov - camera.fov) > 1e-3) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    first.current = false;
  });
  return null;
}

/** Cabin experience canvas. `zone` is driven by the page (scroll position or tabs). */
export default function CabinScene({ zone }: { zone: CabinZone }) {
  const quality = useQuality();
  return (
    <div className="absolute inset-0">
      <SceneCanvas
        label="3D cabin concept showing First suites, Business pods and the Economy cabin"
        camera={{ fov: SHOTS.first.fov, near: 0.05, far: 80, position: SHOTS.first.cam }}
        fallback={null}
      >
        <color attach="background" args={['#0b1f35']} />
        <fog attach="fog" args={['#2a3f57', 12, 34]} />
        <hemisphereLight args={['#ffeacc', '#0b1f35', 0.45]} />
        <ambientLight intensity={0.12} />
        {[1, -4, -10, -18, -26].map((z) => (
          <pointLight key={z} position={[0, 2.4, z]} intensity={4.5} distance={8} decay={1.7} color="#ffdcb0" />
        ))}
        <Environment resolution={64} frames={1} environmentIntensity={0.6}>
          <Lightformer form="rect" intensity={2} color="#fff1d9" scale={[2, 30, 1]} position={[0, 4, -10]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={1} color="#9fc4ea" scale={[30, 1, 1]} position={[4, 1, -10]} rotation-y={-Math.PI / 2} />
        </Environment>
        <Suspense fallback={null}>
          <Cabin detail={quality.tier} />
        </Suspense>
        <CameraDirector zone={zone} reduced={quality.reducedMotion} />
      </SceneCanvas>
      <SceneLoader label="Loading cabin" />
    </div>
  );
}
