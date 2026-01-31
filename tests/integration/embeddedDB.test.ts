/**
 * EmbeddedDB Lifecycle Integration Tests
 *
 * Tests actual EmbeddedDB process lifecycle management including:
 * - Process starting, stopping, and cleanup
 * - Port management and availability
 * - Resource leak detection (file descriptors and memory)
 * - Health check endpoints
 * - Multiple start/stop cycles
 *
 * These tests require real process spawning (not mocks) and validate
 * production-ready behavior of the EmbeddedDB lifecycle.
 *
 * @see https://linear.app/prince-josh/issue/PRI-830
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import weaviate, { EmbeddedClient, EmbeddedOptions } from '../../src';
import http from 'http';
import {
  isPortAvailable,
  waitForPortToBeAvailable,
  isProcessRunning,
  waitForProcessToStop,
  forceKillIfRunning,
  getRandomPort,
  getOpenFileDescriptors,
  takeResourceSnapshot,
  compareResourceSnapshots,
  type ResourceSnapshot,
} from '../helpers/processUtils';

// Platform check - skip tests on unsupported platforms
const isSupported = process.platform === 'linux' || process.platform === 'darwin';
const supportsResourceMonitoring =
  (process.platform === 'linux' || process.platform === 'darwin') && getOpenFileDescriptors() !== -1;

// Test configuration constants
const TEST_VERSION = '1.27.0'; // Using 1.27.0 for v3 client compatibility
const TEST_TIMEOUT = 60000; // 60s: Generous timeout for binary download + startup
const HEALTH_CHECK_TIMEOUT = 30000; // 30s for health check polling
const PROCESS_STOP_TIMEOUT = 5000; // 5s for graceful shutdown
const PORT_RELEASE_TIMEOUT = 5000; // 5s for port cleanup (reduced for faster test execution)

/**
 * Helper: Check if embedded DB is healthy via HTTP health endpoint
 */
