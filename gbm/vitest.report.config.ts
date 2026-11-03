import { defineConfig } from 'vitest/config';
import { gbmAliases } from './gbm-aliases.ts';

export default defineConfig({
  resolve: { alias: gbmAliases },
  test: { include: ['packages/*/report/**/*.report.test.ts'], environment: 'node' },
});
