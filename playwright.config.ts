import { defineConfig, devices } from '@playwright/test';
import { env } from './app/env';

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${env.port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Seed first so every run starts from the same clean data plus D1-D6.
    command: 'npm run seed && npm start',
    url: `http://localhost:${env.port}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
