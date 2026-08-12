import { defineConfig, devices } from '@playwright/test';

const localBaseURL = 'http://127.0.0.1:4174/';
const suppliedBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/foundry',
  outputDir: './test-results/foundry',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'foundry-playwright-report' }]]
    : 'line',
  use: {
    baseURL: suppliedBaseURL || localBaseURL,
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
  ...(suppliedBaseURL
    ? {}
    : {
        webServer: {
          command:
            'uv run --project ../.. --locked python -m http.server 4174 --bind 127.0.0.1 --directory ../../_site',
          url: localBaseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000
        }
      })
});
