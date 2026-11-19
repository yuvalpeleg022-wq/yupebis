import type { DeviceTier, QualitySettings } from '../types';

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/** Heuristic device tier. Refined at runtime by drei's PerformanceMonitor (DPR only). */
export function detectTier(): DeviceTier {
  if (typeof window === 'undefined') return 'medium';
  const params = new URLSearchParams(window.location.search);
  const forced = params.get('quality');
  if (forced === 'high' || forced === 'medium' || forced === 'low') return forced;
  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const minSide = Math.min(window.innerWidth, window.innerHeight);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (cores <= 4 || memory <= 2 || (coarse && minSide < 500)) return 'low';
  if (coarse || cores <= 6 || memory <= 4) return 'medium';
  return 'high';
}

/** Optional `?dpr=1` override (e.g. for video capture or testing). */
function dprOverride(): number | null {
  if (typeof window === 'undefined') return null;
  const v = Number(new URLSearchParams(window.location.search).get('dpr'));
  return v > 0 && v <= 3 ? v : null;
}

export function qualityFor(tier: DeviceTier, reducedMotion: boolean): QualitySettings {
  const q = baseQuality(tier, reducedMotion);
  const forced = dprOverride();
  return forced ? { ...q, dpr: [forced, forced] } : q;
}

function baseQuality(tier: DeviceTier, reducedMotion: boolean): QualitySettings {
  switch (tier) {
    case 'high':
      return {
        tier,
        dpr: [1, 1.75],
        fuselageSegments: 72,
        liveryWidth: 4096,
        cloudCount: 14,
        cloudSegments: 22,
        shadows: false,
        lightRays: true,
        reducedMotion,
      };
    case 'medium':
      return {
        tier,
        dpr: [1, 1.5],
        fuselageSegments: 56,
        liveryWidth: 2048,
        cloudCount: 10,
        cloudSegments: 14,
        shadows: false,
        lightRays: true,
        reducedMotion,
      };
    default:
      return {
        tier,
        dpr: [0.8, 1.25],
        fuselageSegments: 40,
        liveryWidth: 2048,
        cloudCount: 6,
        cloudSegments: 8,
        shadows: false,
        lightRays: false,
        reducedMotion,
      };
  }
}
