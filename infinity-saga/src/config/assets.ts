/**
 * ASSET MANIFEST
 * ──────────────
 * Every external asset the experience can use is declared here. Nothing is
 * fetched unless it is listed, so missing files never produce 404s or broken
 * images — the UI renders a clearly labeled placeholder instead.
 *
 * To add an asset: drop the file in /public/assets/<folder>/ and list it below.
 * See /ASSETS.md for licensing requirements and the full workflow.
 */

const BASE = `${import.meta.env.BASE_URL}assets`;

/* ───────────────────────── 3D hero model ─────────────────────────
 * A licensed, rigged/posed Iron Man model wearing or holding the gauntlet.
 * Not bundled: no model with appropriate usage rights was provided.
 * Set `url` once a licensed GLB is placed in /public/assets/models/.
 */
export const HERO_MODEL = {
  url: null as string | null, // e.g. `${BASE}/models/hero.glb`
  /** Draco / Meshopt compressed GLBs are supported (see HeroModel.tsx). */
  scale: 1,
  position: [0, -1.6, 0] as [number, number, number],
  rotationY: 0,
  /**
   * Optional: names of empty nodes in the GLB marking each stone socket.
   * When present, the emissive stones and their lights snap to these nodes.
   * When absent, stones float in the default relic arrangement.
   */
  stoneSockets: {
    space: 'Socket_Space',
    mind: 'Socket_Mind',
    reality: 'Socket_Reality',
    power: 'Socket_Power',
    time: 'Socket_Time',
    soul: 'Socket_Soul',
  },
  /** Node the opening close-up frames (the gauntlet hand). */
  focusNode: 'Gauntlet',
  credit: '',
  license: '',
};

/* ───────────────────────── Environment map ───────────────────────── */
export const ENV_MAP = {
  /** Optional HDR in /public/assets/env/. Falls back to a procedural studio. */
  url: null as string | null,
};

/* ───────────────────────── Movie artwork ─────────────────────────
 * Thumbnails present in this repository (carried over from the earlier
 * /marvel site). They are ~260 px wide reference thumbnails, NOT high
 * resolution. They are displayed at or near native size and never upscaled
 * and labelled as 4K. Replace with properly licensed high-res artwork.
 */
const POSTER_FILES = [
  'antman1', 'antman2', 'av1', 'av2', 'bnd', 'bnw', 'bp1', 'bw', 'cap1', 'cap2', 'cm', 'cw',
  'doomsday', 'ds1', 'dw', 'eg', 'eternals', 'ff', 'ffh', 'gotg1', 'gotg2', 'gotg3',
  'homecoming', 'hulk', 'im1', 'im2', 'im3', 'iw', 'lat', 'marvels', 'mom', 'nwh',
  'quantumania', 'ragnarok', 'shangchi', 'tb', 'thor1', 'thor2', 'wf',
] as const;

export const POSTER_NATIVE_WIDTH = 260;

export const POSTERS: Record<string, string> = Object.fromEntries(
  POSTER_FILES.map((k) => [k, `${BASE}/posters/${k}.jpg`]),
);

export function posterUrl(key: string): string | null {
  return (key && POSTERS[key]) || null;
}

/* ───────────────────────── Character portraits ─────────────────────────
 * No licensed portraits provided. Add `{ 'iron-man': `${BASE}/characters/iron-man.webp` }` etc.
 */
export const PORTRAITS: Record<string, string> = {};

export function portraitUrl(key: string): string | null {
  return PORTRAITS[key] ?? null;
}

/* ───────────────────────── Audio ───────────────────────── */
export const AUDIO = {
  /** Optional ambient score loop. Off by default; user-initiated only. */
  ambient: null as string | null,
};
