# Integration Tests Blueprint

## Overview
- **Integration test files**: 2 files
- **Total lines**: 638 lines
- **Files within limits**: All files ≤333 lines
- **Execution pattern**: Real embedded Weaviate instances
- **Platform support**: Linux and macOS only

## Integration Test Files

### connectToEmbedded.test.ts (244 lines)
- **Location**: src/connectToEmbedded.test.ts
- **Test count**: ~12 tests
- **Categories**: Connection factory, configuration options, error handling, concurrent operations
- **Execution time**: 90-120 seconds per test (binary download + startup)

### journey.test.ts (90 lines)
- **Location**: src/journey.test.ts
- **Test count**: 4 tests
- **Categories**: End-to-end startup scenarios, version handling, configuration variations
- **Execution time**: 90 seconds per test
- **Note**: Uses isolated instances (not shared) for configuration testing

## Test Scenarios

### Connection Factory Tests (~8 tests)
**Test names:**
- `should connect to embedded Weaviate with default options`
- `should connect with custom port`
- `should connect with custom host`
- `should support custom gRPC port`
- `should allow collection operations via v3 API`
- `should properly extend WeaviateClient interface`
- `should handle version specification`

**Assertions:**
- `expect(client).toBeDefined()`
- `expect(client.embedded.pid).toBeGreaterThan(0)`
- `expect(client.collections).toBeDefined()`
- `expect(await client.isReady()).toBe(true)`
- Collection creation/deletion verification

**Mock requirements:**
- None (real embedded instances)

### Error Handling Tests (~2 tests)
**Test names:**
- `should throw error with context when connection fails`
- `should handle invalid configuration gracefully`

**Assertions:**
- `await expect(connectToEmbedded(...)).rejects.toThrow('Failed to connect')`
- `await expect(connectToEmbedded(...)).rejects.toThrow()`

**Mock requirements:**
- None (real error scenarios)

### Concurrent Operations Tests (~1 test)
**Test names:**
- `should handle multiple clients on different ports`

**Assertions:**
- `expect(client1.embedded.pid).not.toBe(client2.embedded.pid)`
- `expect(await client1.isReady()).toBe(true)`
- `expect(await client2.isReady()).toBe(true)`

**Mock requirements:**
- None (real concurrent instances)

### Journey/Configuration Tests (~4 tests)
**Test names:**
- `starts/stops EmbeddedDB with default options`
- `starts/stops EmbeddedDB with custom options`
- `starts/stops EmbeddedDB with latest version`

**Assertions:**
- `expect(res.name).toEqual('TestCollection')`
- Collection creation/deletion verification
- Connection validation via collection operations

**Mock requirements:**
- None (real embedded instances)

## Patterns to Replicate

### Setup/Teardown Patterns
```javascript
// Individual test cleanup (connectToEmbedded.test.ts)
let client: EmbeddedClient;
const clientsToCleanup: EmbeddedClient[] = [];

const trackClient = (c: EmbeddedClient) => {
  clientsToCleanup.push(c);
  return c;
};

afterEach(() => {
  clientsToCleanup.forEach((c) => {
    if (c?.embedded?.pid) {
      try {
        c.embedded.stop();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  });
  clientsToCleanup.length = 0;
});

afterAll(() => {
  if (client?.embedded?.pid) {
    try {
      client.embedded.stop();
    } catch (err) {
      // Ignore cleanup errors
    }
  }
});
```

### Connection Verification Patterns
```javascript
// Health check verification
const isReady = await client.isReady();
expect(isReady).toBe(true);

// Collection operation verification
const res = await client.collections.create(testCollection);
expect(res.name).toEqual('TestCollection');
await client.collections.delete(testCollection.name);
```

### Timeout Patterns
```javascript
// Extended timeouts for binary download and startup
it('should connect to embedded Weaviate', async () => {
  // ... test code
}, 90000); // 90 seconds

it('should handle concurrent operations', async () => {
  // ... test code
}, 120000); // 120 seconds
```

### Platform Gating Patterns
```javascript
describe('integration tests', () => {
  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    it.skip('Platform not supported', () => {});
    return;
  }
  // ... tests
});
```

## Migration Strategy

### Files to Move to tests/integration/
1. **src/connectToEmbedded.test.ts** → **tests/integration/connectToEmbedded.test.ts**
2. **src/journey.test.ts** → **tests/integration/journey.test.ts**

