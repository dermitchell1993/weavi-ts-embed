import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { checkPorts } from './port-utils';

export interface WeaviateProcessConfig {
  /**
   * Path to the Weaviate binary
   */
  binaryPath: string;

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
   * Additional environment variables to pass to the Weaviate process
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
 * @example
 * ```typescript
 * const weaviateProcess = new WeaviateProcess();
 *
 * await weaviateProcess.start({
 *   binaryPath: '/path/to/weaviate',
 *   port: 8080,
 *   grpcPort: 50051,
 *   persistenceDataPath: './data/weaviate',
 *   additionalEnvVars: {
 *     ENABLE_MODULES: 'text2vec-transformers',
 *   },
 * });
 *
 * // Later, when done:
 * await weaviateProcess.stop();
 * ```
 */
export class WeaviateProcess {
  private process: ChildProcess | null = null;
  private config: WeaviateProcessConfig | null = null;

  /**
   * Check if the Weaviate process is currently running
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Get the process ID of the running Weaviate process
   */
  getPid(): number | undefined {
    return this.process?.pid;
  }

  /**
   * Start the Weaviate process with the given configuration.
   *
   * This method will:
   * 1. Check if the required ports are available
   * 2. Spawn the Weaviate binary with appropriate environment variables
   * 3. Set up stdout/stderr capture for debugging
   * 4. Handle spawn errors gracefully
   *
   * @param config Configuration for the Weaviate process
   * @throws Error if ports are already in use
   * @throws Error if the binary fails to start
   * @throws Error if a process is already running
   */
  async start(config: WeaviateProcessConfig): Promise<void> {
    if (this.isRunning()) {
      throw new Error('Weaviate process is already running. Call stop() before starting again.');
    }

    // Check ports before attempting to spawn
    await checkPorts(config.port, config.grpcPort);

    this.config = config;

    // Resolve data path to absolute if relative
    const dataPath = config.persistenceDataPath || './data/weaviate';
    const resolvedDataPath = join(process.cwd(), dataPath);

    // Prepare environment variables
    const env = {
      ...process.env,
      WEAVIATE_PORT: config.port.toString(),
      GRPC_PORT: config.grpcPort.toString(),
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

    // Spawn the Weaviate process
    this.process = spawn(config.binaryPath, [], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false, // Keep process as part of the process group
    });

    // Capture stdout for debugging (only in verbose mode)
    if (config.verbose) {
      this.process.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[Weaviate] ${output}`);
        }
      });
    }

    // Always capture stderr for errors
    this.process.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[Weaviate Error] ${output}`);
      }
    });

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
   * This method will send a SIGTERM signal to the process and wait for it to exit.
   * If the process doesn't exit within the timeout, it will be forcefully killed.
   *
   * @param timeout Maximum time to wait for graceful shutdown (in milliseconds)
   * @default 10000 (10 seconds)
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
   * Get the current configuration of the Weaviate process
   */
  getConfig(): WeaviateProcessConfig | null {
    return this.config;
  }
}
