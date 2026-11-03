import type { StorageAdapter } from '@gbm/database';
import { NO_CLOUD, type PlatformServices } from '@gbm/ui-components';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Saves live in the per-user app data folder (e.g. %APPDATA%\com.gbm.globalbasketballmanager\saves). */
class TauriStorage implements StorageAdapter {
  readonly name = 'Windows app data folder';
  private async fs() {
    return import('@tauri-apps/plugin-fs');
  }
  private async ensureDir() {
    const fs = await this.fs();
    if (!(await fs.exists('saves', { baseDir: fs.BaseDirectory.AppData }))) await fs.mkdir('saves', { baseDir: fs.BaseDirectory.AppData, recursive: true });
    return fs;
  }
  async read(file: string) {
    const fs = await this.ensureDir();
    const path = `saves/${file}`;
    if (!(await fs.exists(path, { baseDir: fs.BaseDirectory.AppData }))) return null;
    return fs.readFile(path, { baseDir: fs.BaseDirectory.AppData });
  }
  async write(file: string, data: Uint8Array) {
    const fs = await this.ensureDir();
    // Write to a temp file then rename, so a crash mid-write never corrupts the save.
    const tmp = `saves/${file}.tmp`;
    await fs.writeFile(tmp, data, { baseDir: fs.BaseDirectory.AppData });
    await fs.rename(tmp, `saves/${file}`, { oldPathBaseDir: fs.BaseDirectory.AppData, newPathBaseDir: fs.BaseDirectory.AppData });
  }
  async remove(file: string) {
    const fs = await this.ensureDir();
    const path = `saves/${file}`;
    if (await fs.exists(path, { baseDir: fs.BaseDirectory.AppData })) await fs.remove(path, { baseDir: fs.BaseDirectory.AppData });
  }
  async list() {
    const fs = await this.ensureDir();
    return (await fs.readDir('saves', { baseDir: fs.BaseDirectory.AppData })).filter((e) => e.isFile).map((e) => e.name);
  }
}

export function tauriPlatform(sqlWasmUrl: string): PlatformServices {
  return {
    id: 'desktop',
    label: 'Windows (Tauri)',
    storage: new TauriStorage(),
    sqlWasmUrl,
    onSuspend(cb) {
      window.addEventListener('beforeunload', cb);
      void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().onCloseRequested(() => cb()));
    },
    onBack() {},
    notify() {},
    cloudSync: NO_CLOUD,
  };
}
