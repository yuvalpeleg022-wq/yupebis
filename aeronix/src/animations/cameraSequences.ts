/**
 * Camera & aircraft keyframes for the cinematic scroll sequence.
 * All values are in model space (see three/aircraft/geometry.ts: +X nose, +Y up, +Z starboard).
 * The scroll timeline tweens a single mutable rig between these shots; the render loop then
 * damps toward the rig, guaranteeing continuity (no teleporting, no jerky cuts).
 */
export interface Shot {
  id: string;
  cam: [number, number, number];
  target: [number, number, number];
  plane: [number, number, number];
  /** roll (x), yaw (y), pitch (z) in radians */
  planeRot: [number, number, number];
  fov: number;
}

export const HERO_SHOT: Shot = {
  id: 'hero',
  cam: [12.4, 2.3, 10.8],
  target: [-1.2, -1.9, 3.4],
  plane: [0, 0, 0],
  planeRot: [-0.05, 0.12, 0.03],
  fov: 36,
};

export const SEQUENCE_SHOTS: Shot[] = [
  HERO_SHOT,
  {
    id: 'takeoff', // A — above the clouds, camera closes on the nose
    cam: [7.2, 0.55, 3.4],
    target: [2.6, 0.05, 0.1],
    plane: [0, 0.3, 0],
    planeRot: [-0.03, 0.05, 0.06],
    fov: 34,
  },
  {
    id: 'fuselage', // B — side of the fuselage, windows and wordmark
    cam: [1.5, 0.95, 2.75],
    target: [0.9, 0.3, 0],
    plane: [0, 0.3, 0],
    planeRot: [0, 0, 0.01],
    fov: 38,
  },
  {
    id: 'wing', // C — over the wing, engine and winglet
    cam: [-1.9, 1.25, 0.95],
    target: [-0.7, -0.15, 2.7],
    plane: [0, 0.3, 0],
    planeRot: [0.04, 0, 0],
    fov: 48,
  },
  {
    id: 'clouds', // D — pull back, the aircraft banks through a vast sky
    cam: [-7.5, 3.6, 13],
    target: [0.5, -0.2, 0],
    plane: [1.5, 0.4, -1],
    planeRot: [-0.22, -0.18, 0.04],
    fov: 40,
  },
  {
    id: 'reveal', // E — dramatic low rear three-quarter toward the sun
    cam: [-11.5, -0.6, 7.5],
    target: [1.5, 0.9, -1.5],
    plane: [2.5, 0.8, -2],
    planeRot: [-0.08, 0.5, 0.07],
    fov: 34,
  },
];

/** Initial off-screen state for the intro: the aircraft is far behind, the camera pulled out. */
export const INTRO_OFFSET = {
  planeX: -26,
  planeY: -1.6,
  camDolly: 1, // 1 = pulled back, 0 = at hero framing
  exposure: 0,
};
