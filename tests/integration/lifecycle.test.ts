import { WeaviateProcess } from '../../src/weaviate-process';
import { BinaryManager } from '../../src/binary-manager';
import { checkPorts } from '../../src/port-utils';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

/**
 * Helper function to check if a process is running (cross-platform).
 * On Unix-like systems, uses process.kill(pid, 0).
 * On Windows, this check is less reliable, so we skip the assertion.
 *
 * @param pid Process ID to check
 * @returns true if process exists, false otherwise (or undefined on Windows)
 */
function isProcessRunning(pid: number): boolean | undefined {
  if (process.platform === 'win32') {
    // Windows: process.kill(pid, 0) is unreliable, skip the check
    return undefined;
  }

  try {
    // Unix-like systems: signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Integration tests for Weaviate process lifecycle management.
 *
 * These tests verify the complete lifecycle of the embedded Weaviate process,
 * including start, stop, signal handling, and resource cleanup.
 *
 * Note: These tests require an actual Weaviate binary to be present and will
 * interact with real system resources (ports, processes, file system).
 */
describe('WeaviateProcess Lifecycle Integration Tests', () => {
  let weaviateProcess: WeaviateProcess;
  let binaryManager: BinaryManager;
  let binaryPath: string | undefined;
  let testDataDir: string;
  let binaryAvailable = false;

  // Use a unique port range to avoid conflicts with other tests or services
  // Note: PR #15 uses 18080-18098, so we use 19080+ to avoid conflicts
  // Can be overridden via environment variables: TEST_PORT, TEST_GRPC_PORT
  const TEST_PORT = parseInt(process.env.TEST_PORT || '19080', 10);
  const TEST_GRPC_PORT = parseInt(process.env.TEST_GRPC_PORT || '51051', 10);

  // Increase timeout for integration tests as they involve real process operations
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Set up binary manager and check if Weaviate binary is available
    binaryManager = new BinaryManager();

    // Try to download/ensure Weaviate binary is available
    // Using a stable version for testing
    try {
      binaryPath = await binaryManager.ensureBinary('1.23.0');
      binaryAvailable = true;
      console.log(`Using Weaviate binary at: ${binaryPath}`);
    } catch (error) {
      console.error('Failed to download Weaviate binary:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));

      // If binary is unavailable, log warning but don't fail - tests will be skipped
      console.warn('⚠️  Weaviate binary unavailable - integration tests will be skipped');
      console.warn('💡 This may be due to:');
      console.warn('   - No internet connection');
      console.warn('   - GitHub releases unreachable');
      console.warn('   - BinaryManager.ensureBinary() implementation incomplete');
      console.warn('   - First run requiring download');

      binaryAvailable = false;
    }
  });

  beforeEach(() => {
    // Skip test setup if binary is not available - throw error to skip tests
    if (!binaryAvailable || !binaryPath) {
      throw new Error('Weaviate binary not available - skipping integration tests');
    }

    weaviateProcess = new WeaviateProcess();

    // Create a unique test data directory for each test
    testDataDir = join(tmpdir(), `weaviate-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    mkdirSync(testDataDir, { recursive: true });
  });

  afterEach(async () => {
    // Ensure process is stopped and cleaned up after each test
    if (weaviateProcess?.isRunning()) {
      try {
        await weaviateProcess.stop(5000);
      } catch (error) {
        console.error('Error stopping process in afterEach:', error);
      }
    }

    // Clean up test data directory
    try {
      rmSync(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up test data directory:', error);
    }
  });

  describe('Start Process Successfully', () => {
    it('should start the Weaviate process with valid configuration', async () => {
      // Verify ports are available before starting
      await expect(checkPorts(TEST_PORT, TEST_GRPC_PORT)).resolves.not.toThrow();

      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      expect(weaviateProcess.isRunning()).toBe(true);
      expect(weaviateProcess.getPid()).toBeDefined();
      expect(weaviateProcess.getPid()).toBeGreaterThan(0);
    });

    it('should fail to start if ports are already in use', async () => {
      // Start first process
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      expect(weaviateProcess.isRunning()).toBe(true);

      // Try to start second process with same ports
      const secondProcess = new WeaviateProcess();

      await expect(
        secondProcess.start({
          binaryPath: binaryPath!,
          port: TEST_PORT,
          grpcPort: TEST_GRPC_PORT,
          persistenceDataPath: join(testDataDir, 'second'),
          verbose: false,
        })
      ).rejects.toThrow(/port.*already in use/i);

      expect(secondProcess.isRunning()).toBe(false);
    });

    it('should prevent multiple start calls on the same instance', async () => {
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      expect(weaviateProcess.isRunning()).toBe(true);

      // Try to start again without stopping
      await expect(
        weaviateProcess.start({
          binaryPath: binaryPath!,
          port: TEST_PORT + 1,
          grpcPort: TEST_GRPC_PORT + 1,
          persistenceDataPath: testDataDir,
          verbose: false,
        })
      ).rejects.toThrow(/already running/i);
    });
  });

  describe('Stop Process Gracefully', () => {
    it('should stop the process gracefully with SIGTERM', async () => {
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      const pid = weaviateProcess.getPid();
      expect(weaviateProcess.isRunning()).toBe(true);

      // Stop the process
      await weaviateProcess.stop();

      expect(weaviateProcess.isRunning()).toBe(false);
      expect(weaviateProcess.getPid()).toBeUndefined();

      // Verify process is actually terminated (cross-platform)
      if (pid) {
        const stillRunning = isProcessRunning(pid);
        // On Windows, we skip this check as it's unreliable
        if (stillRunning !== undefined) {
          expect(stillRunning).toBe(false);
        }
      }
    });

    it('should handle stop() when no process is running', async () => {
      expect(weaviateProcess.isRunning()).toBe(false);

      // Should resolve without error
      await expect(weaviateProcess.stop()).resolves.not.toThrow();
    });

    it('should handle multiple stop() calls gracefully', async () => {
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      await weaviateProcess.stop();
      expect(weaviateProcess.isRunning()).toBe(false);

      // Second stop should not throw
      await expect(weaviateProcess.stop()).resolves.not.toThrow();
    });
  });

  describe('SIGTERM Handling', () => {
    it('should respond to SIGTERM and shutdown gracefully', async () => {
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      const pid = weaviateProcess.getPid();
      expect(pid).toBeDefined();
      expect(weaviateProcess.isRunning()).toBe(true);

      // Stop with explicit SIGTERM (default behavior)
      await weaviateProcess.stop(5000);

      expect(weaviateProcess.isRunning()).toBe(false);

      // Process should have exited within the timeout (cross-platform)
      if (pid) {
        const stillRunning = isProcessRunning(pid);
        if (stillRunning !== undefined) {
          expect(stillRunning).toBe(false);
        }
      }
    });
  });

  describe('SIGKILL Behavior', () => {
    it('should forcefully kill process if SIGTERM timeout is exceeded', async () => {
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      const pid = weaviateProcess.getPid();
      expect(pid).toBeDefined();

      // Use a very short timeout to force SIGKILL
      // In a real scenario, SIGTERM would time out and trigger SIGKILL
      await weaviateProcess.stop(100); // 100ms timeout

      expect(weaviateProcess.isRunning()).toBe(false);

      // Verify process was terminated (cross-platform)
      if (pid) {
        const stillRunning = isProcessRunning(pid);
        if (stillRunning !== undefined) {
          expect(stillRunning).toBe(false);
        }
      }
    });
  });

  describe('Resource Cleanup Verification', () => {
    it('should clean up all resources after stopping', async () => {
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      expect(weaviateProcess.isRunning()).toBe(true);
      const pid = weaviateProcess.getPid();

      await weaviateProcess.stop();

      // Verify process state is cleaned up
      expect(weaviateProcess.isRunning()).toBe(false);
      expect(weaviateProcess.getPid()).toBeUndefined();

      // Verify ports are released and can be reused
      await expect(checkPorts(TEST_PORT, TEST_GRPC_PORT)).resolves.not.toThrow();

      // Verify process is terminated (cross-platform)
      if (pid) {
        const stillRunning = isProcessRunning(pid);
        if (stillRunning !== undefined) {
          expect(stillRunning).toBe(false);
        }
      }
    });

    it('should allow starting a new process after stopping', async () => {
      // First lifecycle
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      const firstPid = weaviateProcess.getPid();
      await weaviateProcess.stop();

      // Second lifecycle - should succeed
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      const secondPid = weaviateProcess.getPid();

      expect(weaviateProcess.isRunning()).toBe(true);
      expect(secondPid).toBeDefined();
      expect(secondPid).not.toBe(firstPid); // Should be a different process
    });
  });

  describe('Restart Scenarios', () => {
    it('should support clean restart cycle', async () => {
      // Initial start
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      expect(weaviateProcess.isRunning()).toBe(true);

      // Stop
      await weaviateProcess.stop();
      expect(weaviateProcess.isRunning()).toBe(false);

      // Restart
      await weaviateProcess.start({
        binaryPath: binaryPath!,
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        persistenceDataPath: testDataDir,
        verbose: false,
      });

      expect(weaviateProcess.isRunning()).toBe(true);
    });
  });

  describe('Multiple Start/Stop Cycles', () => {
    it('should handle multiple start/stop cycles successfully', async () => {
      const cycles = 3;

      // Sequential testing is intentional here to verify lifecycle stability
      // eslint-disable-next-line no-await-in-loop
      for (let i = 0; i < cycles; i++) {
        // Start
        // eslint-disable-next-line no-await-in-loop
        await weaviateProcess.start({
          binaryPath: binaryPath!,
          port: TEST_PORT,
          grpcPort: TEST_GRPC_PORT,
          persistenceDataPath: testDataDir,
          verbose: false,
        });

        expect(weaviateProcess.isRunning()).toBe(true);
        expect(weaviateProcess.getPid()).toBeDefined();

        // Delay to ensure process is fully started (500ms for slower systems)
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Stop
        // eslint-disable-next-line no-await-in-loop
        await weaviateProcess.stop();

        expect(weaviateProcess.isRunning()).toBe(false);
        expect(weaviateProcess.getPid()).toBeUndefined();

        // Verify ports are released
        // eslint-disable-next-line no-await-in-loop
        await expect(checkPorts(TEST_PORT, TEST_GRPC_PORT)).resolves.not.toThrow();
      }
    });

    it('should maintain consistent behavior across multiple cycles', async () => {
      const cycles = 3;
      const pids: (number | undefined)[] = [];

      // Sequential testing is intentional here to verify lifecycle stability
      // eslint-disable-next-line no-await-in-loop
      for (let i = 0; i < cycles; i++) {
        // eslint-disable-next-line no-await-in-loop
        await weaviateProcess.start({
          binaryPath: binaryPath!,
          port: TEST_PORT,
          grpcPort: TEST_GRPC_PORT,
          persistenceDataPath: testDataDir,
          verbose: false,
        });

        const pid = weaviateProcess.getPid();
        pids.push(pid);

        expect(weaviateProcess.isRunning()).toBe(true);
        expect(pid).toBeDefined();
        expect(pid).toBeGreaterThan(0);

        // eslint-disable-next-line no-await-in-loop
        await weaviateProcess.stop();
      }

      // Verify each cycle used a different PID
      const uniquePids = new Set(pids);
      expect(uniquePids.size).toBe(cycles);
    });
  });
});
