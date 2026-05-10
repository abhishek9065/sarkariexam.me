import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        exclude: [...configDefaults.exclude, 'dist/**'],
        testTimeout: 20000,
        hookTimeout: 30000,
        fileParallelism: false,
        env: {
            NODE_ENV: 'test',
            COSMOS_CONNECTION_STRING: '',
            ADMIN_REQUIRE_2FA: 'false',
        },
    },
});
