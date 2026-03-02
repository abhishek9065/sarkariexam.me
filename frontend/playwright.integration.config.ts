import { defineConfig } from '@playwright/test';

import baseConfig from './playwright.config';

const backendPort = Number(process.env.INTEGRATION_BACKEND_PORT ?? 5000);
const backendUrl = `http://127.0.0.1:${backendPort}`;
const backendApiHealthUrl = `${backendUrl}/api/health`;
const backendProxyTarget = process.env.VITE_PROXY_TARGET || backendUrl;

export default defineConfig({
    ...baseConfig,
    webServer: [
        {
            command: 'npm run dev',
            cwd: '../backend',
            url: backendApiHealthUrl,
            reuseExistingServer: true,
            timeout: 180_000,
            env: {
                ...process.env,
                NODE_ENV: process.env.NODE_ENV || 'integration',
                PORT: String(backendPort),
                JWT_SECRET: process.env.JWT_SECRET || 'integration-test-secret',
                ADMIN_SETUP_KEY: process.env.ADMIN_SETUP_KEY || 'integration-admin-setup-key',
                TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY || 'integration-totp-encryption-key',
                COSMOS_CONNECTION_STRING: process.env.COSMOS_CONNECTION_STRING || '',
                MONGODB_URI: process.env.MONGODB_URI || '',
            },
        },
        {
            command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
            url: 'http://127.0.0.1:4173',
            reuseExistingServer: true,
            timeout: 180_000,
            env: {
                ...process.env,
                VITE_PROXY_TARGET: backendProxyTarget,
            },
        },
    ],
});
