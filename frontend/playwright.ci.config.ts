import { defineConfig } from '@playwright/test';

import baseConfig from './playwright.config';

export default defineConfig({
    ...baseConfig,
    // Keep nightly/CI deterministic and debuggable.
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]] : 'list',
    use: {
        ...baseConfig.use,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    webServer: {
        // Build + preview ensures deterministic static runtime for CI e2e.
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
        env: {
            ...process.env,
            VITE_DISABLE_PROXY: '1',
        },
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
        timeout: 300_000,
    },
});
