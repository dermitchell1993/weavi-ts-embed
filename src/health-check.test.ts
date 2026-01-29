import { waitForReady, checkLiveness } from './health-check';

// Mock global fetch
global.fetch = jest.fn();

describe('health-check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('waitForReady', () => {
    it('should resolve immediately when Weaviate is ready', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await waitForReady(8080);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v1/.well-known/ready');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Weaviate is ready');

      consoleLogSpy.mockRestore();
    });

    it('should retry until Weaviate becomes ready', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
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

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Use a short retry interval for faster test execution
      await waitForReady(8080, { timeout: 5000, retryInterval: 50 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Weaviate is ready');

      consoleLogSpy.mockRestore();
    });

    it('should timeout after specified duration', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      // Use a short timeout for faster test execution
      await expect(waitForReady(8080, { timeout: 100, retryInterval: 20 })).rejects.toThrow(
        'Weaviate failed to start within 100ms'
      );
    });

    it('should use custom timeout and retry interval', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      // Use a short timeout for faster test execution
      await expect(waitForReady(8080, { timeout: 150, retryInterval: 50 })).rejects.toThrow(
        'Weaviate failed to start within 150ms'
      );
    });

    it('should handle non-ok responses and retry', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
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

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Use a short retry interval for faster test execution
      await waitForReady(8080, { timeout: 5000, retryInterval: 50 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Weaviate is ready');

      consoleLogSpy.mockRestore();
    });

    it('should respect timeout parameter', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      // Test that timeout parameter is respected
      await expect(waitForReady(8080, { timeout: 200, retryInterval: 50 })).rejects.toThrow(
        'Weaviate failed to start within 200ms'
      );
    });

    it('should use default retry interval of 500ms', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
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

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Use a short retry interval for faster test execution
      await waitForReady(8080, { timeout: 5000, retryInterval: 50 });

      expect(mockFetch).toHaveBeenCalledTimes(3);

      consoleLogSpy.mockRestore();
    });

    it('should work with different port numbers', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await waitForReady(9090);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:9090/v1/.well-known/ready');

      consoleLogSpy.mockRestore();
    });

    it('should log verbose messages when verbose option is enabled', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      let callCount = 0;

      // eslint-disable-next-line require-await
      mockFetch.mockImplementation(async () => {
        // eslint-disable-next-line no-plusplus
        callCount++;
        if (callCount < 2) {
          throw new Error('Connection refused');
        }
        return { ok: true } as Response;
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await waitForReady(8080, { timeout: 5000, retryInterval: 50, verbose: true });

      // Verify verbose logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Health Check] Starting health check for Weaviate on port 8080')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⏳ Waiting for Weaviate...'));
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Weaviate is ready');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[Health Check] Ready after'));

      consoleLogSpy.mockRestore();
    });

    it('should use exponential backoff when enabled', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      let callCount = 0;
      const delays: number[] = [];
      let lastTime = Date.now();

      // eslint-disable-next-line require-await
      mockFetch.mockImplementation(async () => {
        const now = Date.now();
        if (callCount > 0) {
          delays.push(now - lastTime);
        }
        lastTime = now;

        // eslint-disable-next-line no-plusplus
        callCount++;
        if (callCount < 4) {
          throw new Error('Connection refused');
        }
        return { ok: true } as Response;
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await waitForReady(8080, {
        timeout: 10000,
        retryInterval: 100,
        useExponentialBackoff: true,
        maxRetryInterval: 1000,
      });

      // Verify exponential backoff pattern
      // First delay: 100ms, second: 200ms, third: 400ms
      expect(delays.length).toBeGreaterThanOrEqual(2);
      // Allow some tolerance for timing
      expect(delays[0]).toBeGreaterThanOrEqual(90);
      expect(delays[1]).toBeGreaterThanOrEqual(180);

      consoleLogSpy.mockRestore();
    });

    it('should cap exponential backoff at maxRetryInterval', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockFetch.mockRejectedValue(new Error('Connection refused'));

      await expect(
        waitForReady(8080, {
          timeout: 200,
          retryInterval: 50,
          useExponentialBackoff: true,
          maxRetryInterval: 100,
          verbose: true,
        })
      ).rejects.toThrow('Weaviate failed to start within 200ms');

      // Check that the verbose logging shows capped intervals
      const calls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(calls).toContain('Next retry in');

      consoleLogSpy.mockRestore();
    });
  });

  describe('checkLiveness', () => {
    it('should return true when Weaviate is live', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      const result = await checkLiveness(8080);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/v1/.well-known/live');
    });

    it('should return false when Weaviate is not live', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      const result = await checkLiveness(8080);

      expect(result).toBe(false);
    });

    it('should return false on connection error', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await checkLiveness(8080);

      expect(result).toBe(false);
    });

    it('should work with different port numbers', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
      } as Response);

      await checkLiveness(9090);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:9090/v1/.well-known/live');
    });
  });
});
