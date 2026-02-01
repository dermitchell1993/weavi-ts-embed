/**
 * Process Utilities for Integration Testing
 *
 * Provides helper functions for process management, port checking,
 * and resource monitoring in integration tests.
 *
 * @module tests/helpers/processUtils
 */

import net from 'net';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Check if a port is available (not in use)
 * @param port - Port number to check
 * @param host - Host address (default: '127.0.0.1')
 * @returns Promise resolving to true if port is available
 */
export function isPortAvailable(port: number, host = '127.0.0.1'): Promise<boolean> {
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
 * Wait for a port to become available with timeout
 * Useful for cleanup validation after process termination
 *
 * @param port - Port number to wait for
 * @param host - Host address (default: '127.0.0.1')
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
 * @param intervalMs - Polling interval in milliseconds (default: 100)
 * @throws Error if port doesn't become available within timeout
 */
export async function waitForPortToBeAvailable(
  port: number,
  host = '127.0.0.1',
  timeoutMs = 5000,
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
 * Check if a process with given PID is running
 * @param pid - Process ID to check
 * @returns true if process exists and is running
 */
export function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    // ESRCH = process doesn't exist, so return false
    // EPERM = process exists but we lack permissions, so return true
    return err.code === 'EPERM';
  }
}

/**
 * Wait for a process to terminate
 * @param pid - Process ID to wait for
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @param intervalMs - Polling interval (default: 100ms)
 * @throws Error if process doesn't terminate within timeout
 */
