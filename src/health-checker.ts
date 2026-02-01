/**
 * Health check utilities for Weaviate embedded server.
 *
 * This module provides functions to poll Weaviate's health endpoints until the server
 * is ready to accept connections. Part of Wave 1: Core Implementation.
 *
 * @module health-checker
 */

import type { HealthCheckConfig } from './types';

/**
 * Wait for Weaviate to become ready by polling its health endpoint.
 *
 * This function polls the `/v1/.well-known/ready` endpoint until it returns a successful
 * response, indicating that Weaviate is ready to accept connections. Uses exponential
 * backoff by default for production resilience.
 *
 * @param config - Health check configuration
 * @returns A Promise that resolves when Weaviate is ready
 * @throws Error if Weaviate doesn't become ready within the timeout period
 *
 * @example
 * ```typescript
 * // Simple usage with defaults
 * await waitForReady({ host: 'localhost', port: 8080 });
 *
 * // With custom configuration
 * await waitForReady({
 *   host: '127.0.0.1',
 *   port: 8080,
 *   timeout: 60000,
 *   interval: 1000,
 *   maxRetries: 60
 * });
 * ```
 */
export async function waitForReady(config: HealthCheckConfig): Promise<void> {
  const {
    host,
    port,
    timeout = 30000,
    interval = 500,
    maxRetries = Math.ceil(timeout / interval),
    silent = false,
  } = config;

  const startTime = Date.now();
  const healthUrl = `http://${host}:${port}/v1/.well-known/ready`;
  let attemptCount = 0;
  let currentInterval = interval;

  if (!silent) {
    console.log(`[Health Check] Waiting for Weaviate at ${host}:${port}...`);
  }

  // eslint-disable-next-line no-await-in-loop
  while (attemptCount < maxRetries && Date.now() - startTime < timeout) {
    // eslint-disable-next-line no-plusplus
    attemptCount++;

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(healthUrl);
      if (response.ok) {
        const elapsed = Date.now() - startTime;
        if (!silent) {
          console.log(`✅ Weaviate is ready (${attemptCount} attempts, ${elapsed}ms)`);
        }
        return;
      }

      // Non-OK response - server is up but not ready
      if (!silent) {
        console.log(`⏳ Weaviate not ready yet (HTTP ${response.status})`);
      }
    } catch (error) {
      // Connection refused - server not up yet (expected during startup)
      // Silently continue retrying
    }

    // Exponential backoff with cap at 5 seconds
    currentInterval = Math.min(currentInterval * 1.5, 5000);
    // eslint-disable-next-line no-await-in-loop, no-loop-func
    await new Promise((resolve) => setTimeout(resolve, currentInterval));
  }

  const elapsed = Date.now() - startTime;
  if (!silent) {
    console.log(`❌ Health check timed out after ${elapsed}ms (${attemptCount} attempts)`);
  }
  throw new Error(
    `Weaviate failed to start within ${timeout}ms after ${attemptCount} attempts (elapsed: ${elapsed}ms). ` +
      `Check that Weaviate is running at ${host}:${port}`
  );
}

/**
 * Check if Weaviate is currently healthy and ready.
 *
 * This function performs a single check of the `/v1/.well-known/ready` endpoint
 * without retrying. Useful for polling the health status without blocking.
 *
 * @param config - Health check configuration (only host and port are used)
 * @returns A Promise that resolves to true if Weaviate is ready, false otherwise
 *
 * @example
 * ```typescript
 * const isReady = await checkHealth({ host: 'localhost', port: 8080 });
 * if (isReady) {
 *   console.log('Weaviate is ready!');
 * } else {
 *   console.log('Weaviate is not ready yet');
 * }
 * ```
 */
export async function checkHealth(config: Pick<HealthCheckConfig, 'host' | 'port'>): Promise<boolean> {
  const { host, port } = config;
  const healthUrl = `http://${host}:${port}/v1/.well-known/ready`;

  try {
    const response = await fetch(healthUrl);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Check if Weaviate is live by polling its liveness endpoint.
 *
 * This function checks the `/v1/.well-known/live` endpoint to verify that
 * Weaviate is running. Unlike the readiness check, this endpoint indicates
 * that the process is alive but may not be ready to accept traffic.
 *
 * @param config - Health check configuration (only host and port are used)
 * @returns A Promise that resolves to true if Weaviate is live, false otherwise
 *
 * @example
 * ```typescript
 * const isLive = await checkLiveness({ host: 'localhost', port: 8080 });
 * if (isLive) {
 *   console.log('Weaviate process is alive');
 * }
 * ```
 */
export async function checkLiveness(config: Pick<HealthCheckConfig, 'host' | 'port'>): Promise<boolean> {
  const { host, port } = config;
  const liveUrl = `http://${host}:${port}/v1/.well-known/live`;

  try {
    const response = await fetch(liveUrl);
    return response.ok;
  } catch (error) {
    return false;
  }
}
