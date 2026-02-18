import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configuredBase = process.env.VITE_ADMIN_BASENAME || '/admin';
const normalizedBase = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;

export default defineConfig({
    plugins: [react()],
    base: normalizedBase,
    server: {
        port: 4174,
    },
    preview: {
        port: 4174,
    },
});
