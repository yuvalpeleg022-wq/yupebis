import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  use: { baseURL: 'http://localhost:4173', headless: true },
  webServer: { command: 'pnpm --filter @gbm/desktop preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60_000 },
});
