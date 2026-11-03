import { defineConfig } from 'vitest/config';
import { gbmAliases } from './gbm-aliases.ts';

export default defineConfig({
  resolve: { alias: gbmAliases },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
  },
});
