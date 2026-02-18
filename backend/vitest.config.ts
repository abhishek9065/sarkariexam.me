import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        exclude: [...configDefaults.exclude, 'dist/**'],
        testTimeout: 20000,
        hookTimeout: 30000,
        retry: process.env.CI ? 1 : 0,
    },
});
