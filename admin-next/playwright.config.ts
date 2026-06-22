import { defineConfig, devices } from '@playwright/test';

const port = 3001;
const appOrigin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: appOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'admin-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    env: {
      // Keep all mocked browser traffic same-origin during E2E runs.
      NEXT_PUBLIC_API_URL: `${appOrigin}/api-e2e`,
    },
    url: `${appOrigin}/admin/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
