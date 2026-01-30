import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest-cache',
  test: {
    environment: 'node',
    testTimeout: 60000,
    pool: 'threads',
    threads: false, // Allow parallel execution for faster CI runs
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
    maxThreads: 4,
    minThreads: 1,
  },
});
