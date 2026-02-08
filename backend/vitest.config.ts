import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        exclude: [...configDefaults.exclude, 'dist/**'],
        testTimeout: 20000,
    },
});
