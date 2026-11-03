import { App } from '@capacitor/app';
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { StorageAdapter } from '@gbm/database';
import { NO_CLOUD, type PlatformServices } from '@gbm/ui-components';

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Saves live in the app's private data directory on the device. */
class CapacitorStorage implements StorageAdapter {
  readonly name = 'Android app storage';
  private dir = 'saves';
  private async ensure() {
    try {
      await Filesystem.mkdir({ path: this.dir, directory: Directory.Data, recursive: true });
    } catch {
      /* exists */
    }
  }
  async read(file: string) {
    try {
      const r = await Filesystem.readFile({ path: `${this.dir}/${file}`, directory: Directory.Data });
      return typeof r.data === 'string' ? fromBase64(r.data) : new Uint8Array(await r.data.arrayBuffer());
    } catch {
      return null;
    }
  }
  async write(file: string, data: Uint8Array) {
    await this.ensure();
    const tmp = `${this.dir}/${file}.tmp`;
    await Filesystem.writeFile({ path: tmp, directory: Directory.Data, data: toBase64(data) });
    await Filesystem.rename({ from: tmp, to: `${this.dir}/${file}`, directory: Directory.Data, toDirectory: Directory.Data });
  }
  async remove(file: string) {
    try {
      await Filesystem.deleteFile({ path: `${this.dir}/${file}`, directory: Directory.Data });
    } catch {
      /* missing */
    }
  }
  async list() {
    await this.ensure();
    const r = await Filesystem.readdir({ path: this.dir, directory: Directory.Data });
    return r.files.filter((f) => f.type === 'file').map((f) => f.name);
  }
}

export function capacitorPlatform(sqlWasmUrl: string): PlatformServices {
  return {
    id: 'android',
    label: 'Android (Capacitor)',
    storage: new CapacitorStorage(),
    sqlWasmUrl,
    onSuspend(cb) {
      void App.addListener('pause', cb);
    },
    onBack(handler) {
      void App.addListener('backButton', () => {
        if (!handler()) void App.minimizeApp();
      });
    },
    notify() {},
    cloudSync: NO_CLOUD,
  };
}
