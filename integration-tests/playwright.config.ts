import { defineConfig, devices } from '@playwright/test';

/**
 * PrivatePDF Integration Test Configuration
 *
 * Configure the target deployment via environment variables:
 *   BASE_URL  - The deployed app URL (default: GitHub Pages)
 *   CI        - Set to "true" in CI environments
 *
 * Examples:
 *   BASE_URL=https://alam00000.github.io/bentopdf npx playwright test
 *   BASE_URL=http://localhost:3000 npx playwright test
 *   BASE_URL=https://privatepdf.com npx playwright test
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  timeout: 120_000,       // 2 min per test (PDF processing can be slow)
  expect: {
    timeout: 30_000,      // 30s for assertions
  },

  use: {
    baseURL: process.env.BASE_URL || 'https://alam00000.github.io/bentopdf',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
