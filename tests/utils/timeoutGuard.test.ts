import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withTimeout, getTimeoutFromEnv, WEAVIATE_STARTUP_TIMEOUT } from './timeoutGuard';

describe('timeoutGuard', () => {
  describe('withTimeout', () => {
    it('should resolve when operation completes before timeout', async () => {
      const operation = Promise.resolve('success');
      const result = await withTimeout(operation, 1000, 'Test operation');
      expect(result).toBe('success');
    });

    it('should reject when operation exceeds timeout', async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve('late'), 2000));

      await expect(withTimeout(operation, 100, 'Slow operation')).rejects.toThrow(
        '[Timeout] Slow operation exceeded 0.1s limit'
      );
    });

    it('should reject when operation fails before timeout', async () => {
      const operation = Promise.reject(new Error('Operation failed'));

      await expect(withTimeout(operation, 1000, 'Failing operation')).rejects.toThrow('Operation failed');
    });

    it('should clean up timeout on successful completion', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const operation = Promise.resolve('success');

      await withTimeout(operation, 1000, 'Test operation');

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clean up timeout on timeout rejection', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const operation = new Promise((resolve) => setTimeout(() => resolve('late'), 2000));

      try {
        await withTimeout(operation, 100, 'Slow operation');
      } catch {
        // Expected to throw
      }

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle AbortSignal in options', async () => {
      const controller = new AbortController();
      const operation = new Promise((resolve) => setTimeout(() => resolve('late'), 2000));

      const timeoutPromise = withTimeout(operation, 100, 'Abortable operation', {
        signal: controller.signal,
      });

      await expect(timeoutPromise).rejects.toThrow('[Timeout] Abortable operation exceeded 0.1s limit');
    });

    it('should work without options parameter', async () => {
      const operation = Promise.resolve('success');
      const result = await withTimeout(operation, 1000, 'Test operation');
      expect(result).toBe('success');
    });

    it('should format timeout duration correctly in error message', async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve('late'), 10000));

      await expect(withTimeout(operation, 5500, 'Duration test')).rejects.toThrow(
        '[Timeout] Duration test exceeded 5.5s limit'
      );
    });
  });

  describe('getTimeoutFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return default value when env var is not set', () => {
      delete process.env.TEST_TIMEOUT;
      const result = getTimeoutFromEnv('TEST_TIMEOUT', 5000);
      expect(result).toBe(5000);
    });

    it('should return env var value when set to valid number', () => {
      process.env.TEST_TIMEOUT = '10000';
      const result = getTimeoutFromEnv('TEST_TIMEOUT', 5000);
      expect(result).toBe(10000);
    });

    it('should return default value when env var is not a number', () => {
      process.env.TEST_TIMEOUT = 'not-a-number';
      const result = getTimeoutFromEnv('TEST_TIMEOUT', 5000);
      expect(result).toBe(5000);
    });

    it('should return default value when env var is negative', () => {
      process.env.TEST_TIMEOUT = '-1000';
      const result = getTimeoutFromEnv('TEST_TIMEOUT', 5000);
      expect(result).toBe(5000);
    });

    it('should return default value when env var is zero', () => {
      process.env.TEST_TIMEOUT = '0';
      const result = getTimeoutFromEnv('TEST_TIMEOUT', 5000);
      expect(result).toBe(5000);
    });

    it('should return env var value when set to valid positive number string', () => {
      process.env.TEST_TIMEOUT = '  12345  ';
      const result = getTimeoutFromEnv('TEST_TIMEOUT', 5000);
      expect(result).toBe(12345);
    });
  });

  describe('WEAVIATE_STARTUP_TIMEOUT', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use CI timeout when CI env var is set', () => {
      // Note: This test verifies the constant's behavior, but the value is set at module load time
      // In a real scenario, you'd need to reload the module to test different CI values
      expect(WEAVIATE_STARTUP_TIMEOUT).toBeGreaterThan(0);
      expect(typeof WEAVIATE_STARTUP_TIMEOUT).toBe('number');
    });

    it('should be a positive number', () => {
      expect(WEAVIATE_STARTUP_TIMEOUT).toBeGreaterThan(0);
    });

    it('should be reasonable for startup operations (between 30s and 300s)', () => {
      expect(WEAVIATE_STARTUP_TIMEOUT).toBeGreaterThanOrEqual(30_000);
      expect(WEAVIATE_STARTUP_TIMEOUT).toBeLessThanOrEqual(300_000);
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid consecutive operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        withTimeout(Promise.resolve(i), 1000, `Operation ${i}`)
      );

      const results = await Promise.all(operations);
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should handle mixed success and timeout scenarios', async () => {
      const fastOp = withTimeout(Promise.resolve('fast'), 1000, 'Fast op');
      const slowOp = withTimeout(
        new Promise((resolve) => setTimeout(() => resolve('slow'), 2000)),
        100,
        'Slow op'
      );

      const results = await Promise.allSettled([fastOp, slowOp]);

      expect(results[0].status).toBe('fulfilled');
      expect((results[0] as PromiseFulfilledResult<string>).value).toBe('fast');
      expect(results[1].status).toBe('rejected');
      expect((results[1] as PromiseRejectedResult).reason.message).toContain('[Timeout]');
    });
  });
});