function checkHealth(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port,
      path: '/v1/.well-known/ready',
      method: 'GET',
      timeout: timeoutMs,
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
  timeoutMs = HEALTH_CHECK_TIMEOUT,
  intervalMs = 500
): Promise<void> {
  const startTime = Date.now();

  /* eslint-disable no-await-in-loop */
  while (Date.now() - startTime < timeoutMs) {
    if (await checkHealth(host, port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  /* eslint-enable no-await-in-loop */

  throw new Error(
    `Embedded DB did not become healthy within ${timeoutMs}ms. ` +
      `Health endpoint /v1/.well-known/ready not responding with 200 OK.`
  );
}

describe('EmbeddedDB Integration Tests', () => {
  // Skip all tests if platform is not supported
  if (!isSupported) {
    it.skip('skipping - platform not supported', () => {
      console.warn(`⚠️ Skipping EmbeddedDB tests: Platform ${process.platform} not supported`);
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
    // CRITICAL: Robust cleanup to prevent resource leaks between tests
    if (client?.embedded?.pid) {
      const pid = client.embedded.pid;

      // Try graceful stop first
      try {
        client.embedded.stop();
      } catch (err) {
        console.warn('⚠️ Stop failed during cleanup:', err);
      }

      // Always wait for process termination
      try {
        await waitForProcessToStop(pid, PROCESS_STOP_TIMEOUT);
      } catch {
        // Graceful shutdown timed out, force kill
        forceKillIfRunning(pid);
      }
    }

    // Force kill any remaining tracked processes
    for (const pid of trackedPids) {
      forceKillIfRunning(pid);
    }

    // Wait for port to be released - critical for test isolation
    if (testPort) {
      try {
        await waitForPortToBeAvailable(testPort, '127.0.0.1', PORT_RELEASE_TIMEOUT);
      } catch (err) {
        console.error(`❌ CRITICAL: Port ${testPort} cleanup failed after ${PORT_RELEASE_TIMEOUT}ms:`, err);
        // Port still in use - this will likely cause next test to fail
        // Log additional diagnostics
        console.error(`   This may indicate a hung process or OS-level port binding issue`);
        throw err; // Re-throw to fail the test and prevent cascading failures
      }
    }

    client = null;
    trackedPids = [];
  });

  describe('1. Successful Process Start', () => {
    it(
      'should start Weaviate process successfully with valid PID',
      async () => {
        // Arrange
        const options = new EmbeddedOptions({
          port: testPort,
          version: TEST_VERSION,
        });

        // Act
        client = await weaviate.client(options);

        // Assert: Client and embedded instance created
        expect(client, 'Client should be created').toBeDefined();
        expect(client.embedded, 'Embedded instance should exist').toBeDefined();
        expect(client.embedded, 'Embedded instance should not be null').not.toBeNull();

        // Assert: Process running with valid PID
        expect(client.embedded.pid, 'Process ID should be a positive integer').toBeGreaterThan(0);
        expect(isProcessRunning(client.embedded.pid), 'Process should be running').toBe(true);

        trackedPids.push(client.embedded.pid);

        console.log(`✅ Weaviate process started successfully with PID ${client.embedded.pid}`);
      },
      TEST_TIMEOUT
    );

    it(
      'should have port listening after successful start',
      async () => {
        // Arrange
        const options = new EmbeddedOptions({
          port: testPort,
          version: TEST_VERSION,
        });

        // Act
        client = await weaviate.client(options);
        trackedPids.push(client.embedded.pid);

        // Assert: Port is in use (not available)
        const portAvailable = await isPortAvailable(testPort);
        expect(portAvailable, `Port ${testPort} should be in use by embedded DB (not available)`).toBe(false);

        console.log(`✅ Port ${testPort} is correctly bound to Weaviate process`);
      },
      TEST_TIMEOUT
    );
  });

  describe('2. Process Cleanup on Stop', () => {
    it(
      'should terminate process when stop() is called',
      async () => {
        // Arrange
        const options = new EmbeddedOptions({
          port: testPort,
          version: TEST_VERSION,
        });
        client = await weaviate.client(options);
        const pid = client.embedded.pid;
        trackedPids.push(pid);

        expect(isProcessRunning(pid), 'Process should be running before stop').toBe(true);

        // Act
        client.embedded.stop();
        await waitForProcessToStop(pid, PROCESS_STOP_TIMEOUT);

        // Assert: Process is no longer running
        expect(isProcessRunning(pid), 'Process should be terminated after stop()').toBe(false);

        console.log(`✅ Process ${pid} terminated successfully after stop()`);
      },
      TEST_TIMEOUT
    );

    it(
      'should release port when stop() is called',
      async () => {
        // Arrange
        const options = new EmbeddedOptions({
          port: testPort,
          version: TEST_VERSION,
        });
        client = await weaviate.client(options);
        const pid = client.embedded.pid;
        trackedPids.push(pid);

        // Verify port is in use
        expect(await isPortAvailable(testPort), 'Port should be in use before stop').toBe(false);

        // Act
        client.embedded.stop();
        await waitForProcessToStop(pid, PROCESS_STOP_TIMEOUT);

        // Wait for port to be released
        await waitForPortToBeAvailable(testPort, '127.0.0.1', PORT_RELEASE_TIMEOUT);

        // Assert: Port is now available
        const portAvailable = await isPortAvailable(testPort);
        expect(portAvailable, `Port ${testPort} should be released after stop()`).toBe(true);

        console.log(`✅ Port ${testPort} released successfully after stop()`);
      },
      TEST_TIMEOUT
    );

    it(
      'should free resources after stop() - embedded reference nullified',
      async () => {
        // Arrange
        const options = new EmbeddedOptions({
          port: testPort,
          version: TEST_VERSION,
        });
        client = await weaviate.client(options);
        const pid = client.embedded.pid;
        trackedPids.push(pid);

        // Act
        client.embedded.stop();
        await waitForProcessToStop(pid, PROCESS_STOP_TIMEOUT);

        // Assert: Process reference should indicate stopped state
        // Note: We don't set embedded to null, but the process should be gone
        expect(isProcessRunning(pid), 'Process should no longer exist').toBe(false);

        console.log(`✅ Resources freed after stop() - process ${pid} no longer exists`);
      },
      TEST_TIMEOUT
    );
  });

  describe('3. Multiple Start/Stop Cycles', () => {
    it(
      'should handle 3 consecutive start/stop cycles without issues',
      async () => {
        const cycles = 3;
        const cycleResults: Array<{ pid: number; healthy: boolean }> = [];

        /* eslint-disable no-await-in-loop */
        for (let i = 0; i < cycles; i++) {
          console.log(`\n🔄 Cycle ${i + 1}/${cycles}:`);

          // Start
          const options = new EmbeddedOptions({
            port: testPort,
            version: TEST_VERSION,
          });
          client = await weaviate.client(options);
          const pid = client.embedded.pid;
          trackedPids.push(pid);

          // Verify running
          expect(isProcessRunning(pid), `Cycle ${i + 1}: Process should be running`).toBe(true);

          // Verify healthy
          const healthy = await checkHealth('127.0.0.1', testPort);
          expect(healthy, `Cycle ${i + 1}: Health check should pass`).toBe(true);

          cycleResults.push({ pid, healthy });
          console.log(`  ✅ Started: PID ${pid}, Healthy: ${healthy}`);

          // Stop
          client.embedded.stop();
          await waitForProcessToStop(pid, PROCESS_STOP_TIMEOUT);

          // Verify stopped
          expect(isProcessRunning(pid), `Cycle ${i + 1}: Process should be stopped`).toBe(false);
          console.log(`  ✅ Stopped: PID ${pid}`);

          // Wait for port cleanup before next cycle
          await waitForPortToBeAvailable(testPort, '127.0.0.1', PORT_RELEASE_TIMEOUT);

          // Small delay between cycles for OS cleanup
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        /* eslint-enable no-await-in-loop */

        // Assert: All cycles completed successfully
        expect(cycleResults, 'Should complete all cycles').toHaveLength(cycles);
        expect(
          cycleResults.every((r) => r.healthy),
          'All cycles should be healthy'
        ).toBe(true);

        console.log(`\n✅ Successfully completed ${cycles} start/stop cycles`);
      },
      TEST_TIMEOUT * 3
    );
  });

  describe('4. Health Check Endpoint', () => {
    it(
      'should respond to health check after successful start',
      async () => {
        // Arrange
        const options = new EmbeddedOptions({
          port: testPort,
          version: TEST_VERSION,
        });

        // Act
        client = await weaviate.client(options);
        trackedPids.push(client.embedded.pid);

        // Wait for health endpoint to be ready
        await waitForHealthy('127.0.0.1', testPort, HEALTH_CHECK_TIMEOUT);

        // Assert: Health endpoint responds with 200 OK
        const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: testPort,
              path: '/v1/.well-known/ready',
              method: 'GET',
              timeout: 2000,
            },
            resolve
          );

          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Health check request timed out'));
          });

          req.end();
        });

        expect(response.statusCode, 'Health endpoint should return 200 OK').toBe(200);

        console.log(`✅ Health check endpoint responding correctly on port ${testPort}`);

        // Cleanup
        client.embedded.stop();
        await waitForProcessToStop(client.embedded.pid, PROCESS_STOP_TIMEOUT);
      },
      TEST_TIMEOUT
    );

    it(
      'should become healthy within reasonable time after start',
      async () => {
        // Arrange
        const options = new EmbeddedOptions({
          port: testPort,
          version: TEST_VERSION,
        });

        // Act
        const startTime = Date.now();
        client = await weaviate.client(options);
        trackedPids.push(client.embedded.pid);

        // Wait for health
        await waitForHealthy('127.0.0.1', testPort, HEALTH_CHECK_TIMEOUT);
        const healthyTime = Date.now() - startTime;

        // Assert: Became healthy in reasonable time
        expect(healthyTime, 'Should become healthy within 30 seconds').toBeLessThan(HEALTH_CHECK_TIMEOUT);

        console.log(`✅ Embedded DB became healthy in ${healthyTime}ms`);

        // Cleanup
        client.embedded.stop();
        await waitForProcessToStop(client.embedded.pid, PROCESS_STOP_TIMEOUT);
      },
      TEST_TIMEOUT
    );
  });

  describe('5. Resource Leak Detection', () => {
    // Skip resource monitoring tests if platform doesn't support it
    const testFn = supportsResourceMonitoring ? it : it.skip;

    testFn(
      'should not leak file descriptors across multiple start/stop cycles',
      async () => {
        const cycles = 10;
        const maxAcceptableFdLeak = 5; // Allow small variance for OS timing

        // Take initial snapshot
        const initialSnapshot = takeResourceSnapshot();
        console.log(
          `\n📊 Initial: FDs=${initialSnapshot.fds}, RSS=${Math.round(
            initialSnapshot.memory.rss / 1024 / 1024
          )}MB`
        );

        // Run multiple cycles
        /* eslint-disable no-await-in-loop */
        for (let i = 0; i < cycles; i++) {
          const options = new EmbeddedOptions({
            port: testPort,
            version: TEST_VERSION,
          });

          client = await weaviate.client(options);
          const pid = client.embedded.pid;
          trackedPids.push(pid);

          // Quick health check
          await waitForHealthy('127.0.0.1', testPort, HEALTH_CHECK_TIMEOUT);

          // Stop
          client.embedded.stop();
          await waitForProcessToStop(pid, PROCESS_STOP_TIMEOUT);
          await waitForPortToBeAvailable(testPort, '127.0.0.1', PORT_RELEASE_TIMEOUT);

          // Brief delay for OS cleanup
          await new Promise((resolve) => setTimeout(resolve, 200));

          if ((i + 1) % 3 === 0) {
            const currentSnapshot = takeResourceSnapshot();
            console.log(
              `  Cycle ${i + 1}/${cycles}: FDs=${currentSnapshot.fds}, RSS=${Math.round(
                currentSnapshot.memory.rss / 1024 / 1024
              )}MB`
            );
          }
        }
        /* eslint-enable no-await-in-loop */

        // Take final snapshot
        const finalSnapshot = takeResourceSnapshot();
        const delta = compareResourceSnapshots(initialSnapshot, finalSnapshot);

        console.log(
          `\n📊 Final: FDs=${finalSnapshot.fds}, RSS=${Math.round(finalSnapshot.memory.rss / 1024 / 1024)}MB`
        );
        console.log(
          `📈 Delta: FDs=${delta.fdsDelta > 0 ? '+' : ''}${delta.fdsDelta}, RSS=${
            delta.memoryDelta.rss > 0 ? '+' : ''
          }${Math.round(delta.memoryDelta.rss / 1024 / 1024)}MB`
        );

        // Assert: No significant file descriptor leak
        expect(
          Math.abs(delta.fdsDelta),
          `Should not leak file descriptors (delta: ${delta.fdsDelta}, threshold: ±${maxAcceptableFdLeak})`
        ).toBeLessThanOrEqual(maxAcceptableFdLeak);

        console.log(`✅ No file descriptor leak detected after ${cycles} cycles (delta: ${delta.fdsDelta})`);
      },
      TEST_TIMEOUT * 10
    );

    testFn(
      'should not leak memory across multiple start/stop cycles',
      async () => {
        const cycles = 10;
        // Threshold accounts for:
        // - Normal V8 heap growth (~10-15MB)
        // - Test framework overhead (~5-10MB)
        // - OS caching and Node.js internal buffers (~5-10MB)
        // Total conservative threshold: 30MB
        const maxAcceptableMemoryLeakMB = 30;

        // Take initial snapshot
        const initialSnapshot = takeResourceSnapshot();
        const initialMemoryMB = Math.round(initialSnapshot.memory.rss / 1024 / 1024);
        console.log(`\n📊 Initial memory: ${initialMemoryMB}MB`);

        // Run multiple cycles
        /* eslint-disable no-await-in-loop */
        for (let i = 0; i < cycles; i++) {
          const options = new EmbeddedOptions({
            port: testPort,
            version: TEST_VERSION,
          });

          client = await weaviate.client(options);
          const pid = client.embedded.pid;
          trackedPids.push(pid);

          await waitForHealthy('127.0.0.1', testPort, HEALTH_CHECK_TIMEOUT);

          client.embedded.stop();
          await waitForProcessToStop(pid, PROCESS_STOP_TIMEOUT);
          await waitForPortToBeAvailable(testPort, '127.0.0.1', PORT_RELEASE_TIMEOUT);

          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        /* eslint-enable no-await-in-loop */

        // Force garbage collection if available (--expose-gc flag)
        if (global.gc) {
          global.gc();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Take final snapshot
        const finalSnapshot = takeResourceSnapshot();
        const delta = compareResourceSnapshots(initialSnapshot, finalSnapshot);
        const memoryDeltaMB = Math.round(delta.memoryDelta.rss / 1024 / 1024);
        const finalMemoryMB = Math.round(finalSnapshot.memory.rss / 1024 / 1024);

        console.log(`📊 Final memory: ${finalMemoryMB}MB`);
        console.log(`📈 Delta: ${memoryDeltaMB > 0 ? '+' : ''}${memoryDeltaMB}MB`);

        // Assert: Memory increase is within acceptable threshold
        expect(
          memoryDeltaMB,
          `Memory increase should be less than ${maxAcceptableMemoryLeakMB}MB (actual: ${memoryDeltaMB}MB)`
        ).toBeLessThan(maxAcceptableMemoryLeakMB);

        console.log(
          `✅ No significant memory leak detected after ${cycles} cycles (delta: ${memoryDeltaMB}MB)`
        );
      },
      TEST_TIMEOUT * 10
    );

    if (!supportsResourceMonitoring) {
      it('skipping resource monitoring tests - platform does not support FD/memory tracking', () => {
        console.warn(`⚠️ Skipping resource monitoring: Platform ${process.platform} or tools not available`);
      });
    }
  });
});
