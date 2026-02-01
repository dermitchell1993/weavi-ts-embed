import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest-cache',
  test: {
    environment: 'node',
    testTimeout: 60000,
    // Use threads for parallelization but limit for integration tests
    pool: process.env.VITEST_POOL || 'threads',
    maxThreads: process.env.CI ? 2 : 4,
    minThreads: 1,
    singleThread: process.env.VITEST_SINGLE_THREAD === 'true',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/*.config.*', '**/tools/**', '**/examples/**'],
    },
    include: ['**/*.test.ts'],
    typecheck: {
      tsconfig: './tsconfig-test.json',
    },
    // Optimize for CI
    reporters: process.env.CI ? ['verbose'] : ['default'],
    logHeapUsage: Boolean(process.env.CI),
  },
});
