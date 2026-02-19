import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configuredBase = process.env.VITE_ADMIN_BASENAME || '/admin';
const normalizedBase = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
    plugins: [react()],
    base: normalizedBase,
    server: {
        port: 4174,
        proxy: {
            '/api': {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
            },
            '/ws': {
                target: proxyTarget,
                changeOrigin: true,
                ws: true,
                secure: false,
            },
        },
    },
    preview: {
        port: 4174,
    },
});

