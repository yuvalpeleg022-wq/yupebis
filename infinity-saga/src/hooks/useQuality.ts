import { createContext, useContext } from 'react';

export type Tier = 'high' | 'medium' | 'low';

export interface Quality {
  tier: Tier;
  webgl: boolean;
  reducedMotion: boolean;
  isTouch: boolean;
  /** Device pixel ratio range for <Canvas dpr>. */
  dpr: [number, number];
  particles: number;
  postFx: boolean;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function detectQuality(): Quality {
  const webgl = hasWebGL();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  let tier: Tier = 'high';
  if (w < 768 || cores <= 4 || mem <= 4) tier = 'medium';
  if ((isTouch && w < 768) || cores <= 2 || mem <= 2) tier = 'low';

  const override = new URLSearchParams(location.search).get('quality');
  if (override === 'high' || override === 'medium' || override === 'low') tier = override;

  return {
    tier,
    webgl,
    reducedMotion,
    isTouch,
    dpr: tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1.25],
    particles: tier === 'high' ? 4200 : tier === 'medium' ? 1800 : 700,
    postFx: tier !== 'low',
  };
}

export const QualityContext = createContext<Quality | null>(null);

export function useQuality(): Quality {
  const q = useContext(QualityContext);
  if (!q) throw new Error('useQuality outside provider');
  return q;
}
