import { defineConfig } from '@playwright/test';

const configuredBasename = process.env.VITE_ADMIN_BASENAME || '/admin';
const adminBasename = configuredBasename.startsWith('/') ? configuredBasename : `/${configuredBasename}`;
const adminBasePath = adminBasename.endsWith('/') ? adminBasename : `${adminBasename}/`;
const baseURL = `http://127.0.0.1:4175${adminBasePath}`;
const e2eStepUpBypass = process.env.VITE_ADMIN_E2E_STEPUP_BYPASS ?? 'false';

export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
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
        command: 'npm run dev -- --host 127.0.0.1 --port 4175',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            ...process.env,
            VITE_ADMIN_E2E_STEPUP_BYPASS: e2eStepUpBypass,
        },
    },
});
