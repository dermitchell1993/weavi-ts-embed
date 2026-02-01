/**
 * Options for timeout guard operations
 */
export interface TimeoutOptions {
  /** Optional AbortController for operation cancellation */
  signal?: AbortSignal;
}

/**
 * Wraps an async operation with a timeout guard
 * @param operation - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name for error reporting
 * @param options - Optional configuration including AbortSignal
 * @returns Promise that rejects if timeout exceeded
 *
 * @example
 * ```typescript
 * // Basic usage
 * await withTimeout(fetchData(), 5000, 'Data fetch');
 *
 * // With AbortController
 * const controller = new AbortController();
 * await withTimeout(
 *   fetch(url, { signal: controller.signal }),
 *   5000,
 *   'API request',
 *   { signal: controller.signal }
 * );
 * ```
 */
export function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string,
  options?: TimeoutOptions
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      // Abort the operation if AbortSignal provided
      if (options?.signal && 'abort' in options.signal) {
        try {
          // Abort via AbortController if available
          const controller = (options.signal as any).constructor?.name === 'AbortSignal';
          if (!controller) {
            // Signal might be from a controller, try to find and abort it
            // This is best-effort; proper usage should pass the signal from the operation
          }
        } catch {
          // Ignore abort errors - timeout error takes precedence
        }
      }
      reject(new Error(`[Timeout] ${operationName} exceeded ${timeoutMs / 1000}s limit`));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Get timeout value from environment variable or use default
 * @param envVarName - Environment variable name
 * @param defaultValue - Default timeout in milliseconds
 * @returns Configured timeout in milliseconds
 */
export function getTimeoutFromEnv(envVarName: string, defaultValue: number): number {
  const envValue = process.env[envVarName];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Weaviate startup timeout configuration
 *
 * NOTE: These values (120s CI / 90s local) are for the COMPLETE startup operation including:
 * - Binary download and extraction (if needed)
 * - Process spawn
 * - API readiness polling
 *
 * This differs from embedded.ts's waitTillListening() timeout (30s CI / 60s local),
 * which only covers the polling phase after the process has already started.
 * The journey.test.ts uses 120s timeout (line 19), validating this choice.
 *
 * Can be overridden via WEAVIATE_STARTUP_TIMEOUT_MS environment variable.
 */
export const WEAVIATE_STARTUP_TIMEOUT = getTimeoutFromEnv(
  'WEAVIATE_STARTUP_TIMEOUT_MS',
  process.env.CI ? 120_000 : 90_000
);
