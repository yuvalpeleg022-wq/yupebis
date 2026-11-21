import { Suspense, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BikeModel, preloadBike } from './BikeModel';
import { StudioStage } from './StudioStage';
import { motorcycles, type Motorcycle, type PaintOption } from '../data/motorcycles';

export interface ViewerApi {
  zoom: (factor: number) => void;
  reset: () => void;
}

interface Props {
  bike: Motorcycle;
  paint: PaintOption;
  /** Touch devices: controls only react after the visitor activates the viewer */
  interactive: boolean;
  /** Allow pinch / wheel zoom handled by OrbitControls (touch, once active) */
  nativeZoom: boolean;
  autoRotate: boolean;
  lowPower: boolean;
  /** Pause rendering while the viewer is off-screen */
  active: boolean;
  apiRef: MutableRefObject<ViewerApi | null>;
  onReady: () => void;
  onUserInteract: () => void;
}

const TARGET = new THREE.Vector3(0, 0.55, 0);
const MIN_DIST = 2.6;
const MAX_DIST = 8;

function defaultCameraPos(aspect: number) {
  const dist = aspect < 0.8 ? 7.2 : aspect < 1.2 ? 5.8 : 4.5;
  const a = 0.78;
  return new THREE.Vector3(Math.sin(a) * dist, 1.25, Math.cos(a) * dist);
}

function Controller({
  apiRef,
  interactive,
  nativeZoom,
  autoRotate,
  onUserInteract,
}: Pick<Props, 'apiRef' | 'interactive' | 'nativeZoom' | 'autoRotate' | 'onUserInteract'>) {
  const { camera, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const anim = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  // Initial framing
  useEffect(() => {
    camera.position.copy(defaultCameraPos(size.width / size.height));
    controls.current?.target.copy(TARGET);
    controls.current?.update();
  }, []);

  useEffect(() => {
    apiRef.current = {
      zoom(factor) {
        const c = controls.current;
        if (!c) return;
        const from = anim.current?.pos ?? camera.position;
        const dir = from.clone().sub(c.target);
        const dist = THREE.MathUtils.clamp(dir.length() * factor, MIN_DIST, MAX_DIST);
        anim.current = { pos: c.target.clone().add(dir.setLength(dist)), target: c.target.clone() };
      },
      reset() {
        anim.current = { pos: defaultCameraPos(size.width / size.height), target: TARGET.clone() };
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, camera, size]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c || !anim.current) return;
    const k = 1 - Math.exp(-delta * 7);
    camera.position.lerp(anim.current.pos, k);
    c.target.lerp(anim.current.target, k);
    c.update();
    if (camera.position.distanceTo(anim.current.pos) < 0.005) anim.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={interactive}
      enablePan={false}
      enableZoom={nativeZoom}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      zoomSpeed={0.6}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      minPolarAngle={0.55}
      maxPolarAngle={1.5}
      autoRotate={autoRotate}
      autoRotateSpeed={0.6}
      target={TARGET}
      onStart={() => {
        anim.current = null;
        onUserInteract();
      }}
    />
  );
}

function LoadingOverlay({ bikeName }: { bikeName: string }) {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="viewer__loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>
        Loading {bikeName} <span>{Math.round(progress)}%</span>
      </p>
    </div>
  );
}

export default function ViewerCanvas(props: Props) {
  const { bike, paint, lowPower, onReady, active } = props;

  // Once the first model is in, warm the cache for the others
  const readyOnce = useRef(false);
  const [readyTick, setReadyTick] = useState(0);
  const handleReady = () => {
    onReady();
    setReadyTick((t) => t + 1);
    if (!readyOnce.current) {
      readyOnce.current = true;
      setTimeout(() => {
        motorcycles.forEach((m) => m.model3d && m.id !== bike.id && preloadBike(m.model3d.url));
      }, 1500);
    }
  };

  if (!bike.model3d) throw new Error(`No 3D model configured for ${bike.name}`);

  return (
    <>
      <Canvas
        shadows={!lowPower}
        dpr={lowPower ? [1, 1.5] : [1, 2]}
        frameloop={active ? 'always' : 'never'}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        camera={{ fov: 30, near: 0.1, far: 50, position: [4, 1.2, 4] }}
        className="viewer__canvas"
      >
        <color attach="background" args={['#0b0b0d']} />
        <fog attach="fog" args={['#0b0b0d', 8, 18]} />
        <Controller {...props} />
        {/* Stage stays mounted while a newly selected bike streams in */}
        <StudioStage lowPower={lowPower} shadowKey={`${bike.id}-${readyTick}`} />
        <Suspense fallback={null}>
          <BikeModel key={bike.id} model={bike.model3d} paint={paint} onReady={handleReady} />
        </Suspense>
      </Canvas>
      <LoadingOverlay bikeName={bike.name} />
    </>
  );
}
