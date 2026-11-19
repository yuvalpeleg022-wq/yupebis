import { SceneCanvas } from './AircraftScene';
import { CinematicFlight } from './CinematicFlight';
import { HERO_SHOT } from '../animations/cameraSequences';
import type { FlightRig } from '../animations/flightRig';
import type { QualitySettings } from '../types';
import { SceneLoader } from '../components/ui/SceneLoader';
import { WebGLFallbackHero } from '../components/fallback/WebGLFallbackHero';

interface Props {
  rig: FlightRig;
  quality: QualitySettings;
  paused: boolean;
  onReady: () => void;
}

/** Lazily-loaded home 3D stage: keeps three.js out of the initial bundle. */
export default function HomeStage({ rig, quality, paused, onReady }: Props) {
  return (
    <>
      <SceneCanvas
        label="Cinematic 3D scene of an AERONIX AIRWAYS wide-body aircraft flying above the clouds"
        camera={{ fov: HERO_SHOT.fov, near: 0.1, far: 4000, position: HERO_SHOT.cam }}
        frameloop={paused ? 'never' : 'always'}
        fallback={<WebGLFallbackHero />}
      >
        <CinematicFlight rig={rig} quality={quality} onReady={onReady} />
      </SceneCanvas>
      <SceneLoader label="Preparing flight" />
    </>
  );
}
