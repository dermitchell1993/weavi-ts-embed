# Security & Performance Tests Blueprint

## Overview
- **Security test files**: 2 files
- **Performance test files**: 1 file
- **Total lines**: 394 lines (performance) + security tests in other files
- **Security focus**: Path traversal protection, input validation
- **Performance focus**: MD5 hashing, cache operations, large dataset handling

## Security Tests

### Path Traversal Protection (~6 tests)
**Files**: binary-manager.test.ts, config-validation-version.test.ts

**Test names:**
- `should reject path traversal attempts in version string (SECURITY)`
- `should prevent path traversal in version string (security)`
- `should reject path traversal patterns in version strings (SECURITY FIX)`
- `rejects path traversal with ../`
- `rejects URL-encoded path traversal`
- `rejects versions with slashes`

**Security Scenarios:**
- `../../../etc/passwd` (Unix path traversal)
- `..\\..\\..\\windows\\system32` (Windows path traversal)
- URL-encoded variants (`%2e%2e%2f`)
- Versions with embedded slashes
- Malformed semantic versions with path components

**Assertions:**
- `expect(() => new EmbeddedOptions({ version })).toThrow(/invalid version/)`
- `expect(() => new EmbeddedOptions({ version })).toThrow(/path traversal attempt detected/)`
- `expect(() => new EmbeddedOptions({ version })).toThrow(/invalid characters/)`

**Mock requirements:**
- None (pure validation logic)

### Input Validation Security (~3 tests)
**Files**: binary-manager.test.ts

**Test names:**
- `should reject invalid version formats`
- `should reject versions with prefixes due to anchored regex`
- `should treat empty version string as "latest"`

**Security Scenarios:**
- Invalid semantic version formats
- Versions with malicious prefixes
- Empty/missing version handling

**Assertions:**
- `expect(() => new EmbeddedOptions({ version })).toThrow(/invalid version/)`
- `expect(options.version).toBe('latest')`

## Performance Tests

### Checksum Performance (~6 tests)
**File**: tests/performance/benchmarks.test.ts

**Test names:**
- `should handle large URLs efficiently`
- `should handle multiple checksums quickly`
- `should maintain consistent performance across different input sizes`
- `should handle batch checksums with consistent performance`

**Performance Scenarios:**
- Large URLs (10,000+ characters)
- Batch processing (1,000 URLs)
- Input size variations
- Memory efficiency validation

**Assertions:**
- `expect(duration).toBeLessThan(10)` (large URL processing)
- `expect(duration).toBeLessThan(100)` (1000 checksums)
- `expect(checksums.length).toBe(1000)`
- `expect(uniqueChecksums.size).toBe(1000)`

**Mock requirements:**
- None (direct performance measurement)

### Cache Performance (~8 tests)
**File**: tests/performance/benchmarks.test.ts

**Test names:**
- `should lookup cache entries in O(1) time`
- `should maintain O(1) with large cache sizes`
- `should handle cache miss efficiently`
- `should handle multiple sequential lookups efficiently`
- `should scale cache operations linearly`
- `should efficiently hash URLs and cache results`

**Performance Scenarios:**
- O(1) lookup validation
- Large cache sizes (10,000+ entries)
- Cache miss handling
- Sequential operations
- Linear scaling verification
- URL hashing + caching

**Assertions:**
- `expect(duration).toBeLessThan(1)` (single lookup)
- `expect(duration).toBeLessThan(50)` (large cache operations)
- `expect(cache.size()).toBe(expectedSize)`
- Linear scaling validation

**Mock requirements:**
- None (direct performance measurement)

## Patterns to Replicate

### Security Test Patterns
```javascript
// Path traversal rejection
const pathTraversalAttempts = [
  '../../../etc/passwd',
  '../1.0.0',
  '1.0.0/../../etc/passwd',
  '1.0.0\\..\\..\\windows'
];

pathTraversalAttempts.forEach((version) => {
  expect(
    () => new EmbeddedOptions({ version }),
    `Should reject path traversal attempt: ${version}`
  ).toThrow(/invalid version|path traversal/);
});
```

### Performance Test Patterns
```javascript
// Performance measurement with warmup
it('should handle large URLs efficiently', () => {
  const longUrl = 'https://example.com/' + 'a'.repeat(10000);

  // Warmup iteration to account for JIT compilation
  md5(longUrl);

  const start = performance.now();
  const checksum = md5(longUrl);
  const duration = performance.now() - start;

  // Assert: Should complete in less than 10ms
  expect(duration).toBeLessThan(10);
  expect(checksum).toBeDefined();
});
```

### Cache Performance Patterns
```javascript
// O(1) lookup validation
it('should lookup cache entries in O(1) time', () => {
  const cache = new BinaryCache();
  const testData = Buffer.from('test data');

  // Populate cache
  cache.set('key1', testData);

  const start = performance.now();
  const result = cache.get('key1');
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(1); // Should be < 1ms
  expect(result).toEqual(testData);
});
```

## Migration Strategy

### Security Tests Migration
- **binary-manager.test.ts security tests** → **tests/security/binary-manager.test.ts**
- **config-validation-version.test.ts security tests** → **tests/security/config-validation.test.ts**
- Extract security-specific tests from larger files
- Consolidate related security tests

### Performance Tests Migration
- **tests/performance/benchmarks.test.ts** → Keep in **tests/performance/benchmarks.test.ts**
- File is already in correct location and within size limits
- May need import updates for @tests/ aliases

## Implementation Notes

- **Security first**: Path traversal protection is critical for binary management
- **Performance validation**: Tests ensure O(1) cache operations and efficient hashing
- **Measurement accuracy**: Use performance.now() with warmup iterations
- **Large dataset testing**: Validate scalability with 1,000+ operations
- **Memory efficiency**: Monitor for memory leaks in cache operations
- **Cross-platform security**: Test both Unix and Windows path traversal patterns

## Test Categories

### Security Test Categories
1. **Input Validation**: Version format validation, malicious input rejection
2. **Path Traversal**: Directory traversal attack prevention
3. **URL Security**: Malicious URL handling
4. **Configuration Security**: Invalid configuration rejection

### Performance Test Categories
1. **Hashing Performance**: MD5 computation speed
2. **Cache Operations**: Lookup, insertion, scaling performance
3. **Batch Processing**: Multiple operation efficiency
4. **Memory Usage**: Large dataset handling without leaks

