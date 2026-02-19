import { defineConfig } from '@playwright/test';

const configuredBasename = process.env.VITE_ADMIN_BASENAME || '/admin-vnext';
const adminBasename = configuredBasename.startsWith('/') ? configuredBasename : `/${configuredBasename}`;
const adminBasePath = adminBasename.endsWith('/') ? adminBasename : `${adminBasename}/`;
const baseURL = `http://127.0.0.1:4174${adminBasePath}`;
const webServerUrl = 'http://127.0.0.1:4174';
const e2eStepUpBypass = process.env.VITE_ADMIN_E2E_STEPUP_BYPASS ?? 'true';

export default defineConfig({
    testDir: './tests',
    testIgnore: ['**/admin.integration.spec.ts'],
    timeout: 30_000,
    use: {
        baseURL,
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 4174',
        url: webServerUrl,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            ...process.env,
            VITE_ADMIN_BASENAME: adminBasename,
            VITE_ADMIN_E2E_STEPUP_BYPASS: e2eStepUpBypass,
        },
    },
});
