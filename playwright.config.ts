import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 375, height: 812 }, // iPhone XS/Xサイズ (モバイルファースト検証)
  },
});
