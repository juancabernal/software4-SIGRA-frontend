import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['SIGRA_E2E_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer:
    process.env['SIGRA_E2E_START_FRONTEND'] === '1'
      ? {
          command: 'npm start -- --host 127.0.0.1',
          url: baseURL,
          reuseExistingServer: !process.env['CI'],
          timeout: 120_000,
        }
      : undefined,
});
