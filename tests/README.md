# Test Suite Documentation

This directory contains comprehensive tests for the Weaviate TypeScript Embedded project.

## Test Structure

```
tests/
├── fixtures/               # Test fixtures (mock archives, etc.)
│   ├── weaviate.tar.gz    # Mock tar.gz archive for extraction tests
│   └── weaviate.zip       # Mock zip archive for extraction tests
├── integration/           # Integration tests
│   ├── extraction.test.ts # Filesystem extraction tests
│   ├── env-vars.test.ts   # Environment variable tests
│   └── port-conflicts.test.ts # Port conflict tests
├── performance/           # Performance benchmark tests
│   └── benchmarks.test.ts # MD5 hashing and cache performance tests
└── unit/                  # Unit tests (TBD)
```

## Test Categories

### Integration Tests: Extraction (`tests/integration/extraction.test.ts`)

Tests real filesystem extraction operations with actual tar.gz and zip archives.

**Coverage:**
- ✅ Real tar.gz archive extraction
- ✅ Real zip archive extraction  
- ✅ File permission preservation (executable bits)
- ✅ Large archive handling (>10MB)
- ✅ Extraction to custom paths
- ✅ Archive cleanup after extraction

**Run with:**
```bash
npm run test:extraction
```

### Performance Tests: Benchmarks (`tests/performance/benchmarks.test.ts`)

Validates performance characteristics of MD5 hashing and cache operations.

**Coverage:**

#### MD5 Hashing Performance
- ✅ Large URL handling (10,000 characters) - <10ms
- ✅ Batch checksums (1,000 URLs) - <100ms
- ✅ Consistent performance across input sizes
- ✅ Batch performance consistency

#### Cache Performance  
- ✅ O(1) cache lookup validation - <1ms
- ✅ O(1) scaling verification (100 → 10,000 entries)
- ✅ Cache miss efficiency
- ✅ Sequential lookup performance
- ✅ Linear scaling validation

#### Combined Operations
- ✅ Hash + cache workflow efficiency
- ✅ Concurrent-like operation performance

#### Memory Efficiency
- ✅ Large cache handling (1,000 entries × 10KB)
- ✅ Cache clear performance

**Run with:**
```bash
npm run test:performance
```

## Performance Baselines

| Operation | Threshold | Description |
|-----------|-----------|-------------|
| MD5 single | <10ms | Single URL hash |
| MD5 batch (1000) | <100ms | 1000 URL hashes |
| Cache lookup | <1ms | Single cache read |
| Cache O(1) | 3x max | 10K entries vs 100 entries |
| Tar extraction (10MB) | <30s | Large archive extraction |

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests (existing)
npm run test:extraction        # Extraction integration tests
npm run test:performance       # Performance benchmarks
npm run test:ci                # Full CI test suite
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:coverage
```

## Test Fixtures

Test fixtures are located in `tests/fixtures/`:

- **weaviate.tar.gz**: Mock tar.gz archive containing a minimal executable shell script
- **weaviate.zip**: Mock zip archive containing the same executable

These fixtures are used to test real extraction operations without downloading large binaries from GitHub.

## Adding New Tests

### Integration Tests

1. Create test file in `tests/integration/`
2. Use `beforeEach`/`afterEach` for test isolation
3. Clean up resources (temp files, directories) after each test
4. Add test script to `package.json` if needed

Example structure:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('My Integration Test', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupDir(tempDir);
  });

  it('should do something', async () => {
    // Test implementation
  });
});
```

### Performance Tests

1. Create test file in `tests/performance/`
2. Use `performance.now()` for timing
3. Set reasonable thresholds (account for CI variance)
4. Validate O(n) complexity where applicable

Example structure:
```typescript
import { describe, it, expect } from 'vitest';

describe('My Performance Test', () => {
  it('should complete operation quickly', () => {
    const start = performance.now();
    // Operation to benchmark
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10); // 10ms threshold
  });
});
```

## CI Integration

The `test:ci` script runs all test suites in sequence:

1. Unit tests (`test:unit`)
2. Integration tests (`test:integration`)
3. Extraction tests (`test:extraction`)
4. Performance benchmarks (`test:performance`)

This ensures comprehensive validation before merging.

## Performance Test Philosophy

Performance tests use **relaxed thresholds** to account for:
- CI environment variance
- System load fluctuations
- JIT compiler warmup

The goal is to catch **regressions**, not enforce absolute performance numbers.

### Threshold Multipliers

- **2-3x**: For O(1) operations (cache lookups)
- **5-10x**: For scaling tests (input size variations)
- **Sub-millisecond**: For individual cache operations
- **<10ms**: For individual hash operations
- **<100ms**: For batch operations (1000 items)

## Troubleshooting

### Test Timeouts

If extraction tests timeout:
- Check disk space
- Verify tar/zip utilities are installed
- Increase `testTimeout` in `vitest.config.ts`

### Flaky Performance Tests

If performance tests fail intermittently:
- Run locally to verify timing
- Adjust thresholds if consistently failing
- Check for system resource constraints
- Consider disabling test or relaxing threshold

### Cleanup Failures

If temp directories aren't cleaned up:
- Check file permissions
- Verify `afterEach` hooks are running
- Manually clean: `rm -rf tmp-test-*`

## Related Documentation

- [Binary Manager Implementation](../src/binary-manager.ts)
- [Vitest Configuration](../vitest.config.ts)
- [Package Scripts](../package.json)

## Contributing

When adding tests:

1. Follow existing patterns
2. Add documentation to this README
3. Update package.json scripts if needed
4. Ensure tests pass in CI
5. Keep tests isolated and idempotent
6. Clean up resources properly

## Test Statistics

- **Total Tests**: 24 (as of this implementation)
  - Extraction: 11 tests
  - Performance: 13 tests
- **Coverage**: See `npm run test:coverage`
- **Execution Time**: ~500ms (excluding large archive test)

