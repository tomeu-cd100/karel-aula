import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:8124', acceptDownloads: true },
  webServer: {
    command: 'node tests/serve.mjs 8124',
    url: 'http://localhost:8124',
    reuseExistingServer: true,
  },
});
