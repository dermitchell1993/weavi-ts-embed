import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest-cache',
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    pool: 'threads',
    singleThread: true, // For integration tests that need isolation
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
    logHeapUsage: true,
    maxThreads: 2,
    minThreads: 1,
  },
});
