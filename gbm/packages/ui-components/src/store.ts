import { create } from 'zustand';
import initSqlJs from 'sql.js';
import type { World } from '@gbm/shared-types';
import { invalidateIndexes } from '@gbm/shared-types';
import { SaveManager, type SaveInfo } from '@gbm/database';
import { loadRealDataset2026, validateDataset } from '@gbm/data-import';
import { advanceDay, assignUserToClub, blockingIssues, createCareer, type AdvanceMode, type ManagerExperience } from '@gbm/game-engine';
import type { PlatformServices } from './platform';

export type ScreenId =
  | 'dashboard' | 'club' | 'squad' | 'player' | 'tactics' | 'training' | 'transfers' | 'scouting' | 'competitions'
  | 'schedule' | 'match' | 'finances' | 'staff' | 'coach' | 'stats' | 'career' | 'news' | 'data' | 'settings' | 'qualification' | 'rules';

export interface Route {
  screen: ScreenId;
  id?: string;
}

interface Toast {
  id: number;
  tone: 'good' | 'bad' | 'info';
  text: string;
}

interface GameState {
  platform: PlatformServices | null;
  saves: SaveManager | null;
  booted: boolean;
  bootError: string | null;
  careers: SaveInfo[];
  world: World | null;
  /** Bumped after every engine mutation so React re-renders. */
  version: number;
  route: Route;
  history: Route[];
  busy: { label: string; progress: number } | null;
  toasts: Toast[];
  lastSaved: string | null;
  daysSinceAutosave: number;

  boot(platform: PlatformServices): Promise<void>;
  refreshCareers(): Promise<void>;
  newCareer(o: { careerName: string; managerName: string; experience: ManagerExperience; fictionalCoachPolicy: 'when_needed' | 'never'; rosterPolicy: 'real_only' | 'placeholders'; playerDataset?: unknown }): Promise<void>;
  chooseClub(clubId: string): void;
  loadCareer(careerId: string): Promise<void>;
  closeCareer(): Promise<void>;
  save(): Promise<void>;
  /** Runs an engine mutation and re-renders. Errors become toasts. */
  act<T>(fn: (w: World) => T, success?: string | ((r: T) => string)): T | undefined;
  advance(mode: AdvanceMode): Promise<void>;
  go(route: Route): void;
  back(): boolean;
  toast(text: string, tone?: Toast['tone']): void;
  importSaveFile(bytes: Uint8Array): Promise<void>;
  exportSaveFile(): Uint8Array | null;
}

let toastId = 0;
const AUTOSAVE_EVERY_DAYS = 7;

