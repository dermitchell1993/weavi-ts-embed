/**
 * Process Manager for Weaviate TypeScript Embedded Client
 *
 * This module provides the WeaviateProcess class for managing the lifecycle of
 * a Weaviate server process. It handles spawning the binary with proper environment
 * configuration, capturing output, tracking process state, and graceful shutdown.
 *
 * Part of Wave 1: Core Implementation
 */

import { spawn, ChildProcess } from 'child_process';
import { join, isAbsolute } from 'path';
import type { ProcessConfig } from './types';

/**
 * Configuration for the WeaviateProcess manager.
 * Extends ProcessConfig with additional runtime options.
 */
export interface WeaviateProcessConfig extends Omit<ProcessConfig, 'args'> {
  /**
   * HTTP port for Weaviate
   * @default 8080
   */
  port: number;

  /**
   * gRPC port for Weaviate
   * @default 50051
   */
  grpcPort: number;

  /**
   * Path where Weaviate should persist data.
   *
   * **Important:** If a relative path is provided, it will be resolved relative
   * to the current working directory at the time the process starts. For predictable
   * behavior, consider using an absolute path.
   *
   * @default './data/weaviate' (relative to process.cwd())
   */
  persistenceDataPath?: string;

  /**
   * Additional environment variables to pass to the Weaviate process.
   * These will be merged with the base environment configuration.
   */
  additionalEnvVars?: Record<string, string>;

  /**
   * Enable verbose logging for debugging.
   * When false, only errors and critical messages are logged.
   * @default false
   */
  verbose?: boolean;
}

/**
 * Manages the lifecycle of a Weaviate process.
 *
 * This class handles spawning the Weaviate binary as a child process with proper
 * environment configuration, capturing stdout/stderr for debugging, and tracking
 * the process for later shutdown.
 *
 * **Features:**
 * - Spawns Weaviate binary with proper environment variables
 * - Captures stdout/stderr for debugging (configurable via verbose mode)
 * - Tracks process state (running, PID, configuration)
 * - Graceful shutdown with SIGTERM (+ SIGKILL fallback)
 * - Error handling for spawn failures
 *
 * @example
 * ```typescript
 * const processManager = new WeaviateProcess();
 *
 * await processManager.start({
 *   binaryPath: '/path/to/weaviate',
 *   port: 8080,
 *   grpcPort: 50051,
 *   persistenceDataPath: './data/weaviate',
 *   additionalEnvVars: {
 *     ENABLE_MODULES: 'text2vec-transformers',
 *   },
 *   verbose: true,
 * });
 *
 * // Later, when done:
 * await processManager.stop();
 * ```
 */
export class WeaviateProcess {
  private process: ChildProcess | null = null;
  private config: WeaviateProcessConfig | null = null;

  /**
   * Check if the Weaviate process is currently running.
   *
   * @returns true if process is running and not killed, false otherwise
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Get the process ID of the running Weaviate process.
   *
   * @returns Process ID if running, undefined otherwise
   */
  getPid(): number | undefined {
    return this.process?.pid;
  }

  /**
   * Start the Weaviate process with the given configuration.
   *
   * This method will:
   * 1. Validate that no process is already running
   * 2. Resolve the data path to an absolute path
   * 3. Prepare environment variables (ports, data path, custom vars)
   * 4. Spawn the Weaviate binary with the configured environment
   * 5. Set up stdout/stderr capture (if verbose mode enabled)
   * 6. Handle spawn errors and process exit events
   *
   * **Note:** This method does NOT perform port checking. That should be done
   * by the caller before invoking this method (see health check module).
   *
   * @param config Configuration for the Weaviate process
   * @throws Error if a process is already running
   */
  start(config: WeaviateProcessConfig): void {
    if (this.isRunning()) {
      throw new Error('Weaviate process is already running. Call stop() before starting again.');
    }

    this.config = config;

    // Resolve data path to absolute if relative
    const dataPath = config.persistenceDataPath || './data/weaviate';
    const resolvedDataPath = isAbsolute(dataPath) ? dataPath : join(process.cwd(), dataPath);

    // Prepare environment variables
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...config.env,
      WEAVIATE_PORT: config.port.toString(),
      WEAVIATE_GRPC_PORT: config.grpcPort.toString(),
      PERSISTENCE_DATA_PATH: resolvedDataPath,
      ...config.additionalEnvVars,
    };

    // Log startup info if verbose mode is enabled
    if (config.verbose) {
      console.log(`[WeaviateProcess] Starting Weaviate binary at ${config.binaryPath}`);
      console.log(`[WeaviateProcess] HTTP Port: ${config.port}`);
      console.log(`[WeaviateProcess] gRPC Port: ${config.grpcPort}`);
      console.log(`[WeaviateProcess] Data Path: ${resolvedDataPath}`);
    }

    // Spawn the Weaviate process with no command-line args (all config via env vars)
    this.process = spawn(config.binaryPath, [], {
      env,
      cwd: config.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false, // Keep process as part of the process group for cleanup
    });

