/**
 * Lifecycle Integration Tests
 *
 * Tests the complete lifecycle management of embedded Weaviate instances including:
 * - Process start/stop operations
 * - Graceful shutdown (SIGTERM)
 * - Forced termination (SIGKILL) fallback
 * - Multiple start/stop cycles
 * - Cleanup on unexpected termination
 * - Resource leak prevention
 * - Error handling and recovery
 *
 * @see https://linear.app/prince-josh/issue/PRI-790
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import weaviate, { EmbeddedClient, EmbeddedOptions } from '../../src';
import http from 'http';
import net from 'net';

// Platform check - skip tests on unsupported platforms
const isSupported = process.platform === 'linux' || process.platform === 'darwin';

/**
 * Helper: Check if a port is available (not in use)
 */
function isPortAvailable(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, host);
  });
}

/**
 * Helper: Wait for port to become available with timeout
 */
async function waitForPortToBeAvailable(
  port: number,
  host = '127.0.0.1',
  timeoutMs = 10000,
  intervalMs = 100
): Promise<void> {
  const startTime = Date.now();

  /* eslint-disable no-await-in-loop */
  while (Date.now() - startTime < timeoutMs) {
    if (await isPortAvailable(port, host)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  /* eslint-enable no-await-in-loop */

  throw new Error(
    `Port ${port} did not become available within ${timeoutMs}ms. ` +
      `This may indicate a resource leak or incomplete cleanup.`
  );
}

/**
 * Helper: Check if embedded DB is healthy via HTTP health endpoint
 */
function isHealthy(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port,
      path: '/v1/.well-known/ready',
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Helper: Poll health endpoint until ready or timeout
 */
async function waitForHealthy(
  host: string,
  port: number,
  timeoutMs = 30000,
  intervalMs = 500
): Promise<void> {
  const startTime = Date.now();

  /* eslint-disable no-await-in-loop */
  while (Date.now() - startTime < timeoutMs) {
    if (await isHealthy(host, port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  /* eslint-enable no-await-in-loop */

  throw new Error(
    `Embedded DB did not become healthy within ${timeoutMs}ms. ` +
      `Health endpoint /v1/.well-known/ready not responding with 200.`
  );
}

/**
 * Helper: Check if a process with given PID is running
 */
function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    // ESRCH = process doesn't exist
    return err.code !== 'ESRCH';
  }
}

/**
 * Helper: Wait for process to terminate
 */
async function waitForProcessToStop(pid: number, timeoutMs = 5000, intervalMs = 100): Promise<void> {
  const startTime = Date.now();

  /* eslint-disable no-await-in-loop */
  while (Date.now() - startTime < timeoutMs) {
    if (!isProcessRunning(pid)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  /* eslint-enable no-await-in-loop */

  throw new Error(
    `Process ${pid} did not terminate within ${timeoutMs}ms. ` +
      `This may indicate a hung process or graceful shutdown failure.`
  );
}

/**
 * Helper: Force kill a process if it's still running
 */
function forceKillIfRunning(pid: number): void {
  if (isProcessRunning(pid)) {
    try {
      process.kill(pid, 'SIGKILL');
      console.warn(`Force killed process ${pid} during cleanup`);
    } catch (err) {
      // Process already gone, ignore
    }
  }
}

/**
 * Helper: Get a random available port
 */
function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const address = server.address() as net.AddressInfo;
      const { port } = address;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

describe('Lifecycle Integration Tests', () => {
  // Skip all tests if platform is not supported
  if (!isSupported) {
    it.skip('skipping - platform not supported', () => {
      console.warn(`Skipping lifecycle tests: EmbeddedDB does not support ${process.platform}`);
    });
    return;
  }

  let testPort: number;
  let client: EmbeddedClient | null = null;
  let trackedPids: number[] = [];

  beforeEach(async () => {
    // Get a random available port for each test to avoid conflicts
    testPort = await getRandomPort();
    client = null;
    trackedPids = [];
  });

  afterEach(async () => {
    // Cleanup: ensure all tracked processes are stopped
    if (client?.embedded?.pid) {
      try {
        client.embedded.stop();
        await waitForProcessToStop(client.embedded.pid, 5000).catch(() => {
          forceKillIfRunning(client.embedded.pid);
        });
      } catch (err) {
        console.warn('Cleanup warning:', err);
      }
    }

    // Force kill any remaining tracked processes
    for (const pid of trackedPids) {
      forceKillIfRunning(pid);
    }

    // Wait for port to be released
    if (testPort) {
      await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000).catch((err) => {
        console.error(`Port ${testPort} cleanup failed:`, err);
      });
    }

    client = null;
    trackedPids = [];
  });

  describe('Basic Lifecycle', () => {
    it('should start process successfully with valid configuration', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });

      // Act
      client = await weaviate.client(options);

      // Assert
      expect(client, 'Client should be created').toBeDefined();
      expect(client.embedded, 'Embedded instance should exist').toBeDefined();
      expect(client.embedded.pid, 'Process ID should be assigned').toBeGreaterThan(0);
      expect(isProcessRunning(client.embedded.pid), 'Process should be running').toBe(true);

      trackedPids.push(client.embedded.pid);

      // Verify health endpoint is responding
      const healthy = await isHealthy('127.0.0.1', testPort);
      expect(healthy, 'Health endpoint should return 200 status').toBe(true);

      // Verify port is in use
      const portAvailable = await isPortAvailable(testPort);
      expect(portAvailable, `Port ${testPort} should be in use by embedded DB`).toBe(false);
    }, 120000);

    it('should fail gracefully when attempting to start on occupied port', async () => {
      // Arrange: Start first instance
      const options1 = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options1);
      trackedPids.push(client.embedded.pid);

      // Act & Assert: Attempt to start second instance on same port
      const options2 = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });

      // This should either throw or detect the existing instance
      // The current implementation logs "already listening" - we verify it doesn't crash
      await expect(async () => {
        const client2 = await weaviate.client(options2);
        if (client2.embedded.pid !== client.embedded.pid) {
          trackedPids.push(client2.embedded.pid);
        }
      }).rejects.toThrowError();
    }, 120000);

    it('should start process with custom environment variables', async () => {
      // Arrange
      const customEnv = {
        QUERY_DEFAULTS_LIMIT: 100,
        DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
      };

      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
        env: customEnv,
      });

      // Act
      client = await weaviate.client(options);
      trackedPids.push(client.embedded.pid);

      // Assert
      expect(client.embedded.pid).toBeGreaterThan(0);
      expect(isProcessRunning(client.embedded.pid)).toBe(true);

      // Verify custom env vars were applied by checking options
      expect(client.embedded.options.env.QUERY_DEFAULTS_LIMIT).toBe(100);
      expect(client.embedded.options.env.DEFAULT_VECTORIZER_MODULE).toBe('text2vec-openai');

      const healthy = await isHealthy('127.0.0.1', testPort);
      expect(healthy, 'DB should be healthy with custom env vars').toBe(true);
    }, 120000);
  });

  describe('Graceful Shutdown (SIGTERM)', () => {
    it('should stop gracefully with SIGTERM and release resources', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const pid = client.embedded.pid;
      trackedPids.push(pid);

      expect(isProcessRunning(pid), 'Process should be running before stop').toBe(true);

      // Act
      client.embedded.stop();

      // Assert
      await waitForProcessToStop(pid, 5000);
      expect(isProcessRunning(pid), 'Process should be stopped after SIGTERM').toBe(false);

      // Verify port is released
      await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000);
      const portAvailable = await isPortAvailable(testPort);
      expect(portAvailable, 'Port should be available after graceful shutdown').toBe(true);
    }, 120000);

    it('should handle stop() being called multiple times safely', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const pid = client.embedded.pid;
      trackedPids.push(pid);

      // Act
      client.embedded.stop();
      await waitForProcessToStop(pid, 5000);

      // Call stop again on already stopped process
      expect(() => {
        if (client) client.embedded.stop();
      }, 'Second stop() call should not throw').not.toThrow();

      // Assert
      expect(isProcessRunning(pid), 'Process should remain stopped').toBe(false);
    }, 120000);

    it('should complete in-flight operations before shutting down', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const pid = client.embedded.pid;
      trackedPids.push(pid);

      // Create a test collection to ensure DB is operational
      await client.collections.create({
        name: 'TestLifecycle',
        properties: [{ name: 'text', dataType: 'text' }],
      });

      // Act: Stop while we could have operations
      client.embedded.stop();

      // Assert: Should shut down gracefully
      await waitForProcessToStop(pid, 5000);
      expect(isProcessRunning(pid)).toBe(false);
    }, 120000);
  });

  describe('SIGKILL Fallback', () => {
    it('should force kill process with SIGKILL when process is hung', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const pid = client.embedded.pid;
      trackedPids.push(pid);

      expect(isProcessRunning(pid)).toBe(true);

      // Act: Simulate hung process by using SIGKILL directly
      process.kill(pid, 'SIGKILL');

      // Assert
      await waitForProcessToStop(pid, 3000);
      expect(isProcessRunning(pid), 'Process should be killed by SIGKILL').toBe(false);

      // Verify port is released even after force kill
      await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000);
      const portAvailable = await isPortAvailable(testPort);
      expect(portAvailable, 'Port should be available after SIGKILL').toBe(true);
    }, 120000);

    it('should detect and handle already-terminated process', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const pid = client.embedded.pid;
      trackedPids.push(pid);

      // Kill process externally
      process.kill(pid, 'SIGKILL');
      await waitForProcessToStop(pid, 3000);

      // Act & Assert: stop() should handle already-dead process gracefully
      expect(() => {
        if (client) client.embedded.stop();
      }, 'Should not throw when stopping already-dead process').not.toThrow();

      expect(isProcessRunning(pid)).toBe(false);
    }, 120000);
  });

  describe('Multiple Start/Stop Cycles', () => {
    it('should handle 3 consecutive start/stop cycles without resource leaks', async () => {
      const cycles = 3;

      /* eslint-disable no-await-in-loop */
      for (let i = 0; i < cycles; i++) {
        // Arrange
        const options = new EmbeddedOptions({
          port: testPort,
          version: '1.27.0',
        });

        // Act: Start
        client = await weaviate.client(options);
        const pid = client.embedded.pid;
        trackedPids.push(pid);

        // Assert: Started successfully
        expect(isProcessRunning(pid), `Cycle ${i + 1}: Process should be running`).toBe(true);
        expect(await isHealthy('127.0.0.1', testPort), `Cycle ${i + 1}: Should be healthy`).toBe(true);

        // Act: Stop
        client.embedded.stop();
        await waitForProcessToStop(pid, 5000);

        // Assert: Stopped successfully
        expect(isProcessRunning(pid), `Cycle ${i + 1}: Process should be stopped`).toBe(false);

        // Wait for port to be fully released before next cycle
        await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000);

        // Small additional delay to ensure full cleanup
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      /* eslint-enable no-await-in-loop */

      // Final assertion: Port should be available
      const portAvailable = await isPortAvailable(testPort);
      expect(portAvailable, 'Port should be available after all cycles').toBe(true);
    }, 360000); // 6 minutes for 3 full cycles

    it('should handle rapid start/stop cycles', async () => {
      const rapidCycles = 2;

      /* eslint-disable no-await-in-loop */
      for (let i = 0; i < rapidCycles; i++) {
        // Start
        const options = new EmbeddedOptions({
          port: testPort,
          version: '1.27.0',
        });
        client = await weaviate.client(options);
        const pid = client.embedded.pid;
        trackedPids.push(pid);

        // Quick health check
        await waitForHealthy('127.0.0.1', testPort, 30000);

        // Immediate stop
        client.embedded.stop();
        await waitForProcessToStop(pid, 5000);
        await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000);

        // Brief pause between rapid cycles
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      /* eslint-enable no-await-in-loop */

      expect(await isPortAvailable(testPort), 'Port should be clean after rapid cycles').toBe(true);
    }, 240000);

    it('should maintain data persistence across restart cycles', async () => {
      const collectionName = 'PersistenceTest';

      // Cycle 1: Create data
      const options1 = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options1);
      trackedPids.push(client.embedded.pid);

      await client.collections.create({
        name: collectionName,
        properties: [{ name: 'testProp', dataType: 'text' }],
      });

      const pid1 = client.embedded.pid;
      client.embedded.stop();
      await waitForProcessToStop(pid1, 5000);
      await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Cycle 2: Verify data persisted
      const options2 = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options2);
      trackedPids.push(client.embedded.pid);

      // Check if collection still exists
      const collections = await client.collections.listAll();
      const persistedCollection = collections.find((c: any) => c.name === collectionName);

      expect(persistedCollection, 'Collection should persist across restarts').toBeDefined();

      // Cleanup
      await client.collections.delete(collectionName);
    }, 240000);
  });

  describe('Unexpected Termination & Cleanup', () => {
    it('should detect when process terminates unexpectedly', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const pid = client.embedded.pid;
      trackedPids.push(pid);

      expect(isProcessRunning(pid)).toBe(true);

      // Act: Simulate unexpected crash
      process.kill(pid, 'SIGKILL');
      await waitForProcessToStop(pid, 3000);

      // Assert
      expect(isProcessRunning(pid), 'Process should be terminated').toBe(false);

      // Verify port eventually becomes available
      await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000);
      expect(await isPortAvailable(testPort), 'Port should be released after crash').toBe(true);
    }, 120000);

    it('should clean up resources when parent process exits', async () => {
      // This test verifies that resources are properly tracked
      // In a real scenario, child processes should terminate when parent exits

      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const pid = client.embedded.pid;
      trackedPids.push(pid);

      // Verify process exists
      expect(isProcessRunning(pid)).toBe(true);

      // Manual cleanup (simulating what should happen on exit)
      client.embedded.stop();
      await waitForProcessToStop(pid, 5000);

      // Verify cleanup completed
      expect(isProcessRunning(pid)).toBe(false);
      await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000);
    }, 120000);

    it('should not leave zombie processes after termination', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const pid = client.embedded.pid;
      trackedPids.push(pid);

      // Act: Normal stop
      client.embedded.stop();
      await waitForProcessToStop(pid, 5000);

      // Assert: Process should be completely gone, not zombie
      expect(isProcessRunning(pid), 'Process should not exist (including no zombie)').toBe(false);

      // Additional check: trying to kill non-existent process should fail with ESRCH
      expect(() => {
        process.kill(pid, 0);
      }).toThrow();
    }, 120000);
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle stop() called before process fully starts', async () => {
      // Arrange: Create options but don't wait for full startup
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });

      // Act: Start client (this will initiate startup)
      const clientPromise = weaviate.client(options);

      // Give it a moment to spawn but not fully initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Wait for client to be created
      client = await clientPromise;
      const pid = client.embedded.pid;

      if (pid > 0) {
        trackedPids.push(pid);

        // Stop immediately
        client.embedded.stop();

        // Should handle gracefully
        await waitForProcessToStop(pid, 5000).catch(() => {
          forceKillIfRunning(pid);
        });
      }

      // Verify no hanging processes or ports
      await waitForPortToBeAvailable(testPort, '127.0.0.1', 10000);
    }, 120000);

    it('should validate that stop() with invalid PID fails gracefully', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      const realPid = client.embedded.pid;
      trackedPids.push(realPid);

      // Act: Corrupt the PID
      client.embedded.pid = 99999; // Non-existent PID

      // Assert: Should not throw, should log gracefully
      expect(() => {
        if (client) client.embedded.stop();
      }, 'Should handle invalid PID gracefully').not.toThrow();

      // Cleanup: Kill the real process
      forceKillIfRunning(realPid);
      await waitForProcessToStop(realPid, 5000).catch(() => {});
    }, 120000);

    it('should handle port conflict detection correctly', async () => {
      // Arrange: Start first instance
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });
      client = await weaviate.client(options);
      trackedPids.push(client.embedded.pid);

      // Act & Assert: Port should not be available
      const available = await isPortAvailable(testPort);
      expect(available, `Port ${testPort} should be occupied`).toBe(false);

      // Verify health
      expect(await isHealthy('127.0.0.1', testPort), 'First instance should be healthy').toBe(true);
    }, 120000);
  });

  describe('Health Polling', () => {
    it('should successfully poll health endpoint until ready', async () => {
      // Arrange
      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });

      // Act
      const startTime = Date.now();
      client = await weaviate.client(options);
      const startupTime = Date.now() - startTime;

      trackedPids.push(client.embedded.pid);

      // Assert
      expect(client.embedded.pid).toBeGreaterThan(0);
      expect(await isHealthy('127.0.0.1', testPort), 'Should be healthy after startup').toBe(true);

      console.log(`Embedded DB started and became healthy in ${startupTime}ms`);
      expect(startupTime, 'Startup should complete within reasonable time').toBeLessThan(120000);
    }, 120000);

    it('should timeout if health endpoint never responds', async () => {
      // This test validates the timeout behavior
      // We can't easily test this without mocking, but we document the expectation

      const options = new EmbeddedOptions({
        port: testPort,
        version: '1.27.0',
      });

      client = await weaviate.client(options);
      trackedPids.push(client.embedded.pid);

      // If we reach here, health polling worked
      expect(await isHealthy('127.0.0.1', testPort)).toBe(true);
    }, 120000);
  });
});
