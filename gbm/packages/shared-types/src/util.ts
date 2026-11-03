import type { World } from './types';

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function round(v: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** Allocates a new unique id for a prefix and advances the world's counter. */
export function nextId(world: Pick<World, 'meta'>, prefix: string): string {
  const n = (world.meta.idCounters[prefix] ?? 0) + 1;
  world.meta.idCounters[prefix] = n;
  return `${prefix}_${n.toString(36).padStart(5, '0')}`;
}

// ---- Dates (ISO yyyy-mm-dd, UTC, no time zone surprises) ----

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

export function ageOn(birthDate: string, onDate: string): number {
  const b = parseDate(birthDate);
  const d = parseDate(onDate);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  const m = d.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && d.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function dayOfMonth(iso: string): number {
  return parseDate(iso).getUTCDate();
}

export function dayOfWeek(iso: string): number {
  return parseDate(iso).getUTCDay();
}

/** Label for a season, e.g. 2026 -> "2026-27". */
export function seasonLabel(season: number): string {
  return `${season}-${String((season + 1) % 100).padStart(2, '0')}`;
}

export function formatMoney(amount: number, currency = '$'): string {
  const sign = amount < 0 ? '-' : '';
  const a = Math.abs(amount);
  if (a >= 1_000_000) return `${sign}${currency}${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}M`;
  if (a >= 1_000) return `${sign}${currency}${(a / 1_000).toFixed(0)}K`;
  return `${sign}${currency}${a.toFixed(0)}`;
}

export function sum(values: number[]): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const it of items) {
    const k = key(it);
    (out[k] ??= []).push(it);
  }
  return out;
}

// ---- Derived indexes (not persisted) ----
// Frequently used lookups (players by club, staff by club) are cached per
// world. Any code that changes a player's or coach's club must call
// invalidateIndexes(world); the calendar also rebuilds them every game day.

const indexCache = new WeakMap<object, Map<string, unknown>>();

export function cachedIndex<T>(world: object, key: string, build: () => T): T {
  let m = indexCache.get(world);
  if (!m) {
    m = new Map();
    indexCache.set(world, m);
  }
  if (!m.has(key)) m.set(key, build());
  return m.get(key) as T;
}

export function invalidateIndexes(world: object) {
  indexCache.delete(world);
}

/** Neutral age used by game formulas when a real player's birth date is unknown (never displayed). */
export const UNKNOWN_AGE_FOR_LOGIC = 27;

export function playerAge(p: { birthDate: string | null }, onDate: string): number | null {
  return p.birthDate ? ageOn(p.birthDate, onDate) : null;
}

/** Age for game logic (development, valuation, retirement); unknown ages use a neutral value. */
export function logicAge(p: { birthDate: string | null }, onDate: string): number {
  return p.birthDate ? ageOn(p.birthDate, onDate) : UNKNOWN_AGE_FOR_LOGIC;
}