export async function waitForProcessToStop(pid: number, timeoutMs = 5000, intervalMs = 100): Promise<void> {
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
 * Force kill a process if it's still running
 * Used for cleanup in test teardown
 * @param pid - Process ID to kill
 */
export function forceKillIfRunning(pid: number): void {
  if (isProcessRunning(pid)) {
    try {
      process.kill(pid, 'SIGKILL');
      console.warn(`⚠️ Force killed process ${pid} during cleanup`);
    } catch (err) {
      // Process already gone, ignore
    }
  }
}

/**
 * Get the number of open file descriptors for a process
 * Platform-specific implementation:
 * - Linux: reads /proc/{pid}/fd directory
 * - macOS: uses lsof command
 * - Windows: not supported, returns -1
 *
 * @param pid - Process ID to check
 * @returns Number of open file descriptors, or -1 if unavailable
 */
export function getOpenFileDescriptors(pid?: number): number {
  const targetPid = pid || process.pid;

  try {
    if (process.platform === 'linux') {
      // Linux: count files in /proc/{pid}/fd
      const fdPath = `/proc/${targetPid}/fd`;
      /* eslint-disable-next-line no-sync */
      if (!fs.existsSync(fdPath)) {
        return -1;
      }
      /* eslint-disable-next-line no-sync */
      const fds = fs.readdirSync(fdPath);
      return fds.length;
    } else if (process.platform === 'darwin') {
      // macOS: use lsof to count file descriptors
      try {
        const output = execSync(`lsof -p ${targetPid} 2>/dev/null | wc -l`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        // Subtract 1 for the header line
        const count = parseInt(output.trim(), 10) - 1;
        return count > 0 ? count : 0;
      } catch {
        // lsof command failed or not available
        return -1;
      }
    }
    // Windows or other platforms: not supported
    return -1;
  } catch (err) {
    console.warn(`⚠️ Could not get file descriptors for PID ${targetPid}:`, err);
    return -1;
  }
}

/**
 * Get memory usage for a process
 * @param pid - Process ID to check (defaults to current process)
 * @returns Object with memory metrics in bytes, or null if unavailable
 */
export function getProcessMemoryUsage(pid?: number): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
} | null {
  const targetPid = pid || process.pid;

  // For the current process, we can use process.memoryUsage()
  if (targetPid === process.pid) {
    return process.memoryUsage();
  }

  try {
    if (process.platform === 'linux') {
      // Linux: read /proc/{pid}/status
      const statusPath = `/proc/${targetPid}/status`;
      /* eslint-disable-next-line no-sync */
      if (!fs.existsSync(statusPath)) {
        return null;
      }

      /* eslint-disable-next-line no-sync */
      const content = fs.readFileSync(statusPath, 'utf-8');
      const vmRssMatch = content.match(/VmRSS:\s+(\d+)\s+kB/);

      if (vmRssMatch) {
        const rssKb = parseInt(vmRssMatch[1], 10);
        return {
          rss: rssKb * 1024, // Convert kB to bytes
          heapTotal: 0, // Not available for external processes
          heapUsed: 0,
          external: 0,
        };
      }
    } else if (process.platform === 'darwin') {
      // macOS: use ps command to get RSS
      try {
        const output = execSync(`ps -o rss= -p ${targetPid}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const rssKb = parseInt(output.trim(), 10);
        if (!isNaN(rssKb)) {
          return {
            rss: rssKb * 1024, // Convert kB to bytes
            heapTotal: 0,
            heapUsed: 0,
            external: 0,
          };
        }
      } catch {
        return null;
      }
    }
    return null;
  } catch (err) {
    console.warn(`⚠️ Could not get memory usage for PID ${targetPid}:`, err);
    return null;
  }
}

/**
 * Get a random available port
 * Useful for tests to avoid port conflicts
 * @returns Promise resolving to an available port number
 */
/**
 * Get a random available port from the OS with retry logic
 * 
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns Promise resolving to an available port number
 * @throws Error if all retry attempts fail
 * 
 * @example
 * const port = await getRandomPort();
 * console.log(`Allocated port: ${port}`);
 */
export async function getRandomPort(maxRetries = 3): Promise<number> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await new Promise<number>((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, () => {
          const address = server.address() as net.AddressInfo;
          const { port } = address;
          server.close(() => resolve(port));
        });
        server.on('error', reject);
      });
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      // Wait 100ms before retrying to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error('Failed to allocate port after retries');
}

/**
 * Weaviate internal port configuration for parallel test execution
 * 
 * Allocates unique ports for Weaviate's internal services to prevent conflicts
 * when running multiple instances in parallel:
 * - Main port: Weaviate HTTP API
 * - GRPC port: gRPC server (default 50051)
 * - Profiling port: pprof debug server (default 6060)
 * 
 * @returns Promise resolving to port configuration object
 * 
 * @example
 * const ports = await getWeaviateInternalPorts();
 * const client = await connectToEmbedded({
 *   port: ports.main,
 *   grpcPort: ports.grpc,
 *   env: {
 *     GO_PROFILING_PORT: String(ports.profiling),
 *   },
 * });
 */
export async function getWeaviateInternalPorts(): Promise<{
  main: number;
  grpc: number;
  profiling: number;
}> {
  const [main, grpc, profiling] = await Promise.all([
    getRandomPort(),
    getRandomPort(),
    getRandomPort(),
  ]);
  
  return { main, grpc, profiling };
}

/**
 * Resource snapshot for leak detection
 */
export interface ResourceSnapshot {
  timestamp: number;
  fds: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

/**
 * Take a snapshot of current process resources
 * @param pid - Process ID to snapshot (defaults to current process)
 * @returns Resource snapshot
 */
export function takeResourceSnapshot(pid?: number): ResourceSnapshot {
  const memory = getProcessMemoryUsage(pid) || {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
  };

  return {
    timestamp: Date.now(),
    fds: getOpenFileDescriptors(pid),
    memory,
  };
}

/**
 * Compare two resource snapshots and return the delta
 * @param before - Initial snapshot
 * @param after - Final snapshot
 * @returns Object with resource deltas
 */
export function compareResourceSnapshots(
  before: ResourceSnapshot,
  after: ResourceSnapshot
): {
  fdsDelta: number;
  memoryDelta: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timeDelta: number;
} {
  return {
    fdsDelta: after.fds === -1 || before.fds === -1 ? 0 : after.fds - before.fds,
    memoryDelta: {
      rss: after.memory.rss - before.memory.rss,
      heapTotal: after.memory.heapTotal - before.memory.heapTotal,
      heapUsed: after.memory.heapUsed - before.memory.heapUsed,
      external: after.memory.external - before.memory.external,
    },
    timeDelta: after.timestamp - before.timestamp,
  };
}
