import type { StorageAdapter } from '@gbm/database';

/**
 * Platform adapter: everything that differs between Windows (Tauri), Android
 * (Capacitor) and the browser. The game engine never touches these APIs.
 */
export interface PlatformServices {
  id: 'desktop' | 'android' | 'web';
  label: string;
  storage: StorageAdapter;
  /** URL of sql-wasm.wasm bundled by the app. */
  sqlWasmUrl: string;
  /** Called when the app is backgrounded or closed (autosave hook). */
  onSuspend(cb: () => void): void;
  /** Android hardware back button. Return true when handled. */
  onBack(cb: () => boolean): void;
  notify(title: string, body: string): void;
  cloudSync: { available: false; reason: string };
}

/** IndexedDB-backed storage for the browser build and development. */
export class IndexedDbStorage implements StorageAdapter {
  readonly name = 'IndexedDB';
  private db: Promise<IDBDatabase>;
  constructor(dbName = 'gbm-saves') {
    this.db = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const t = db.transaction('files', mode);
      const r = fn(t.objectStore('files'));
      t.oncomplete = () => resolve(r.result);
      t.onerror = () => reject(t.error);
    });
  }
  async read(file: string) {
    const v = await this.tx<Uint8Array | undefined>('readonly', (s) => s.get(file));
    return v ? new Uint8Array(v) : null;
  }
  async write(file: string, data: Uint8Array) { await this.tx('readwrite', (s) => s.put(data, file)); }
  async remove(file: string) { await this.tx('readwrite', (s) => s.delete(file)); }
  async list() { return (await this.tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())).map(String); }
}

export const NO_CLOUD = { available: false as const, reason: 'Cloud synchronization requires a backend that has not been built yet. Use Export / Import save to move careers between devices.' };

export function webPlatform(sqlWasmUrl: string): PlatformServices {
  return {
    id: 'web',
    label: 'Browser',
    storage: new IndexedDbStorage(),
    sqlWasmUrl,
    onSuspend(cb) {
      document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && cb());
      window.addEventListener('beforeunload', cb);
    },
    onBack() {},
    notify() {},
    cloudSync: NO_CLOUD,
  };
}
