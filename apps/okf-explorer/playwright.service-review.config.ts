import { defineConfig, devices } from '@playwright/test';

/** Exercise the built read-only service, independently of the Explorer Vite app. */
export default defineConfig({
  testDir: './tests/service-review',
  outputDir: './test-results/service-review',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['line'], ['json', { outputFile: '../../output/playwright/service-review/results.json' }]],
  use: {
    baseURL: process.env.ASK_OKF_REVIEW_BASE_URL || 'http://127.0.0.1:8787',
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  ...(process.env.ASK_OKF_REVIEW_BASE_URL ? {} : {
    webServer: {
      command: 'npm --prefix ../../services/ask-okf-mcp run build && npm --prefix ../../services/ask-okf-mcp start',
      url: 'http://127.0.0.1:8787/review/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  })
});
