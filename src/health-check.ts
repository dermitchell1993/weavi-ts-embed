/**
 * Health check utilities for Weaviate embedded server.
 *
 * This module provides functions to poll Weaviate's health endpoints until the server
 * is ready to accept connections.
 */

/**
 * Wait for Weaviate to become ready by polling its health endpoint.
 *
 * This function polls the `/v1/.well-known/ready` endpoint until it returns a successful
 * response, indicating that Weaviate is ready to accept connections.
 *
 * @param port The HTTP port Weaviate is running on
 * @param timeout Maximum time to wait for Weaviate to become ready (in milliseconds)
 * @param retryInterval Time to wait between retry attempts (in milliseconds)
 * @returns A Promise that resolves when Weaviate is ready
 * @throws Error if Weaviate doesn't become ready within the timeout period
 *
 * @example
 * ```typescript
 * await waitForReady(8080);
 * console.log('Weaviate is ready!');
 * ```
 */
export async function waitForReady(port: number, timeout = 30000, retryInterval = 500): Promise<void> {
  const startTime = Date.now();
  const healthUrl = `http://localhost:${port}/v1/.well-known/ready`;

  // eslint-disable-next-line no-await-in-loop
  while (Date.now() - startTime < timeout) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(healthUrl);
      if (response.ok) {
        console.log('✅ Weaviate is ready');
        return;
      }
    } catch (error) {
      // Connection refused - Weaviate not ready yet
      // This is expected during startup, so we don't log it
    }

    // Wait before next retry
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }

  throw new Error(`Weaviate failed to start within ${timeout}ms. Check logs for errors.`);
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
