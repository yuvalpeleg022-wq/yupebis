import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { SceneCanvas } from './AircraftScene';
import { CinematicFlight } from './CinematicFlight';
import { createFlightRig, rigValuesFor } from '../animations/flightRig';
import type { Shot } from '../animations/cameraSequences';
import type { FlightRig } from '../animations/flightRig';
import { useQuality } from '../hooks/useQuality';
import { SceneLoader } from '../components/ui/SceneLoader';
import { StaticAircraft } from '../components/fallback/StaticAircraft';

export const AMBIENT_SHOTS = {
  /** Wide side-on pass, aircraft right of centre (About banner). */
  side: {
    id: 'ambient-side',
    cam: [2.2, 0.9, 14],
    target: [-1.2, 0.1, 0],
    plane: [0, 0, 0],
    planeRot: [-0.04, 0.05, 0.02],
    fov: 32,
  },
  /** High rear three-quarter, aircraft in the upper right (Booking backdrop). */
  rear: {
    id: 'ambient-rear',
    cam: [-11, 3.2, 9],
    target: [-1.2, -2.9, -4.4],
    plane: [0, 0, 0],
    planeRot: [-0.1, -0.1, 0.03],
    fov: 34,
  },
} satisfies Record<string, Shot>;

/** Slowly orbits the camera around the aircraft by rewriting the rig (no React state per frame). */
function Orbit({ rig, base, speed }: { rig: FlightRig; base: Shot; speed: number }) {
  useFrame((state) => {
    const a = Math.sin(state.clock.elapsedTime * speed) * 0.35;
    const [x, , z] = base.cam;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    rig.camX = x * cos - z * sin;
    rig.camZ = x * sin + z * cos;
  });
  return null;
}

/**
 * Self-contained ambient 3D flight (sky, clouds, aircraft) for secondary pages.
 * Pauses rendering when scrolled out of view.
 */
export default function AmbientFlightScene({ shot, label }: { shot: keyof typeof AMBIENT_SHOTS; label: string }) {
  const quality = useQuality();
  const base = AMBIENT_SHOTS[shot];
  const [rig] = useState(() => {
    const r = createFlightRig(true);
    Object.assign(r, rigValuesFor(base));
    return r;
  });
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = wrap.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <SceneCanvas
        label={label}
        camera={{ fov: base.fov, near: 0.1, far: 4000, position: base.cam }}
        frameloop={visible ? 'always' : 'never'}
        fallback={<StaticAircraft slice className="h-full w-full" />}
      >
        <CinematicFlight rig={rig} quality={quality} />
        {quality.reducedMotion ? null : <Orbit rig={rig} base={base} speed={0.08} />}
      </SceneCanvas>
      <SceneLoader label="Loading 3D" />
    </div>
  );
}
