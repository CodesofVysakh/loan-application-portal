
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', {
    outputFolder: '../../dist/.playwright/apps/api-e2e/playwright-report',
    open: 'never',
  }]],
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'api',
    },
  ],
  webServer: {
    command: 'npx nx serve api',
    url: 'http://localhost:3000/api/health/database',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});