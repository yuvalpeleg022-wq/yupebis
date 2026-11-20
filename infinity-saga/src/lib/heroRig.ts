import * as THREE from 'three';
import type { StoneId } from '../data/films';

/**
 * Measurements of the loaded hero model, published by HeroModel and read by
 * the camera rig and the stone mounts. Everything is in world space.
 */
export interface HeroRig {
  ready: boolean;
  box: THREE.Box3;
  height: number;
  center: THREE.Vector3;
  /** Point the gauntlet close-ups frame (focus node, or best guess). */
  gauntlet: THREE.Vector3;
  /** Chest / head height used for upper-body framing. */
  chest: THREE.Vector3;
  /** Live world positions of stone sockets (updated each frame if animated). */
  sockets: Partial<Record<StoneId, THREE.Object3D>>;
  /** Fallback anchor when the GLB has no socket empties. */
  hand: THREE.Object3D | null;
}

export const heroRig: HeroRig = {
  ready: false,
  box: new THREE.Box3(),
  height: 2,
  center: new THREE.Vector3(),
  gauntlet: new THREE.Vector3(),
  chest: new THREE.Vector3(),
  sockets: {},
  hand: null,
};

export function resetHeroRig() {
  heroRig.ready = false;
  heroRig.sockets = {};
  heroRig.hand = null;
}
