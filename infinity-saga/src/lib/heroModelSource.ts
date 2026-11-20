import { useSyncExternalStore } from 'react';
import { HERO_MODEL } from '../config/assets';

/**
 * Resolves which hero GLB to show, in priority order:
 *   1. A .glb dragged onto the page (local object URL — never uploaded anywhere)
 *   2. ?model=<url> query parameter (for reviewing candidate assets)
 *   3. HERO_MODEL.url in src/config/assets.ts (the shipped, licensed asset)
 */
type Source = { url: string; origin: 'dropped' | 'query' | 'config'; name: string } | null;

function initial(): Source {
  const q = new URLSearchParams(location.search).get('model');
  if (q) return { url: q, origin: 'query', name: q.split('/').pop() ?? q };
  if (HERO_MODEL.url) return { url: HERO_MODEL.url, origin: 'config', name: HERO_MODEL.url.split('/').pop() ?? '' };
  return null;
}

let current: Source = typeof window === 'undefined' ? null : initial();
const subs = new Set<() => void>();

export function setDroppedModel(file: File) {
  if (current?.origin === 'dropped') URL.revokeObjectURL(current.url);
  current = { url: URL.createObjectURL(file), origin: 'dropped', name: file.name };
  subs.forEach((f) => f());
}

export function useHeroModelSource(): Source {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => current,
  );
}
