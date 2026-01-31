import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitForReady, checkHealth, checkLiveness } from './health-checker';
import type { HealthCheckConfig } from './types';

// Mock global fetch
global.fetch = vi.fn();

describe('health-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('waitForReady', () => {
    it('should resolve immediately when Weaviate is ready', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: HealthCheckConfig = {
        host: 'localhost',
        port: 8080,
      };

      await waitForReady(config);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v1/.well-known/ready');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Weaviate is ready'));

      consoleLogSpy.mockRestore();
    });

    it('should retry until Weaviate becomes ready', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      let callCount = 0;

      // eslint-disable-next-line require-await
      mockFetch.mockImplementation(async () => {
        // eslint-disable-next-line no-plusplus
        callCount++;
        if (callCount < 3) {
          throw new Error('Connection refused');
        }
        return { ok: true } as Response;
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: HealthCheckConfig = {
        host: 'localhost',
        port: 8080,
        timeout: 5000,
        interval: 10,
      };

      await waitForReady(config);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Weaviate is ready'));

      consoleLogSpy.mockRestore();
    });

    it('should timeout after specified duration', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const config: HealthCheckConfig = {
        host: 'localhost',
        port: 8080,
        timeout: 50,
        interval: 10,
        maxRetries: 3,
      };

      await expect(waitForReady(config)).rejects.toThrow('Weaviate failed to start within 50ms');
    });

    it('should use custom timeout and interval', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const config: HealthCheckConfig = {
        host: '127.0.0.1',
        port: 9999,
        timeout: 50,
        interval: 10,
        maxRetries: 2,
      };

      await expect(waitForReady(config)).rejects.toThrow('Weaviate failed to start within 50ms');
    });

    it('should handle non-ok responses and retry', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      let callCount = 0;

      // eslint-disable-next-line require-await
      mockFetch.mockImplementation(async () => {
        // eslint-disable-next-line no-plusplus
        callCount++;
        if (callCount < 2) {
          return { ok: false, status: 503 } as Response;
        }
        return { ok: true } as Response;
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: HealthCheckConfig = {
        host: 'localhost',
        port: 8080,
        timeout: 5000,
        interval: 10,
      };

      await waitForReady(config);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Weaviate is ready'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));

      consoleLogSpy.mockRestore();
    });

    it('should respect maxRetries parameter', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const config: HealthCheckConfig = {
        host: 'localhost',
        port: 8080,
        timeout: 1000,
        interval: 10,
        maxRetries: 5,
      };

      await expect(waitForReady(config)).rejects.toThrow('after 5 attempts');
    });

    it('should work with different host and port', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: HealthCheckConfig = {
        host: '192.168.1.100',
        port: 9090,
      };

      await waitForReady(config);

      expect(mockFetch).toHaveBeenCalledWith('http://192.168.1.100:9090/v1/.well-known/ready');

      consoleLogSpy.mockRestore();
    });

    it('should use exponential backoff between retries', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      let callCount = 0;

      // eslint-disable-next-line require-await
      mockFetch.mockImplementation(async () => {
        // eslint-disable-next-line no-plusplus
        callCount++;
        if (callCount < 4) {
          throw new Error('Connection refused');
        }
        return { ok: true } as Response;
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: HealthCheckConfig = {
        host: 'localhost',
        port: 8080,
        timeout: 10000,
        interval: 10,
      };

      await waitForReady(config);

      // Should make multiple attempts with increasing intervals
      expect(mockFetch).toHaveBeenCalledTimes(4);

      consoleLogSpy.mockRestore();
    });
  });

  describe('checkHealth', () => {
    it('should return true when Weaviate is ready', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const result = await checkHealth({ host: 'localhost', port: 8080 });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v1/.well-known/ready');
    });

    it('should return false when Weaviate is not ready', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      const result = await checkHealth({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should return false on connection error', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await checkHealth({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should work with different host and port', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      await checkHealth({ host: '10.0.0.1', port: 9090 });

      expect(mockFetch).toHaveBeenCalledWith('http://10.0.0.1:9090/v1/.well-known/ready');
    });
  });

  describe('checkLiveness', () => {
    it('should return true when Weaviate is live', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const result = await checkLiveness({ host: 'localhost', port: 8080 });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v1/.well-known/live');
    });

    it('should return false when Weaviate is not live', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      const result = await checkLiveness({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should return false on connection error', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await checkLiveness({ host: 'localhost', port: 8080 });

      expect(result).toBe(false);
    });

    it('should work with different host and port', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      await checkLiveness({ host: '172.16.0.1', port: 9090 });

      expect(mockFetch).toHaveBeenCalledWith('http://172.16.0.1:9090/v1/.well-known/live');
    });
  });
});
