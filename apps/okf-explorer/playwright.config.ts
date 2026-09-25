import { defineConfig, devices } from '@playwright/test';

const localPort = process.env.PLAYWRIGHT_PORT ?? '4173';
if (!/^\d+$/.test(localPort) || Number(localPort) < 1 || Number(localPort) > 65535) {
  throw new Error('PLAYWRIGHT_PORT must be an integer from 1 to 65535.');
}
const localBaseURL = `http://127.0.0.1:${localPort}`;
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
    baseURL: deployedBaseURL || localBaseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  ...(deployedBaseURL ? {} : {
    webServer: {
      command: `pnpm dev --host 127.0.0.1 --port ${localPort} --strictPort`,
      url: localBaseURL,
      reuseExistingServer: false,
      timeout: 120_000
    }
  })
});
