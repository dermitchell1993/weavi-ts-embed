import { spawn, ChildProcess } from 'child_process';
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
   * Path where Weaviate should persist data
   * @default './data/weaviate'
   */
  persistenceDataPath?: string;

  /**
   * Additional environment variables to pass to the Weaviate process
   */
  additionalEnvVars?: Record<string, string>;
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

    // Prepare environment variables
    const env = {
      ...process.env,
      WEAVIATE_PORT: config.port.toString(),
      WEAVIATE_GRPC_PORT: config.grpcPort.toString(),
      PERSISTENCE_DATA_PATH: config.persistenceDataPath || './data/weaviate',
      ...config.additionalEnvVars,
    };

    console.log(`[WeaviateProcess] Starting Weaviate binary at ${config.binaryPath}`);
    console.log(`[WeaviateProcess] HTTP Port: ${config.port}`);
    console.log(`[WeaviateProcess] gRPC Port: ${config.grpcPort}`);
    console.log(`[WeaviateProcess] Data Path: ${env.PERSISTENCE_DATA_PATH}`);

    // Spawn the Weaviate process
    this.process = spawn(config.binaryPath, [], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false, // Keep process as part of the process group
    });

    // Capture stdout for debugging
    this.process.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Weaviate] ${output}`);
      }
    });

    // Capture stderr for debugging
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
      if (code !== null) {
        console.log(`[WeaviateProcess] Process exited with code ${code}`);
      } else if (signal !== null) {
        console.log(`[WeaviateProcess] Process terminated by signal ${signal}`);
      }
      this.process = null;
    });

    console.log(`[WeaviateProcess] Process started with PID ${this.process.pid}`);
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

    console.log(`[WeaviateProcess] Stopping process with PID ${this.process.pid}`);

    return new Promise<void>((resolve, reject) => {
      if (!this.process) {
        resolve();
        return;
      }

      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolved = true;
      };

      // Set up exit handler
      this.process.once('exit', () => {
        if (!resolved) {
          cleanup();
          console.log('[WeaviateProcess] Process stopped successfully');
          this.process = null;
          resolve();
        }
      });

      // Set up timeout for forceful kill
      timeoutId = setTimeout(() => {
        if (!resolved && this.process) {
          cleanup();
          console.warn('[WeaviateProcess] Graceful shutdown timed out, forcing kill');
          this.process.kill('SIGKILL');
          this.process = null;
          resolve();
        }
      }, timeout);

      // Send SIGTERM for graceful shutdown
      try {
        this.process.kill('SIGTERM');
      } catch (err) {
        cleanup();
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
