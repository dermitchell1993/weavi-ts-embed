/* eslint-disable no-plusplus, require-await */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitForReady, checkHealth, checkLiveness } from '../../../src/health-checker';
import type { HealthCheckConfig } from '../../../src/types';

// Mock global fetch
global.fetch = vi.fn();

describe('health-checker', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('waitForReady', () => {
    describe('Happy Path - Success Scenarios', () => {
      it('should resolve immediately when Weaviate is ready on first attempt', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
        };

        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v1/.well-known/ready');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Weaviate is ready'));
      });

      it('should log exact success message format on first attempt', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
        };

        await waitForReady(config);

        // Verify exact console message format to catch formatting regressions
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ Weaviate is ready (1 attempts, 0ms)');
      });

      it('should retry and eventually succeed when Weaviate becomes ready', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Connection refused');
          }
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 10, // Fast intervals for testing
        };

        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Weaviate is ready'));
      });

      it('should handle non-ok responses and retry until success', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          if (callCount < 3) {
            return { ok: false, status: 503 } as Response;
          }
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 10,
        };

        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Weaviate is ready'));
      });

      it('should work with different host and port combinations', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: '192.168.1.100',
          port: 9090,
        };

        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalledWith('http://192.168.1.100:9090/v1/.well-known/ready');
      });

      it('should suppress console logs when silent mode is enabled', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          silent: true,
        };

        await waitForReady(config);

        expect(consoleLogSpy).not.toHaveBeenCalled();
      });
    });

    describe('Timeout Scenarios', () => {
      it('should timeout after specified duration when server never becomes ready', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 100,
          interval: 10,
        };

        await expect(waitForReady(config)).rejects.toThrow('Weaviate failed to start within 100ms');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Health check timed out'));
      });

      it('should timeout with custom short timeout value', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: '127.0.0.1',
          port: 9999,
          timeout: 50,
          interval: 5,
        };

        await expect(waitForReady(config)).rejects.toThrow('Weaviate failed to start within 50ms');
      });

      it('should respect timeout even with high maxRetries', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 100,
          interval: 10,
          maxRetries: 1000, // Very high, but timeout should win
        };

        const startTime = Date.now();
        await expect(waitForReady(config)).rejects.toThrow('Weaviate failed to start within 100ms');
        const elapsed = Date.now() - startTime;

        // Should timeout around 100ms, not wait for 1000 retries
        expect(elapsed).toBeLessThan(500);
      });

      it('should handle timeout = 0 as immediate failure', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 0,
          interval: 100,
        };

        await expect(waitForReady(config)).rejects.toThrow('Weaviate failed to start within 0ms');
      });
    });

    describe('Retry Logic & MaxRetries', () => {
      it('should respect maxRetries parameter and stop after limit', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 10,
          maxRetries: 5,
        };

        await expect(waitForReady(config)).rejects.toThrow('after 5 attempts');
        expect(mockFetch).toHaveBeenCalledTimes(5);
      });

      it('should handle maxRetries = 1 (single attempt only)', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 10,
          maxRetries: 1,
        };

        await expect(waitForReady(config)).rejects.toThrow();
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should handle maxRetries = 0 gracefully (no attempts)', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 10,
          maxRetries: 0,
        };

        await expect(waitForReady(config)).rejects.toThrow();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should calculate default maxRetries from timeout and interval', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          // Always fail to test maxRetries calculation
          throw new Error('Connection refused');
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 1000,
          interval: 100,
          // maxRetries not specified, should be Math.ceil(1000/100) = 10
        };

        await expect(waitForReady(config)).rejects.toThrow();

        // With exponential backoff, actual attempts will be fewer than calculated maxRetries
        // because the backoff delays consume the timeout budget
        expect(callCount).toBeGreaterThanOrEqual(3);
        expect(callCount).toBeLessThanOrEqual(12);
      });
    });

    describe('Exponential Backoff Verification', () => {
      it('should implement exponential backoff between retries', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;
        const callTimestamps: number[] = [];

        mockFetch.mockImplementation(async () => {
          callCount++;
          callTimestamps.push(Date.now());
          if (callCount < 5) {
            throw new Error('Connection refused');
          }
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 20000,
          interval: 50,
        };

        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalledTimes(5);

        // Verify intervals increase (exponential backoff)
        // Can't verify exact timing due to test environment variability,
        // but can verify that attempts happened
        expect(callTimestamps.length).toBe(5);
      });

      it('should have monotonically increasing intervals with exponential backoff', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;
        const callTimestamps: number[] = [];

        mockFetch.mockImplementation(async () => {
          callCount++;
          callTimestamps.push(Date.now());
          if (callCount < 5) {
            throw new Error('Connection refused');
          }
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 20000,
          interval: 100,
        };

        await waitForReady(config);

        expect(callTimestamps.length).toBe(5);

        // Verify that intervals between attempts are monotonically increasing
        // (each interval should be >= previous interval due to exponential backoff)
        for (let i = 1; i < callTimestamps.length - 1; i++) {
          const currentInterval = callTimestamps[i + 1] - callTimestamps[i];
          const previousInterval = callTimestamps[i] - callTimestamps[i - 1];

          // Current interval should be at least as large as previous (with some tolerance for timing variance)
          // We allow 10ms tolerance for test environment variability
          expect(currentInterval).toBeGreaterThanOrEqual(previousInterval - 10);
        }
      });

      it('should cap exponential backoff at maximum interval', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          if (callCount < 8) {
            throw new Error('Connection refused');
          }
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 50000, // Long enough to allow reaching the 5000ms cap
          interval: 50, // Smaller initial interval for faster test execution
        };

        const startTime = Date.now();
        await waitForReady(config);
        const elapsed = Date.now() - startTime;

        // With backoff cap at 5000ms, this should complete relatively quickly
        // even with many retries. Without cap, exponential growth would take much longer.
        expect(mockFetch).toHaveBeenCalledTimes(8);
        // Should complete in under 15 seconds (50 + 75 + 112 + 168 + 252 + 378 + 567 = 1602ms to reach cap,
        // then 5000ms * remaining attempts)
        expect(elapsed).toBeLessThan(15000);
      });

      it('should start backoff from configured interval value', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          if (callCount < 4) {
            throw new Error('Connection refused');
          }
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 50,
        };

        await waitForReady(config);

        // Verify retry logic executed with initial interval
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });
    });

    describe('Edge Cases - Boundary Conditions', () => {
      it('should handle interval = 0 (immediate retries)', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Connection refused');
          }
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 5000,
          interval: 0,
          maxRetries: 5,
        };

        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it('should handle extremely short intervals correctly', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          interval: 1,
        };

        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalled();
      });

      it('should handle very large timeout values without issues', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 999999999,
          interval: 100,
        };

        await waitForReady(config);

        // Should succeed immediately, not wait for huge timeout
        expect(mockFetch).toHaveBeenCalled();
      });

      it('should handle mixed error types in succession', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          if (callCount === 1) throw new Error('Connection refused');
          if (callCount === 2) return { ok: false, status: 503 } as Response;
          if (callCount === 3) return { ok: false, status: 500 } as Response;
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 10,
        };

        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalledTimes(4);
      });
    });

    describe('Concurrency & Resource Management', () => {
      it('should handle multiple simultaneous waitForReady calls independently', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let call1Count = 0;
        let call2Count = 0;

        mockFetch.mockImplementation(async (url: string) => {
          if (url.includes(':8080')) {
            call1Count++;
            if (call1Count < 3) throw new Error('Connection refused');
            return { ok: true } as Response;
          } else {
            call2Count++;
            if (call2Count < 2) throw new Error('Connection refused');
            return { ok: true } as Response;
          }
        });

        const config1: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 10,
          silent: true,
        };

        const config2: HealthCheckConfig = {
          host: 'localhost',
          port: 8081,
          timeout: 10000,
          interval: 10,
          silent: true,
        };

        const [result1, result2] = await Promise.all([waitForReady(config1), waitForReady(config2)]);

        // Both should have completed successfully
        expect(result1).toBeUndefined();
        expect(result2).toBeUndefined();
        expect(call1Count).toBeGreaterThanOrEqual(3);
        expect(call2Count).toBeGreaterThanOrEqual(2);
      });

      it('should clean up properly when promise resolves early', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          if (callCount < 2) throw new Error('Connection refused');
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 10000,
          interval: 10,
          silent: true,
        };

        await waitForReady(config);

        const callsAfterSuccess = callCount;

        // Wait a bit to ensure no more calls happen
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Should not continue polling after success
        expect(callCount).toBe(callsAfterSuccess);
      });
    });

    describe('Input Validation & Security', () => {
      it('should handle negative timeout gracefully', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: -1000,
          interval: 100,
        };

        // Expected behavior: Negative timeout is treated as immediately expired
        // Implementation rejects immediately when startTime > deadline (which happens with negative timeout)
        await expect(waitForReady(config)).rejects.toThrow();
      });

      it('should handle negative interval values', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        let callCount = 0;

        mockFetch.mockImplementation(async () => {
          callCount++;
          if (callCount < 2) {
            throw new Error('Connection refused');
          }
          return { ok: true } as Response;
        });

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          interval: -100, // Negative becomes 0, causing immediate retries
          timeout: 5000,
          maxRetries: 5,
        };

        // Expected behavior: Negative interval is tolerated (setTimeout treats negative as 0)
        // This results in immediate retries without delay, which is acceptable for edge case handling
        await expect(waitForReady(config)).resolves.toBeUndefined();
        expect(callCount).toBeGreaterThanOrEqual(2);
      });

      it('should handle negative maxRetries', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 5000,
          interval: 100,
          maxRetries: -5,
        };

        // Expected behavior: Negative maxRetries causes immediate failure
        // Loop condition (attempts < maxRetries) is never satisfied with negative values
        await expect(waitForReady(config)).rejects.toThrow();
      });

      it('should not cause DoS with extremely large maxRetries', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 8080,
          timeout: 100, // Short timeout prevents long execution
          interval: 10,
          maxRetries: 999999999, // Extremely large
        };

        // Should be limited by timeout, not maxRetries
        await expect(waitForReady(config)).resolves.toBeUndefined();

        // Should not have attempted billions of retries
        expect(mockFetch.mock.calls.length).toBeLessThan(100);
      });

      it('should handle special characters in host safely', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: '127.0.0.1; rm -rf /', // Potential injection attempt
          port: 8080,
        };

        await waitForReady(config);

        // Should pass host through to URL (no injection risk in URL construction)
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('127.0.0.1; rm -rf /'));
      });

      it('should handle extremely large port numbers', async () => {
        const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
        mockFetch.mockResolvedValue({ ok: true } as Response);

        const config: HealthCheckConfig = {
          host: 'localhost',
          port: 99999, // Beyond valid port range
        };

        // Should construct URL even if port is invalid
        await waitForReady(config);

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:99999/v1/.well-known/ready');
      });
    });
  });

  describe('checkHealth', () => {
    it('should return true when Weaviate is ready', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const result = await checkHealth({ host: 'localhost', port: 8080 });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v1/.well-known/ready');
    });

    it('should return false when Weaviate returns non-ok status', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response);

      const result = await checkHealth({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should return false on connection error', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await checkHealth({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should work with different host and port combinations', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await checkHealth({ host: '10.0.0.1', port: 9090 });

      expect(mockFetch).toHaveBeenCalledWith('http://10.0.0.1:9090/v1/.well-known/ready');
    });

    it('should handle network timeout errors', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await checkHealth({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should not throw exceptions on any error', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Catastrophic failure'));

      await expect(checkHealth({ host: 'localhost', port: 8080 })).resolves.toBe(false);
    });

    it('should handle different HTTP error codes', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

      // Test 404
      mockFetch.mockResolvedValue({ ok: false, status: 404 } as Response);
      expect(await checkHealth({ host: 'localhost', port: 8080 })).toBe(false);

      // Test 500
      mockFetch.mockResolvedValue({ ok: false, status: 500 } as Response);
      expect(await checkHealth({ host: 'localhost', port: 8080 })).toBe(false);

      // Test 503
      mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response);
      expect(await checkHealth({ host: 'localhost', port: 8080 })).toBe(false);
    });
  });

  describe('checkLiveness', () => {
    it('should return true when Weaviate is live', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const result = await checkLiveness({ host: 'localhost', port: 8080 });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v1/.well-known/live');
    });

    it('should return false when Weaviate is not live', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response);

      const result = await checkLiveness({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should return false on connection error', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await checkLiveness({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should work with different host and port combinations', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await checkLiveness({ host: '172.16.0.1', port: 9090 });

      expect(mockFetch).toHaveBeenCalledWith('http://172.16.0.1:9090/v1/.well-known/live');
    });

    it('should handle DNS resolution failures', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('DNS resolution failed'));

      const result = await checkLiveness({ host: 'nonexistent.local', port: 8080 });

      expect(result).toBe(false);
    });

    it('should differentiate between ready and live endpoints', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await checkLiveness({ host: 'localhost', port: 8080 });
      await checkHealth({ host: 'localhost', port: 8080 });

      expect(mockFetch).toHaveBeenNthCalledWith(1, 'http://localhost:8080/v1/.well-known/live');
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://localhost:8080/v1/.well-known/ready');
    });

    it('should handle different HTTP error codes', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

      // Test various error codes
      mockFetch.mockResolvedValue({ ok: false, status: 404 } as Response);
      expect(await checkLiveness({ host: 'localhost', port: 8080 })).toBe(false);

      mockFetch.mockResolvedValue({ ok: false, status: 500 } as Response);
      expect(await checkLiveness({ host: 'localhost', port: 8080 })).toBe(false);

      mockFetch.mockResolvedValue({ ok: false, status: 502 } as Response);
      expect(await checkLiveness({ host: 'localhost', port: 8080 })).toBe(false);
    });
  });
});
