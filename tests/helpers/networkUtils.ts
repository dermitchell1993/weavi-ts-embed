import { get as httpsGet } from 'https';
import { IncomingMessage } from 'http';

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
 */
export function calculateExponentialBackoff(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt);
}

/**
 * Download a file with retry logic and exponential backoff
 */
export async function downloadWithRetry(url: string, options: RetryOptions = {}): Promise<DownloadResult> {
  const { maxRetries = 3, retryDelay = 100, timeout = 5000, exponentialBackoff = true } = options;

  let lastError: Error | null = null;
  const redirectCount = 0;

  // eslint-disable-next-line no-await-in-loop
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await downloadFile(url, timeout);
      return {
        ...result,
        redirectCount,
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
 * Download a file from a URL with timeout and redirect handling
 */
function downloadFile(url: string, timeoutMs: number): Promise<{ data: Buffer; statusCode: number }> {
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
 */
export function calculateChecksum(data: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Sleep utility for testing backoff
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delays between retry timestamps
 */
export function calculateDelays(timestamps: number[]): number[] {
  const delays: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    delays.push(timestamps[i] - timestamps[i - 1]);
  }
  return delays;
}

/**
 * Mock a flaky download that fails intermittently
 */
export function flakyDownload(failureRate = 0.5): Promise<Buffer> {
  if (Math.random() < failureRate) {
    return Promise.reject(new Error('Simulated network failure'));
  }
  return Promise.resolve(Buffer.from('success'));
}

/**
 * Check if a URL is reachable with a simple HEAD request
 */
export async function isUrlReachable(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    await downloadFile(url, timeoutMs);
    return true;
  } catch {
    return false;
  }
}