### Import Updates
- Update relative imports to use @tests/ aliases
- Update helper imports (e.g., getRandomPort from tests/helpers/)

## Implementation Notes

- **Real instances**: All tests start actual embedded Weaviate binaries
- **Resource intensive**: Tests require significant time and system resources
- **Platform restrictions**: Linux/macOS only due to binary availability
- **Cleanup critical**: Proper process termination prevents resource leaks
- **Timeout management**: Extended timeouts (90-120s) for binary operations
- **Isolation**: Each test should use unique ports to avoid conflicts

## Performance Considerations

### CI Impact Assessment

**Current State** (estimated):
- Unit tests: ~45-60 seconds total
- No integration tests in CI currently

**Post-Migration CI Impact**:
- **Total CI time increase**: +8-12 minutes per run
- **Integration test suite**: ~6-8 minutes (2 files × ~3-4 minutes each)
- **Platform matrix**: Linux + macOS = ~12-16 minutes total integration time

**Breakdown by Test File**:
- `connectToEmbedded.test.ts` (~12 tests): 6-8 minutes
  - 8 connection tests × 45s average = ~6 minutes
  - 2 error handling tests × 30s = ~1 minute
  - 1 concurrent test × 120s = ~2 minutes
- `journey.test.ts` (~4 tests): 2-3 minutes
  - 4 configuration tests × 45s = ~3 minutes

**Optimization Strategies**:
- **Binary caching**: First run downloads (~2 minutes), subsequent runs reuse (~30s)
- **Parallel execution**: Tests can run concurrently with different ports
- **Platform-specific**: macOS tests only run on macOS runners, Linux on Linux runners
- **Selective running**: Integration tests can be run separately from unit tests

**Resource Requirements**:
- **CPU**: Moderate (binary extraction, Weaviate startup)
- **Memory**: High (embedded Weaviate instances ~200-500MB each)
- **Disk**: Moderate (binary downloads ~50-100MB, temp files)
- **Network**: High (initial binary downloads, health checks)

**CI Strategy Recommendations**:
1. **Separate workflows**: Unit tests vs integration tests
2. **Conditional running**: Integration tests only on main branch or manual trigger
3. **Resource optimization**: Use larger runners for integration tests
4. **Caching**: Cache downloaded binaries between runs
5. **Parallel matrix**: Run Linux and macOS integration tests in parallel

### Execution Characteristics

- **Parallel execution**: Tests can run in parallel but need different ports
- **Resource usage**: Each test consumes CPU, memory, and disk space
- **Timeout management**: Extended timeouts (90-120s) for binary operations

## Lifecycle Integration Tests (16 comprehensive tests)
**File**: tests/integration/lifecycle.test.ts (839 lines)

### Test Categories:
1. **Basic Lifecycle** (3 tests): Process startup, port conflicts, custom env vars
2. **Graceful Shutdown (SIGTERM)** (3 tests): Stop operations, multiple calls, in-flight operations
3. **SIGKILL Fallback** (2 tests): Force kill, already-terminated process
4. **Multiple Start/Stop Cycles** (3 tests): 3-cycle test, rapid cycles, data persistence
5. **Unexpected Termination & Cleanup** (3 tests): Crash detection, resource cleanup, zombie prevention
6. **Error Handling & Edge Cases** (3 tests): Early stop, invalid PID, port conflict detection
7. **Health Polling** (2 tests): Health endpoint polling, timeout behavior

### Key Test Scenarios:
- Process lifecycle management with random port allocation
- Comprehensive cleanup and resource management
- Health polling with timeout behavior
- Multiple start/stop cycles with data persistence
- Error handling for invalid PIDs and port conflicts
- SIGTERM graceful shutdown vs SIGKILL fallback

### Helper Functions: 8 process/port/health management utilities
### Total Test Cases: 16 comprehensive integration tests
### Key Patterns: Random port allocation, comprehensive cleanup, health polling

### Test Examples:
- `should start and stop process successfully`
- `should handle multiple start/stop cycles`
- `should perform graceful shutdown on SIGTERM`
- `should fallback to SIGKILL when SIGTERM fails`
- `should detect and cleanup crashed processes`
- `should poll health endpoint with timeout`
- **Binary caching**: Subsequent runs may be faster due to cached binaries
- **Platform isolation**: Linux/macOS tests run on appropriate platforms only
