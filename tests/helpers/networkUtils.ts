import { get as httpsGet } from 'https';
import { IncomingMessage } from 'http';
import { createHash } from 'crypto';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  exponentialBackoff?: boolean;
}

export interface DownloadResult {
  data: Buffer;
  statusCode: number;
  redirectCount: number;
  attempts: number;
}

/**
 * Calculate exponential backoff delay
 * @param attempt - The attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay in milliseconds (baseDelay * 2^attempt)
 */
export function calculateExponentialBackoff(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt);
}

/**
 * Download a file with retry logic and exponential backoff
 * @param url - The URL to download from
 * @param options - Retry configuration options
 * @returns Download result including data, status code, redirect count, and attempt count
 * @throws Error if all retry attempts fail or on non-retryable errors (404)
 */
export async function downloadWithRetry(url: string, options: RetryOptions = {}): Promise<DownloadResult> {
  const { maxRetries = 3, retryDelay = 100, timeout = 5000, exponentialBackoff = true } = options;

  let lastError: Error | null = null;

  // eslint-disable-next-line no-await-in-loop
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await downloadFile(url, timeout);
      return {
        ...result,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          throw error;
        }
      }

      // If we haven't exhausted retries, wait and try again
      if (attempt < maxRetries) {
        const delay = exponentialBackoff ? calculateExponentialBackoff(attempt, retryDelay) : retryDelay;

        // eslint-disable-next-line no-await-in-loop
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

/**
 * Internal result type for downloadFile
 */
interface DownloadFileResult {
  data: Buffer;
  statusCode: number;
  redirectCount: number;
}

/**
 * Download a file from a URL with timeout and redirect handling
 * @param url - The URL to download from
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise resolving to download result with data, status code, and redirect count
 */
function downloadFile(url: string, timeoutMs: number): Promise<DownloadFileResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let redirectCount = 0;
    const maxRedirects = 5;

    const performRequest = (requestUrl: string) => {
      const timeoutHandle = setTimeout(() => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const req = httpsGet(requestUrl, (resp: IncomingMessage) => {
        clearTimeout(timeoutHandle);

        // Handle redirects (301, 302, 307, 308)
        if (resp.statusCode && [301, 302, 307, 308].includes(resp.statusCode) && resp.headers.location) {
          redirectCount += 1;
          if (redirectCount > maxRedirects) {
            reject(new Error(`Too many redirects (${redirectCount})`));
            return;
          }
          performRequest(resp.headers.location);
          return;
        }

        // Handle error status codes
        if (resp.statusCode && resp.statusCode >= 400) {
          reject(new Error(`HTTP ${resp.statusCode}: ${resp.statusMessage || 'Unknown error'}`));
          return;
        }

        resp.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        resp.on('end', () => {
          const data = Buffer.concat(chunks);
          resolve({
            data,
            statusCode: resp.statusCode || 200,
            redirectCount,
          });
        });

        resp.on('error', (err: Error) => {
          reject(new Error(`Response error: ${err.message}`));
        });
      });

      req.on('error', (err: Error) => {
        clearTimeout(timeoutHandle);
        reject(new Error(`Request error: ${err.message}`));
      });

      req.on('timeout', () => {
        clearTimeout(timeoutHandle);
        req.destroy();
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      });

      req.end();
    };

    performRequest(url);
  });
}

/**
 * Calculate checksum of a buffer using SHA-256
 * @param data - Buffer to calculate checksum for
 * @returns SHA-256 checksum as a 64-character hex string
 */
export function calculateChecksum(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Sleep utility for testing backoff
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delays between retry timestamps
 * @param timestamps - Array of timestamps in milliseconds
 * @returns Array of delays between consecutive timestamps
 */
export function calculateDelays(timestamps: number[]): number[] {
  const delays: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    delays.push(timestamps[i] - timestamps[i - 1]);
  }
  return delays;
}
