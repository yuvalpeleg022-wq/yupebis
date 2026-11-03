import type { SqlJsStatic } from 'sql.js';
import type { World } from '@gbm/shared-types';
import { SAVE_VERSION } from '@gbm/shared-types';
import { integrityCheck, loadWorld, readSaveMeta, saveWorld } from './repository';

/**
 * Platform storage adapter. Implemented with IndexedDB (browser), the Tauri
 * file-system plugin (Windows) and the Capacitor Filesystem plugin (Android).
 * All platforms store the same SQLite file, so saves are compatible.
 */
export interface StorageAdapter {
  readonly name: string;
  read(file: string): Promise<Uint8Array | null>;
  write(file: string, data: Uint8Array): Promise<void>;
  remove(file: string): Promise<void>;
  list(): Promise<string[]>;
}

export type SaveSlot = 'main' | 'autosave' | 'backup';

export interface SaveInfo {
  careerId: string;
  careerName: string;
  managerName: string;
  userClubId: string;
  season: number;
  currentDate: string;
  updatedAt: string;
  saveVersion: number;
  slot: SaveSlot;
}

const EXT: Record<SaveSlot, string> = { main: '.gbm', autosave: '.auto.gbm', backup: '.bak.gbm' };

export function fileFor(careerId: string, slot: SaveSlot) {
  return `${careerId}${EXT[slot]}`;
}

export class SaveManager {
  constructor(private SQL: SqlJsStatic, private storage: StorageAdapter) {}

  /** Serializes a world to SQLite bytes. */
  toBytes(world: World): Uint8Array {
    const db = new this.SQL.Database();
    try {
      saveWorld(db, world);
      return db.export();
    } finally {
      db.close();
    }
  }

  fromBytes(bytes: Uint8Array): World {
    const db = new this.SQL.Database(bytes);
    try {
      const check = integrityCheck(db);
      if (!check.ok) throw new Error(`Save is damaged: ${check.problems.slice(0, 3).join('; ')}`);
      const meta = readSaveMeta(db)!;
      if (meta.saveVersion > SAVE_VERSION) throw new Error(`Save was made by a newer game version (${meta.saveVersion}).`);
      return loadWorld(db);
    } finally {
      db.close();
    }
  }

  /** Manual save: the previous main save becomes the backup. */
  async save(world: World): Promise<void> {
    world.meta.updatedAt = new Date().toISOString();
    const bytes = this.toBytes(world);
    const main = fileFor(world.meta.careerId, 'main');
    const previous = await this.storage.read(main);
    if (previous) await this.storage.write(fileFor(world.meta.careerId, 'backup'), previous);
    await this.storage.write(main, bytes);
  }

  async autosave(world: World): Promise<void> {
    world.meta.updatedAt = new Date().toISOString();
    await this.storage.write(fileFor(world.meta.careerId, 'autosave'), this.toBytes(world));
  }

  private infoFrom(bytes: Uint8Array, slot: SaveSlot): SaveInfo | null {
    try {
      const db = new this.SQL.Database(bytes);
      try {
        const m = readSaveMeta(db);
        if (!m) return null;
        return { careerId: m.careerId, careerName: m.careerName, managerName: m.managerName, userClubId: m.userClubId, season: m.season, currentDate: m.currentDate, updatedAt: m.updatedAt, saveVersion: m.saveVersion, slot };
      } finally {
        db.close();
      }
    } catch {
      return null;
    }
  }

  /** All careers, one entry each, using the most recent readable slot. */
  async listCareers(): Promise<SaveInfo[]> {
    const files = await this.storage.list();
    const best = new Map<string, SaveInfo>();
    for (const f of files) {
      const slot: SaveSlot | null = f.endsWith('.auto.gbm') ? 'autosave' : f.endsWith('.bak.gbm') ? 'backup' : f.endsWith('.gbm') ? 'main' : null;
      if (!slot) continue;
      const bytes = await this.storage.read(f);
      const info = bytes && this.infoFrom(bytes, slot);
      if (!info) continue;
      const prev = best.get(info.careerId);
      if (!prev || info.updatedAt > prev.updatedAt) best.set(info.careerId, info);
    }
    return [...best.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  /**
   * Loads the newest valid slot (main or autosave), falling back to the backup
   * if both are damaged — this is the crash-recovery path.
   */
  async load(careerId: string): Promise<{ world: World; slot: SaveSlot; recovered: boolean; errors: string[] }> {
    const errors: string[] = [];
    const candidates: { slot: SaveSlot; bytes: Uint8Array; updatedAt: string }[] = [];
    for (const slot of ['main', 'autosave', 'backup'] as SaveSlot[]) {
      const bytes = await this.storage.read(fileFor(careerId, slot));
      if (!bytes) continue;
      const info = this.infoFrom(bytes, slot);
      candidates.push({ slot, bytes, updatedAt: info?.updatedAt ?? '' });
    }
    const order = [...candidates.filter((c) => c.slot !== 'backup').sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)), ...candidates.filter((c) => c.slot === 'backup')];
    for (const c of order) {
      try {
        const world = this.fromBytes(c.bytes);
        return { world, slot: c.slot, recovered: errors.length > 0, errors };
      } catch (e) {
        errors.push(`${c.slot}: ${(e as Error).message}`);
      }
    }
    throw new Error(`No readable save for ${careerId}. ${errors.join(' | ')}`);
  }

  async delete(careerId: string) {
    for (const slot of ['main', 'autosave', 'backup'] as SaveSlot[]) await this.storage.remove(fileFor(careerId, slot));
  }
}

/** In-memory storage (tests, and a fallback when no persistent storage exists). */
export class MemoryStorage implements StorageAdapter {
  readonly name = 'memory';
  files = new Map<string, Uint8Array>();
  async read(f: string) { return this.files.get(f) ?? null; }
  async write(f: string, d: Uint8Array) { this.files.set(f, new Uint8Array(d)); }
  async remove(f: string) { this.files.delete(f); }
  async list() { return [...this.files.keys()]; }
}
