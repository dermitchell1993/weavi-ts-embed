/**
 * Wraps an async operation with a timeout guard
 * @param operation - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name for error reporting
 * @returns Promise that rejects if timeout exceeded
 */
export function withTimeout<T>(operation: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[Timeout] ${operationName} exceeded ${timeoutMs / 1000}s limit`));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}

// Environment-aware configuration
export const WEAVIATE_STARTUP_TIMEOUT = process.env.CI
  ? 120_000 // 120s in CI (variable runner performance)
  : 90_000; // 90s locally (faster hardware)
