import { HERO_SHOT, INTRO_OFFSET, type Shot } from './cameraSequences';

/**
 * Mutable animation state shared by GSAP (writer) and the R3F render loop (reader).
 * Deliberately NOT React state: updating it never triggers React renders.
 */
export interface FlightRig {
  camX: number;
  camY: number;
  camZ: number;
  tgtX: number;
  tgtY: number;
  tgtZ: number;
  planeX: number;
  planeY: number;
  planeZ: number;
  roll: number;
  yaw: number;
  pitch: number;
  fov: number;
  intro: { planeX: number; planeY: number; camDolly: number; exposure: number };
  /** When true the render loop snaps instead of damping (reduced-motion cuts). */
  snap: boolean;
  /** Pointer parallax in [-1, 1]. */
  pointerX: number;
  pointerY: number;
}

export function rigValuesFor(shot: Shot) {
  return {
    camX: shot.cam[0],
    camY: shot.cam[1],
    camZ: shot.cam[2],
    tgtX: shot.target[0],
    tgtY: shot.target[1],
    tgtZ: shot.target[2],
    planeX: shot.plane[0],
    planeY: shot.plane[1],
    planeZ: shot.plane[2],
    roll: shot.planeRot[0],
    yaw: shot.planeRot[1],
    pitch: shot.planeRot[2],
    fov: shot.fov,
  };
}

export function createFlightRig(skipIntro: boolean): FlightRig {
  return {
    ...rigValuesFor(HERO_SHOT),
    intro: skipIntro ? { planeX: 0, planeY: 0, camDolly: 0, exposure: 1 } : { ...INTRO_OFFSET },
    snap: false,
    pointerX: 0,
    pointerY: 0,
  };
}
