import { clamp, range, smooth } from './math';

/** Hero: each stone ignites individually between 22% and 58% of the scroll track. */
export function heroStoneIntensity(i: number, p: number) {
  const start = 0.22 + i * 0.06;
  return clamp(0.08 + smooth(range(p, start, start + 0.08)) * 0.92);
}

/**
 * Finale, driven by its scroll progress:
 *   0.00–0.20 camera returns · 0.20–0.62 stones ignite · 0.55–0.78 energy builds
 *   0.78–0.86 white-out · 0.86–1.00 afterglow behind the title
 */
export function finaleStone(i: number, p: number) {
  const s = 0.2 + i * 0.07;
  return clamp(smooth(range(p, s, s + 0.06)));
}
export function finaleFlash(p: number) {
  return smooth(range(p, 0.74, 0.8)) * smooth(1 - range(p, 0.8, 0.9));
}
