import { defineConfig, devices } from '@playwright/test';

/**
 * PrivatePDF Integration Test Configuration
 *
 * Run modes:
 *
 *   Local (starts Vite dev server automatically):
 *     npm run test:local
 *     npm run test:local:headed
 *
 *   Remote (against GitHub Pages or any deployed URL):
 *     npm test                          # defaults to GitHub Pages
 *     BASE_URL=https://example.com npm test
 *
 *   Environment variables:
 *     TEST_ENV   - "local" to auto-start the dev server (default: "remote")
 *     BASE_URL   - Override the target URL (ignored when TEST_ENV=local)
 *     CI         - Set to "true" in CI environments
 */

const isLocal = process.env.TEST_ENV === 'local';
const defaultRemoteURL = 'https://alam00000.github.io/bentopdf/';

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
    baseURL: isLocal
      ? 'http://localhost:5173/'
      : (process.env.BASE_URL || defaultRemoteURL),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
  },

  /* Start a local Vite dev server when TEST_ENV=local */
  ...(isLocal
    ? {
        webServer: {
          command: 'npm run dev',
          cwd: '..',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      }
    : {}),

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