export const useGame = create<GameState>((set, get) => ({
  platform: null,
  saves: null,
  booted: false,
  bootError: null,
  careers: [],
  world: null,
  version: 0,
  route: { screen: 'dashboard' },
  history: [],
  busy: null,
  toasts: [],
  lastSaved: null,
  daysSinceAutosave: 0,

  async boot(platform) {
    try {
      const SQL = await initSqlJs({ locateFile: () => platform.sqlWasmUrl });
      const saves = new SaveManager(SQL, platform.storage);
      set({ platform, saves });
      platform.onSuspend(() => {
        const w = get().world;
        if (w) void saves.autosave(w);
      });
      platform.onBack(() => get().back());
      await get().refreshCareers();
      set({ booted: true });
    } catch (e) {
      set({ bootError: (e as Error).message, booted: true });
    }
  },

  async refreshCareers() {
    const saves = get().saves;
    if (saves) set({ careers: await saves.listCareers() });
  },

  async newCareer(o) {
    set({ busy: { label: 'Building the basketball world…', progress: 0 } });
    await new Promise((r) => setTimeout(r, 30));
    try {
      let dataset = undefined;
      if (o.playerDataset) {
        const base = loadRealDataset2026();
        const extra = o.playerDataset as { sources?: unknown[]; players?: unknown[] };
        dataset = validateDataset({ sources: [...base.sources, ...(extra.sources ?? [])], clubs: base.clubs, coaches: base.coaches, players: [...base.players, ...(extra.players ?? [])] }, `${base.name} + imported players`, base.season);
      }
      const world = createCareer({ careerName: o.careerName, managerName: o.managerName, managerExperience: o.experience, fictionalCoachPolicy: o.fictionalCoachPolicy, rosterPolicy: o.rosterPolicy, dataset });
      set({ world, version: get().version + 1, route: { screen: 'dashboard' }, history: [] });
    } catch (e) {
      get().toast((e as Error).message, 'bad');
    } finally {
      set({ busy: null });
    }
  },

  chooseClub(clubId) {
    get().act((w) => assignUserToClub(w, clubId, w.managerHistory.length ? 'job' : 'start'));
    void get().save();
  },

  async loadCareer(careerId) {
    const saves = get().saves!;
    set({ busy: { label: 'Loading career…', progress: 0 } });
    try {
      const r = await saves.load(careerId);
      set({ world: r.world, version: get().version + 1, route: { screen: 'dashboard' }, history: [], lastSaved: r.world.meta.updatedAt });
      if (r.recovered) get().toast(`Recovered from ${r.slot} save (${r.errors.join('; ')})`, 'info');
    } catch (e) {
      get().toast((e as Error).message, 'bad');
    } finally {
      set({ busy: null });
    }
  },

  async closeCareer() {
    await get().save();
    set({ world: null, route: { screen: 'dashboard' }, history: [] });
    await get().refreshCareers();
  },

  async save() {
    const { world, saves } = get();
    if (!world || !saves) return;
    try {
      await saves.save(world);
      set({ lastSaved: world.meta.updatedAt, daysSinceAutosave: 0 });
    } catch (e) {
      get().toast(`Save failed: ${(e as Error).message}`, 'bad');
    }
  },

  act(fn, success) {
    const w = get().world;
    if (!w) return undefined;
    try {
      const r = fn(w);
      invalidateIndexes(w);
      set({ version: get().version + 1 });
      if (success) get().toast(typeof success === 'function' ? success(r) : success, 'good');
      return r;
    } catch (e) {
      get().toast((e as Error).message, 'bad');
      return undefined;
    }
  },

  async advance(mode) {
    const { world, saves } = get();
    if (!world || get().busy) return;
    const blocked = blockingIssues(world);
    if (blocked.length) {
      for (const b of blocked) get().toast(b, 'bad');
      return;
    }
    const limit = mode === 'day' ? 1 : mode === 'week' ? 7 : mode === 'month' ? 31 : 400;
    const startMonth = world.meta.currentDate.slice(0, 7);
    set({ busy: { label: 'Simulating…', progress: 0 } });
    let stopped: string | null = null;
    try {
      for (let i = 0; i < limit; i++) {
        const r = advanceDay(world);
        set({ daysSinceAutosave: get().daysSinceAutosave + 1 });
        if (i % 2 === 1) {
          // Yield so the interface stays responsive during long simulations.
          set({ busy: { label: `Simulating ${world.meta.currentDate}…`, progress: (i + 1) / limit }, version: get().version + 1 });
          await new Promise((res) => setTimeout(res, 0));
        }
        if (r.important.length && mode !== 'day') {
          stopped = r.important[0].title;
          break;
        }
        if (mode === 'next_game' && r.userPlayed) break;
        if (mode === 'month' && world.meta.currentDate.slice(0, 7) !== startMonth) break;
        const b = blockingIssues(world);
        if (b.length) {
          stopped = b[0];
          break;
        }
      }
    } catch (e) {
      get().toast(`Simulation error: ${(e as Error).message}`, 'bad');
    }
    set({ busy: null, version: get().version + 1 });
    if (stopped) get().toast(`Stopped: ${stopped}`, 'info');
    if (saves && get().daysSinceAutosave >= AUTOSAVE_EVERY_DAYS) {
      await saves.autosave(world);
      set({ daysSinceAutosave: 0, lastSaved: world.meta.updatedAt });
    }
  },

  go(route) {
    set({ history: [...get().history, get().route].slice(-30), route });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  },

  back() {
    const h = get().history;
    if (!h.length) return false;
    set({ route: h[h.length - 1], history: h.slice(0, -1) });
    return true;
  },

  toast(text, tone = 'info') {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, tone, text }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 4500);
  },

  async importSaveFile(bytes) {
    const saves = get().saves!;
    try {
      const world = saves.fromBytes(bytes);
      await saves.save(world);
      await get().refreshCareers();
      get().toast(`Imported career “${world.meta.careerName}”.`, 'good');
    } catch (e) {
      get().toast(`Import failed: ${(e as Error).message}`, 'bad');
    }
  },

  exportSaveFile() {
    const { world, saves } = get();
    return world && saves ? saves.toBytes(world) : null;
  },
}));

/** Subscribe a component to world changes. */
export function useWorld(): World {
  const w = useGame((s) => s.world);
  useGame((s) => s.version);
  if (!w) throw new Error('No career loaded');
  return w;
}
