import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));

/** Resolves every @gbm/<package> import to its TypeScript source. */
export const gbmAliases: Record<string, string> = Object.fromEntries(
  readdirSync(join(root, 'packages')).map((name) => [`@gbm/${name}`, join(root, 'packages', name, 'src', 'index.ts')]),
);

/** Exact-match form for Vite (so deep imports like @gbm/ui-components/src/styles.css still resolve). */
export const gbmAliasList = Object.entries(gbmAliases).map(([find, replacement]) => ({
  find: new RegExp(`^${find.replace('/', '\\/')}$`),
  replacement,
}));
