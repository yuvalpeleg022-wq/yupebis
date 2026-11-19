import * as THREE from 'three';

/** Single source of truth for sun direction & atmospheric palette across sky, clouds and lights. */
export const SUN_DIRECTION = new THREE.Vector3(-0.55, 0.32, -0.62).normalize();

export const PALETTE = {
  zenith: '#030b17',
  mid: '#0d2541',
  horizon: '#4a6f92',
  sun: '#ffd9ad',
  fog: '#16314f',
  cloudLight: '#e8eff6',
  cloudShadow: '#132a45',
  /** Must match the sky horizon so the cloud sea melts into the sky. */
  deckFog: '#4a6f92',
} as const;
