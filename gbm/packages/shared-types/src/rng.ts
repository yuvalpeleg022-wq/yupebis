/**
 * Deterministic pseudo-random number generation.
 * Every random decision in the game goes through an Rng so that a saved seed
 * reproduces exactly the same simulation (required for testing and replays).
 */

/** 32-bit string hash (FNV-1a). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function combineSeeds(...parts: (number | string)[]): number {
  return hashString(parts.join('|'));
}

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  /** mulberry32 — fast, good-quality 32-bit generator. Returns [0,1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  getState(): number {
    return this.state;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Approximately normal via Box–Muller. */
  normal(mean = 0, sd = 1): number {
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick on empty array');
    return items[Math.floor(this.next() * items.length)];
  }

  /** Weighted choice; weights must be >= 0 and not all zero. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0;
    for (const w of weights) total += Math.max(0, w);
    if (total <= 0) return this.pick(items);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, weights[i]);
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}
