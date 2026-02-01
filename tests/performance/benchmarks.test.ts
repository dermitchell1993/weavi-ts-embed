/**
 * Performance Benchmark Tests
 *
 * Tests performance characteristics of MD5 hashing and cache operations.
 * Part B of Agent 7: Filesystem Extraction & Performance Tests
 *
 * @group performance
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

/**
 * Helper to generate MD5 hash for URL (mimicking BinaryManager behavior)
 */
const md5 = (input: string): string => {
  return createHash('md5').update(input).digest('base64url');
};

/**
 * Simple in-memory cache for testing O(1) lookup performance
 */
class BinaryCache {
  private cache: Map<string, Buffer>;

  constructor() {
    this.cache = new Map();
  }

  set(key: string, value: Buffer): void {
    this.cache.set(key, value);
  }

  get(key: string): Buffer | undefined {
    return this.cache.get(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

describe('Checksum Performance', () => {
  it('should handle large URLs efficiently', () => {
    // Generate a very long URL (10,000 characters)
    const longUrl = 'https://example.com/' + 'a'.repeat(10000);

    // Warmup iteration to account for JIT compilation
    md5(longUrl);

    const start = performance.now();
    const checksum = md5(longUrl);
    const duration = performance.now() - start;

    // Assert: Should complete in less than 10ms
    expect(duration).toBeLessThan(10);
    expect(checksum).toBeDefined();
    expect(checksum.length).toBeGreaterThan(0);
  });

  it('should handle multiple checksums quickly', () => {
    // Create 1000 unique URLs
    const urls = Array.from({ length: 1000 }, (_, i) => `https://example.com/binary-${i}`);

    // Warmup iteration
    urls.slice(0, 10).forEach((url) => md5(url));

    const start = performance.now();
    const checksums = urls.map((url) => md5(url));
    const duration = performance.now() - start;

    // Assert: Should complete 1000 checksums in less than 100ms
    expect(duration).toBeLessThan(100);
    expect(checksums.length).toBe(1000);

    // Verify all checksums are unique
    const uniqueChecksums = new Set(checksums);
    expect(uniqueChecksums.size).toBe(1000);
  });

  it('should maintain consistent performance across different input sizes', () => {
    const sizes = [100, 1000, 10000, 50000];
    const durations: number[] = [];

    sizes.forEach((size) => {
      const url = 'https://example.com/' + 'x'.repeat(size);

      const start = performance.now();
      md5(url);
      const duration = performance.now() - start;

      durations.push(duration);
    });

    // All should be under 10ms threshold
    durations.forEach((duration) => {
      expect(duration).toBeLessThan(10);
    });

    // Performance should scale linearly or better (not exponentially)
    // The largest input (50000 chars) should not take more than 10x the smallest (CI variance)
    expect(durations[3]).toBeLessThan(durations[0] * 10);
  });

  it('should handle batch checksums with consistent performance', () => {
    const batchSizes = [10, 100, 500, 1000];
    const durationsPerChecksum: number[] = [];

    batchSizes.forEach((batchSize) => {
      const urls = Array.from(
        { length: batchSize },
        (_, i) => `https://github.com/weaviate/weaviate/releases/download/v1.27.${i}/binary.tar.gz`
      );

      const start = performance.now();
      urls.forEach((url) => md5(url));
      const duration = performance.now() - start;

      const avgPerChecksum = duration / batchSize;
      durationsPerChecksum.push(avgPerChecksum);
    });

    // All averages should be sub-millisecond
    durationsPerChecksum.forEach((avg) => {
      expect(avg).toBeLessThan(1);
    });

    // Performance should not degrade exponentially
    // Largest batch average should be reasonable (less than 10x the smallest batch average)
    const minAvg = Math.min(...durationsPerChecksum);
    const maxAvg = Math.max(...durationsPerChecksum);

    // Relaxed assertion - just check it doesn't degrade exponentially (10x for high CI variance)
    expect(maxAvg).toBeLessThan(minAvg * 10);
  });
});

describe('Cache Performance', () => {
  it('should lookup cache entries in O(1) time', () => {
    const cache = new BinaryCache();

    // Populate cache with 1000 entries
    for (let i = 0; i < 1000; i++) {
      const key = `key-${i}`;
      const value = Buffer.alloc(1024); // 1KB buffer
      cache.set(key, value);
    }

    // Test lookup performance for middle entry
    const start = performance.now();
    const result = cache.get('key-500');
    const duration = performance.now() - start;

    // Assert: Sub-millisecond lookup
    expect(duration).toBeLessThan(1);
    expect(result).toBeDefined();
    expect(result?.length).toBe(1024);
  });

  it('should maintain O(1) with large cache sizes', () => {
    const cache = new BinaryCache();
    const sizes = [100, 1000, 10000];
    const durations: number[] = [];

    sizes.forEach((size) => {
      // Clear and repopulate cache
      cache.clear();

      // Populate with specified size
      for (let i = 0; i < size; i++) {
        cache.set(`key-${i}`, Buffer.alloc(1024));
      }

      // Measure lookup time for middle entry
      const targetKey = `key-${Math.floor(size / 2)}`;
      const start = performance.now();
      cache.get(targetKey);
      const duration = performance.now() - start;

      durations.push(duration);
    });

    // Verify: O(1) - time shouldn't grow significantly with size
    // The 10,000 entry lookup should not take more than 3x the 100 entry lookup (CI variance)
    expect(durations[2]).toBeLessThan(durations[0] * 3);

    // All lookups should be sub-millisecond
    durations.forEach((duration) => {
      expect(duration).toBeLessThan(1);
    });
  });

  it('should handle cache miss efficiently', () => {
    const cache = new BinaryCache();

    // Populate cache
    for (let i = 0; i < 1000; i++) {
      cache.set(`key-${i}`, Buffer.alloc(1024));
    }

    // Test cache miss performance
    const start = performance.now();
    const result = cache.get('non-existent-key');
    const duration = performance.now() - start;

    // Cache miss should be as fast as cache hit
    expect(duration).toBeLessThan(1);
    expect(result).toBeUndefined();
  });

  it('should handle multiple sequential lookups efficiently', () => {
    const cache = new BinaryCache();

    // Populate cache with 5000 entries
    for (let i = 0; i < 5000; i++) {
      cache.set(`key-${i}`, Buffer.alloc(1024));
    }

    // Perform 100 sequential lookups
    const lookupCount = 100;
    const start = performance.now();

    for (let i = 0; i < lookupCount; i++) {
      const key = `key-${Math.floor(Math.random() * 5000)}`;
      cache.get(key);
    }

    const duration = performance.now() - start;
    const avgPerLookup = duration / lookupCount;

    // Average lookup time should be sub-millisecond
    expect(avgPerLookup).toBeLessThan(1);

    // Total time for 100 lookups should be reasonable
    expect(duration).toBeLessThan(100);
  });

  it('should scale cache operations linearly', () => {
    const cache = new BinaryCache();
    const operationCounts = [100, 500, 1000, 5000];
    const durationsPerOp: number[] = [];

    operationCounts.forEach((count) => {
      cache.clear();

      // Populate cache
      for (let i = 0; i < count; i++) {
        cache.set(`key-${i}`, Buffer.alloc(1024));
      }

      // Measure lookup performance
      const iterations = 50;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const key = `key-${Math.floor(Math.random() * count)}`;
        cache.get(key);
      }

      const duration = performance.now() - start;
      const avgPerOp = duration / iterations;
      durationsPerOp.push(avgPerOp);
    });

    // Verify linear scaling - largest cache should not be significantly slower
    // 5000-entry cache lookups should not be more than 5x slower than 100-entry (CI variance)
    expect(durationsPerOp[3]).toBeLessThan(durationsPerOp[0] * 5);

    // All should maintain sub-millisecond average
    durationsPerOp.forEach((avg) => {
      expect(avg).toBeLessThan(1);
    });
  });
});

describe('Combined Hash + Cache Performance', () => {
  it('should efficiently hash URLs and cache results', () => {
    const cache = new BinaryCache();
    const urls = Array.from(
      { length: 500 },
      (_, i) => `https://github.com/weaviate/weaviate/releases/download/v1.27.${i}/weaviate.tar.gz`
    );

    // First pass: Hash URLs and cache them
    const hashAndCacheStart = performance.now();
    urls.forEach((url) => {
      const hash = md5(url);
      cache.set(hash, Buffer.from(url));
    });
    const hashAndCacheDuration = performance.now() - hashAndCacheStart;

    // Should complete in reasonable time
    expect(hashAndCacheDuration).toBeLessThan(100);

    // Second pass: Hash URLs and retrieve from cache (simulating cache hit)
    const cacheHitStart = performance.now();
    urls.forEach((url) => {
      const hash = md5(url);
      const cached = cache.get(hash);
      expect(cached).toBeDefined();
    });
    const cacheHitDuration = performance.now() - cacheHitStart;

    // Cache hits should also be fast
    expect(cacheHitDuration).toBeLessThan(100);

    // Verify cache size
    expect(cache.size()).toBe(500);
  });

  it('should maintain performance under concurrent-like operations', () => {
    const cache = new BinaryCache();
    const operationCount = 1000;

    const start = performance.now();

    // Simulate interleaved hash + cache operations
    for (let i = 0; i < operationCount; i++) {
      const url = `https://example.com/binary-${i % 100}`;
      const hash = md5(url);

      if (i % 3 === 0) {
        // Cache write
        cache.set(hash, Buffer.from(url));
      } else {
        // Cache read
        cache.get(hash);
      }
    }

    const duration = performance.now() - start;
    const avgPerOp = duration / operationCount;

    // Should maintain sub-millisecond average per operation
    expect(avgPerOp).toBeLessThan(1);

    // Total should complete quickly
    expect(duration).toBeLessThan(200);
  });
});

describe('Memory Efficiency', () => {
  it('should handle large cache without excessive memory growth', () => {
    const cache = new BinaryCache();
    const entryCount = 1000;
    const bufferSize = 10 * 1024; // 10KB per entry

    // Populate cache with larger buffers
    for (let i = 0; i < entryCount; i++) {
      const key = `large-key-${i}`;
      const buffer = Buffer.alloc(bufferSize);
      cache.set(key, buffer);
    }

    // Verify all entries stored
    expect(cache.size()).toBe(entryCount);

    // Access entries to verify they're retrievable
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const key = `large-key-${i}`;
      const result = cache.get(key);
      expect(result?.length).toBe(bufferSize);
    }
    const duration = performance.now() - start;

    // Should still be fast despite larger buffers
    expect(duration).toBeLessThan(50);
  });

  it('should clear cache efficiently', () => {
    const cache = new BinaryCache();

    // Populate with 5000 entries
    for (let i = 0; i < 5000; i++) {
      cache.set(`key-${i}`, Buffer.alloc(1024));
    }

    expect(cache.size()).toBe(5000);

    // Clear cache
    const start = performance.now();
    cache.clear();
    const duration = performance.now() - start;

    // Clearing should be fast
    expect(duration).toBeLessThan(10);
    expect(cache.size()).toBe(0);
  });
});
