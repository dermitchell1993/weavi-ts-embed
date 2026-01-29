/**
 * Health check utilities for Weaviate embedded server.
 *
 * This module provides functions to poll Weaviate's health endpoints until the server
 * is ready to accept connections.
 */

/**
 * Options for waiting for Weaviate to become ready.
 */
export interface WaitForReadyOptions {
  /**
   * Maximum time to wait for Weaviate to become ready (in milliseconds)
   * @default 30000
   */
  timeout?: number;

  /**
   * Initial time to wait between retry attempts (in milliseconds)
   * @default 500
   */
  retryInterval?: number;

  /**
   * Enable verbose logging of retry attempts
   * @default false
   */
  verbose?: boolean;

  /**
   * Enable exponential backoff for retry intervals
   * @default false
   */
  useExponentialBackoff?: boolean;

  /**
   * Maximum retry interval when using exponential backoff (in milliseconds)
   * @default 5000
   */
  maxRetryInterval?: number;
}

/**
 * Wait for Weaviate to become ready by polling its health endpoint.
 *
 * This function polls the `/v1/.well-known/ready` endpoint until it returns a successful
 * response, indicating that Weaviate is ready to accept connections.
 *
 * @param port The HTTP port Weaviate is running on
 * @param options Configuration options for the health check
 * @returns A Promise that resolves when Weaviate is ready
 * @throws Error if Weaviate doesn't become ready within the timeout period
 *
 * @example
 * ```typescript
 * // Simple usage with defaults
 * await waitForReady(8080);
 *
 * // With verbose logging
 * await waitForReady(8080, { verbose: true });
 *
 * // With exponential backoff for production resilience
 * await waitForReady(8080, {
 *   useExponentialBackoff: true,
 *   maxRetryInterval: 10000,
 *   verbose: true
 * });
 * ```
 */
export async function waitForReady(port: number, options: WaitForReadyOptions = {}): Promise<void> {
  const {
    timeout = 30000,
    retryInterval = 500,
    verbose = false,
    useExponentialBackoff = false,
    maxRetryInterval = 5000,
  } = options;

  const startTime = Date.now();
  const healthUrl = `http://localhost:${port}/v1/.well-known/ready`;
  let attemptCount = 0;

  if (verbose) {
    console.log(`[Health Check] Starting health check for Weaviate on port ${port}`);
    console.log(`[Health Check] Timeout: ${timeout}ms, Initial retry interval: ${retryInterval}ms`);
    if (useExponentialBackoff) {
      console.log(`[Health Check] Exponential backoff enabled (max: ${maxRetryInterval}ms)`);
    }
  }

  // eslint-disable-next-line no-await-in-loop
  while (Date.now() - startTime < timeout) {
    attemptCount += 1;

    if (verbose) {
      console.log(`⏳ Waiting for Weaviate... (attempt ${attemptCount})`);
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(healthUrl);
      if (response.ok) {
        console.log('✅ Weaviate is ready');
        if (verbose) {
          console.log(`[Health Check] Ready after ${attemptCount} attempts in ${Date.now() - startTime}ms`);
        }
        return;
      }

      if (verbose) {
        console.log(`[Health Check] Received non-OK response: ${response.status}`);
      }
    } catch (error) {
      // Connection refused - Weaviate not ready yet
      // This is expected during startup
      if (verbose) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`[Health Check] Connection attempt failed: ${errorMessage}`);
      }
    }

    // Calculate delay with optional exponential backoff
    let delay = retryInterval;
    if (useExponentialBackoff) {
      // Exponential backoff: interval * 2^(attempt - 1), capped at maxRetryInterval
      delay = Math.min(retryInterval * Math.pow(2, attemptCount - 1), maxRetryInterval);
      if (verbose) {
        console.log(`[Health Check] Next retry in ${delay}ms`);
      }
    }

    // Wait before next retry
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(
    `Weaviate failed to start within ${timeout}ms after ${attemptCount} attempts. Check logs for errors.`
  );
}

/**
 * Check if Weaviate is live by polling its liveness endpoint.
 *
 * This function checks the `/v1/.well-known/live` endpoint to verify that
 * Weaviate is running. Unlike the readiness check, this endpoint indicates
 * that the process is alive but may not be ready to accept traffic.
 *
 * @param port The HTTP port Weaviate is running on
 * @returns A Promise that resolves to true if Weaviate is live, false otherwise
 *
 * @example
 * ```typescript
 * const isLive = await checkLiveness(8080);
 * if (isLive) {
 *   console.log('Weaviate is alive');
 * }
 * ```
 */
export async function checkLiveness(port: number): Promise<boolean> {
  const liveUrl = `http://localhost:${port}/v1/.well-known/live`;

  try {
    const response = await fetch(liveUrl);
    return response.ok;
  } catch (error) {
    return false;
  }
}
