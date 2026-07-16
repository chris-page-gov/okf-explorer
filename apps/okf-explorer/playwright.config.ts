import { defineConfig, devices } from '@playwright/test';

const localBaseURL = 'http://127.0.0.1:4173';
const deployedBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/ui',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'line',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: deployedBaseURL || localBaseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  ...(deployedBaseURL ? {} : {
    webServer: {
      command: 'pnpm dev --host 127.0.0.1 --port 4173',
      url: localBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  })
});