    // Capture stdout for debugging (only in verbose mode)
    if (config.verbose && this.process.stdout) {
      this.process.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[Weaviate] ${output}`);
        }
      });
    }

    // Always capture stderr for errors
    if (this.process.stderr) {
      this.process.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.error(`[Weaviate Error] ${output}`);
        }
      });
    }

    // Handle process errors
    this.process.on('error', (err) => {
      console.error(`[WeaviateProcess] Process error: ${err.message}`);
      console.error(`[WeaviateProcess] Failed to start Weaviate: ${err.message}`);
      this.process = null;
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      if (config.verbose) {
        if (code !== null) {
          console.log(`[WeaviateProcess] Process exited with code ${code}`);
        } else if (signal !== null) {
          console.log(`[WeaviateProcess] Process terminated by signal ${signal}`);
        }
      }
      this.process = null;
    });

    if (config.verbose) {
      console.log(`[WeaviateProcess] Process started with PID ${this.process.pid}`);
    }
  }

  /**
   * Stop the Weaviate process gracefully.
   *
   * This method implements a two-stage shutdown process:
   * 1. Send SIGTERM for graceful shutdown (allows Weaviate to flush data, close connections)
   * 2. If process doesn't exit within timeout, send SIGKILL to force termination
   *
   * **Shutdown Flow:**
   * - SIGTERM → Wait up to `timeout` ms → SIGKILL (if needed)
   *
   * @param timeout Maximum time to wait for graceful shutdown (in milliseconds)
   * @default 10000 (10 seconds)
   * @returns Promise that resolves when process has stopped
   */
  stop(timeout = 10000): Promise<void> {
    if (!this.isRunning() || !this.process) {
      console.log('[WeaviateProcess] No process to stop');
      return Promise.resolve();
    }

    const verbose = this.config?.verbose ?? false;
    if (verbose) {
      console.log(`[WeaviateProcess] Stopping process with PID ${this.process.pid}`);
    }

    return new Promise<void>((resolve, reject) => {
      if (!this.process) {
        resolve();
        return;
      }

      let timeoutId: NodeJS.Timeout | null = null;
      let cleanedUp = false;

      const cleanup = (fromTimeout = false) => {
        // Prevent race condition by ensuring cleanup only happens once
        if (cleanedUp) {
          return;
        }
        cleanedUp = true;

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        // Only set process to null once during cleanup
        if (this.process) {
          this.process = null;
        }

        if (fromTimeout) {
          console.warn('[WeaviateProcess] Graceful shutdown timed out, forcing kill');
        } else if (verbose) {
          console.log('[WeaviateProcess] Process stopped successfully');
        }

        resolve();
      };

      // Set up exit handler
      this.process.once('exit', () => {
        cleanup(false);
      });

      // Set up timeout for forceful kill
      timeoutId = setTimeout(() => {
        if (!cleanedUp && this.process) {
          // Send SIGKILL before cleanup to ensure process is killed
          try {
            this.process.kill('SIGKILL');
          } catch {
            // Ignore errors if process already exited
          }
          cleanup(true);
        }
      }, timeout);

      // Send SIGTERM for graceful shutdown
      try {
        this.process.kill('SIGTERM');
      } catch (err) {
        // Don't call cleanup - we want to reject instead
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        cleanedUp = true; // Prevent race condition
        this.process = null;
        const error = err instanceof Error ? err : new Error(String(err));
        reject(new Error(`Failed to stop Weaviate process: ${error.message}`));
      }
    });
  }

  /**
   * Force kill the Weaviate process immediately without graceful shutdown.
   *
   * **Warning:** This sends SIGKILL which terminates the process immediately,
   * potentially causing data loss or corruption. Use only when:
   * - Normal stop() has failed
   * - You need immediate termination
   * - Data loss is acceptable
   *
   * @returns Promise that resolves when process has been killed
   */
  kill(): Promise<void> {
    if (!this.isRunning() || !this.process) {
      console.log('[WeaviateProcess] No process to kill');
      return Promise.resolve();
    }

    const verbose = this.config?.verbose ?? false;
    if (verbose) {
      console.warn(`[WeaviateProcess] Force killing process with PID ${this.process.pid}`);
    }

    return new Promise<void>((resolve, reject) => {
      if (!this.process) {
        resolve();
        return;
      }

      // Set up exit handler
      this.process.once('exit', () => {
        if (verbose) {
          console.log('[WeaviateProcess] Process killed successfully');
        }
        this.process = null;
        resolve();
      });

      // Send SIGKILL for immediate termination
      try {
        this.process.kill('SIGKILL');
      } catch (err) {
        this.process = null;
        const error = err instanceof Error ? err : new Error(String(err));
        reject(new Error(`Failed to kill Weaviate process: ${error.message}`));
      }
    });
  }

  /**
   * Clean up resources associated with the process manager.
   *
   * This is a convenience method that:
   * 1. Stops the process gracefully if running
   * 2. Clears the stored configuration
   *
   * Useful for teardown in tests or application shutdown handlers.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    if (this.isRunning()) {
      await this.stop();
    }
    this.config = null;
  }

  /**
   * Get the current configuration of the Weaviate process.
   *
   * @returns Configuration object if process has been started, null otherwise
   */
  getConfig(): WeaviateProcessConfig | null {
    return this.config;
  }
}
