# Test Patterns Reference - Phase 0 Research
*Extracted from test-museum branch - patterns only, no code copied*

## Overview
This document captures the test patterns, structures, and approaches observed in the test-museum reference codebase. These patterns will guide the clean rebuild from the 92a30d4 state.

## Test Categories & Patterns

### 1. Unit Tests - Binary Manager (src/binary-manager.test.ts - 904 lines)

**8 Main Test Groups:**
1. **Version Resolution** (lines 81-200)
   - parseVersion() validation
   - Semantic version handling
   - Security: path traversal prevention
   - Edge cases: empty strings, invalid formats

2. **URL Construction** (lines 201-284)
   - Platform-specific URL building
   - Architecture detection (x64, arm64)
   - File extension logic (.tar.gz vs .zip)
   - Custom binaryUrl handling

3. **Checksum & Caching** (lines 285-411)
   - MD5 hash verification
   - Cache path generation
   - Collision avoidance
   - Persistence data handling

4. **Download Logic** (lines 412-635)
   - HTTP download scenarios
   - Redirect handling
   - Timeout management
   - Error recovery (retry logic)

5. **Extraction Logic** (lines 636-735)
   - Archive format detection
   - Corrupted archive handling
   - Path traversal security
   - Extraction error scenarios

6. **Persistence & Data Path** (lines 736-784)
   - Data directory management
   - Path validation
   - Environment variable integration

7. **Integration & Edge Cases** (lines 785-863)
   - End-to-end scenarios
   - Configuration validation
   - Resource cleanup

8. **Performance & Resource Management** (lines 864-904)
   - Memory usage monitoring
   - Resource leak prevention
   - Cleanup verification

**Common Patterns:**
- Security-first approach (path traversal, input validation)
- Platform-specific logic (Linux/macOS differences)
- Mock-based testing for network/file operations
- Comprehensive error scenario coverage

### 2. Unit Tests - Operations (src/operations.test.ts - 316 lines)

**Test Categories:**
- **CRUD Operations:** Create, Read, Update, Delete collections/objects
- **Batch Operations:** Multiple object handling
- **Query Operations:** Filtering, limits, complex queries
- **Error Handling:** Invalid inputs, connection issues

**Test Names Observed:**
- creates collection with text properties
- lists all collections
- retrieves collection by name after creation
- deletes a collection
- inserts single object
- inserts batch objects
- updates an object
- deletes object by ID
- deletes objects by filter
- fetches with limit
- searches with filters
- handles connection errors
- validates input parameters
- manages transactions

**Patterns:**
- Full lifecycle testing (create → read → update → delete)
- Batch operation validation
- Error boundary testing
- Input validation coverage

### 3. Integration Tests (tests/integration/ - 7 files)

**Test Files:**
- downloads.test.ts - Download and network scenarios
- embeddedDB.test.ts - Database operations integration
- env-vars.test.ts - Environment variable handling
- extraction.test.ts - Archive extraction workflows
- lifecycle.test.ts - Full process lifecycle
- multiple-instances.test.ts - Multi-instance scenarios
- port-conflicts.test.ts - Port management and conflicts

**Common Integration Patterns:**
- Full process lifecycle testing
- Port conflict resolution
- Environment variable integration
- Multi-instance coordination
- Network timeout handling
- Resource cleanup verification

**Example Test Names:**
- should start process successfully with valid configuration
- should handle port conflict gracefully without crashing
- should restart process after manual stop
- should handle environment variable overrides
- should manage multiple concurrent instances

### 4. Security Tests (tests/security/ - 2 files)

**archiveBombs.test.ts:**
- Zip bomb detection (extreme nesting)
- Nesting level validation (threshold: 100 levels)
- Safe archive acceptance
- Boundary condition testing

**corruptedArchives.test.ts:**
- Corrupted archive detection
- Extraction failure handling
- Error message validation
- Recovery scenario testing

**Security Patterns:**
- Input validation at boundaries
- Resource exhaustion prevention
- Malicious input handling
- Error message sanitization

### 5. Performance Tests (tests/performance/ - 1 file)

**benchmarks.test.ts:**
- Performance measurement setup
- Benchmark execution patterns
- Metric collection and reporting
- Comparative performance analysis

### 6. Config Tests (src/__tests__/ - 8 files)

**Test Categories:**
- config-defaults.test.ts - Default value validation
- config-error.test.ts - Error condition handling
- config-logger.test.ts - Logging configuration
- config-merge.test.ts - Configuration merging logic
- config-pipeline.test.ts - Configuration processing pipeline
- config-validation-basic.test.ts - Basic validation rules
- config-validation-fields.test.ts - Field-level validation
- config-validation-version.test.ts - Version validation

**Config Patterns:**
- Default value testing
- Validation rule coverage
- Error message accuracy
- Configuration merging logic

## Setup/Teardown Patterns

### Common Setup Patterns:
1. **Mock Setup:** Network mocks, file system mocks, process mocks
2. **Test Data Creation:** Archive fixtures, config objects, test databases
3. **Environment Preparation:** Port allocation, temp directories, cleanup setup
4. **Dependency Injection:** Mock services, stub implementations

### Common Teardown Patterns:
1. **Resource Cleanup:** Process termination, file deletion, port release
2. **Mock Reset:** Mock function clearing, spy reset
3. **State Restoration:** Environment variable cleanup, global state reset
4. **Verification:** Resource leak detection, cleanup confirmation

## Assertion Patterns

### Common Assertion Types:
- **Equality:** expect(result).toBe(expected)
- **Error Handling:** expect(fn).toThrow(expectedError)
- **Object Structure:** expect(result).toMatchObject(expectedShape)
- **Array Contents:** expect(result).toContain(expectedItem)
- **Type Checking:** expect(typeof result).toBe('string')
- **Null/Undefined:** expect(result).not.toBeNull()

### Security Assertions:
- **Path Traversal:** expect(() => fn(maliciousPath)).toThrow('path traversal')
- **Input Validation:** expect(() => fn(invalidInput)).toThrow('validation error')
- **Resource Limits:** expect(operation).toThrow('resource exhausted')

## Mock Usage Patterns

### Mock Categories:
1. **Network Mocks:** HTTP responses, timeouts, redirects
2. **File System Mocks:** File operations, directory creation, permissions
3. **Process Mocks:** Child process spawning, exit codes, signals
4. **Archive Mocks:** Corrupted archives, nested structures, large files

### Mock Setup Pattern:
```typescript
// Pattern observed: Setup → Execute → Assert → Cleanup
const mock = setupMockScenario();
const result = await operationUnderTest();
expect(result).toMatchExpectedPattern();
await mock.cleanup();
```

## Error Handling Patterns

### Error Scenarios Tested:
- Network failures (timeouts, connection refused)
- File system errors (permissions, disk full)
- Process failures (crashes, signals)
- Validation errors (invalid inputs, malformed data)
- Security violations (path traversal, resource exhaustion)

### Error Testing Pattern:
- **Positive Testing:** Valid inputs produce expected results
- **Negative Testing:** Invalid inputs produce appropriate errors
- **Boundary Testing:** Edge cases at limits (max sizes, thresholds)
- **Recovery Testing:** System behavior after error conditions

## Test Organization Patterns

### File Structure Patterns:
- **Single Responsibility:** Each file focuses on one component/area
- **Logical Grouping:** Related tests grouped in describe blocks
- **Progressive Complexity:** Simple tests first, complex integration last
- **Security First:** Security tests isolated and comprehensive

### Naming Patterns:
- **Descriptive:** should handle X scenario
- **Behavior Focused:** should return Y when Z
- **Security Conscious:** should reject malicious input
- **Performance Aware:** should complete within time limit

## Helper Usage Patterns

### Current Helper Structure (tests/helpers/ - 1113 lines):
- mockArchives.ts (274 lines) - Archive creation and mocking
- networkUtils.ts (185 lines) - Network operation utilities
- processUtils.ts (322 lines) - Process management helpers
- securityArchives.ts (332 lines) - Security-related archive utilities

### Helper Patterns Observed:
- **Factory Functions:** Create test objects with consistent setup
- **Utility Functions:** Common operations abstracted
- **Mock Builders:** Complex mock scenario construction
- **Validation Helpers:** Common assertion patterns

## Migration Considerations

### From Current Chaos to Clean Structure:
1. **Extract Test Logic:** Identify what scenarios need testing (not how)
2. **Preserve Coverage:** Ensure all edge cases and error conditions are maintained
3. **Simplify Setup:** Replace complex mocking with simple helper functions
4. **Maintain Security:** Keep all security validation patterns
5. **Optimize Performance:** Preserve performance testing approaches

### Key Preservation Targets:
- Security test coverage (path traversal, zip bombs, corruption)
- Error handling completeness
- Platform-specific logic
- Integration scenario coverage
- Performance benchmarking approach

This reference will guide the clean rebuild, ensuring no test scenarios are lost while achieving the desired structure and size constraints.

---

## 🔄 Migration Examples - Helper Consolidation

### Before: Scattered Helpers (Current State)
```typescript
// From tests/helpers/mockArchives.ts (274 lines)
import { promises as fs } from 'fs';
import path from 'path';

export async function createCorruptedArchive(type: 'truncated' | 'invalid-header'): Promise<string> {
  const tempDir = await fs.mkdtemp('/tmp/test-archive-');
  const archivePath = path.join(tempDir, 'corrupted.zip');

  // Complex archive creation logic...
  return archivePath;
}

// From tests/helpers/networkUtils.ts (185 lines)
export function mockHttpResponse(status: number, body: any): MockResponse {
  return {
    status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}

// From tests/helpers/processUtils.ts (322 lines)
export async function spawnWeaviateProcess(port: number): Promise<ChildProcess> {
  return spawn('weaviate', ['--port', port.toString()], {
    stdio: 'pipe',
    env: { ...process.env, WEAVIATE_PORT: port.toString() }
  });
}
```

### After: Consolidated Helpers (Phase 3 Target)
```typescript
// tests/helpers/index.ts - Simple barrel export
export * from './setup';
export * from './mocks';
export * from './fixtures';
export * from './assertions';

// tests/helpers/setup.ts (~150 lines) - Test setup/teardown
export async function setupBinaryTest(options: {
  archive?: 'corrupted' | 'valid';
  network?: 'online' | 'offline';
  platform?: 'linux' | 'darwin';
}): Promise<{ binaryManager: any; cleanup: () => Promise<void> }> {
  const binaryManager = new BinaryManager();

  // Simple setup based on options
  if (options.archive === 'corrupted') {
    await createCorruptedArchive(binaryManager);
  }

  const cleanup = async () => {
    await binaryManager.cleanup();
  };

  return { binaryManager, cleanup };
}

// tests/helpers/mocks.ts (~200 lines) - Archive/network/process/fs mocking
export async function createCorruptedArchive(type: 'truncated' | 'invalid-header' = 'truncated'): Promise<string> {
  const tempDir = await fs.mkdtemp('/tmp/test-archive-');
  const archivePath = path.join(tempDir, 'corrupted.zip');

  // Simplified archive creation
  await fs.writeFile(archivePath, Buffer.from('corrupted data'));
  return archivePath;
}

export function mockHttpResponse(status: number, body: any): MockResponse {
  return { status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

// tests/helpers/assertions.ts (~100 lines) - Custom matchers
export const customMatchers = {
  toBeValidArchive: (received: string) => ({
    pass: received.endsWith('.zip') || received.endsWith('.tar.gz'),
    message: () => `Expected ${received} to be a valid archive path`
  }),

  toHaveBeenRetried: (received: any) => ({
    pass: received.retryCount > 0,
    message: () => `Expected operation to have been retried`
  })
};
```

### Migration Pattern: Converting Tests
```typescript
// BEFORE: Complex scattered setup
import { createCorruptedArchive } from '../../../helpers/mockArchives';
import { mockHttpResponse } from '../../../helpers/networkUtils';
import { spawnWeaviateProcess } from '../../../helpers/processUtils';

describe('Binary Manager - Extraction', () => {
  let tempDir: string;
  let mockServer: any;
  let weaviateProcess: ChildProcess;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp('/tmp/test-');
    mockServer = createMockServer();
    weaviateProcess = await spawnWeaviateProcess(8080);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
    mockServer.close();
    weaviateProcess.kill();
  });

  it('handles corrupted archives', async () => {
    const corruptedPath = await createCorruptedArchive('truncated');
    const binaryManager = new BinaryManager();

    await expect(binaryManager.extract(corruptedPath)).rejects.toThrow('EXTRACTION_FAILED');
  });
});

// AFTER: Simple consolidated helpers
import { setupBinaryTest } from '../../helpers/setup';
import { createCorruptedArchive } from '../../helpers/mocks';

describe('Binary Manager - Extraction', () => {
  it('handles corrupted archives', async () => {
    const { binaryManager, cleanup } = await setupBinaryTest({
      archive: 'corrupted'
    });

    try {
      await expect(binaryManager.extract()).rejects.toThrow('EXTRACTION_FAILED');
    } finally {
      await cleanup();
    }
  });
});
```

---

## 📊 CI Impact Analysis - Performance Projections

### Current Baseline (Pre-Optimization)
- **Total Test Files:** 31
- **Integration Tests:** 7 files (require Weaviate startup)
- **Execution Mode:** Parallel (causes port conflicts)
- **Weaviate Startup Time:** 60-90 seconds per instance
- **Estimated CI Time:** 12-18 minutes (with failures)

### Phase 1 Impact: Sequential Execution
- **Change:** `VITEST_SINGLE_THREAD=true` for integration tests
- **Benefit:** Eliminates port conflicts and race conditions
- **Drawback:** No parallelization benefits
- **Projected CI Time:** 18-24 minutes (stable but slower)
- **Net Impact:** +6-12 minutes vs current (but reliable)

### Phase 2 Impact: Monster File Splitting
- **Binary Manager:** 904 lines → 4 files (~220 lines each)
- **Operations:** 316 lines → 2 files (~160 lines each)
- **Weaviate Startups:** No change (still 7 integration files)
- **File Count:** 31 → 35 files
- **Projected CI Time:** 20-26 minutes
- **Net Impact:** +2-4 minutes vs Phase 1

### Phase 3 Impact: Helper Consolidation
- **Helper Files:** 4 modules (1,113 lines) → 8 focused files (~140 lines average)
- **Import Simplification:** Path aliases (`@tests/`) reduce import complexity
- **Setup Time:** Faster test initialization with consolidated helpers
- **Weaviate Startups:** Still 7 integration files
- **Projected CI Time:** 18-22 minutes
- **Net Impact:** -2-4 minutes vs Phase 2 (optimization from better helpers)

### Phase 4 Impact: Shared Instance Pattern
- **Integration Tests:** 7 files → 3-4 files with shared instances
- **Weaviate Startups:** 7 instances → 3-4 instances
- **Startup Savings:** 3-4 × (60-90s) = 180-360 seconds saved
- **Projected CI Time:** 12-18 minutes
- **Net Impact:** -6-8 minutes vs Phase 3

### Phase 5 Impact: Enforcement & Automation
- **Line Limit Enforcement:** ESLint `max-lines: 333`
- **Pre-commit Hooks:** Automatic file size validation
- **CI Validation:** Automated size checks
- **Performance Impact:** Minimal (static analysis)
- **Maintenance Cost:** Reduces future violations

### Overall Lean Hybrid Projection
| Phase | Weaviate Startups | Est. CI Time | vs Current |
|-------|-------------------|--------------|------------|
| Current | 7+ (unstable) | 12-18 min | Baseline |
| Phase 1 | 7 (stable) | 18-24 min | +6-12 min |
| Phase 2 | 7 (split) | 20-26 min | +8-14 min |
| Phase 3 | 7 (optimized) | 18-22 min | +6-10 min |
| Phase 4 | 3-4 (shared) | 12-18 min | +0-6 min |
| Phase 5 | 3-4 (enforced) | 12-18 min | +0-6 min |

**Key Insights:**
- **Primary Bottleneck:** Weaviate startup time (87% of total CI time)
- **Biggest Win:** Shared instance pattern (potentially -6-8 minutes)
- **Risk:** Sequential execution increases total time but ensures reliability
- **Target:** 2-4 minute goal requires further consolidation beyond Phase 4

---

## 🔗 Dependency Mapping - Test Interdependencies

### Test Execution Dependencies

#### Sequential Requirements
**Must Run First:** Configuration/setup tests
```
config-defaults.test.ts → All other tests (establishes baseline)
health-checker.test.ts → Integration tests (validates Weaviate availability)
```

**Must Run Sequentially:** Port-dependent tests
```
port-conflicts.test.ts → multiple-instances.test.ts (port allocation conflicts)
lifecycle.test.ts → Any port 8080 tests (startup/shutdown conflicts)
```

#### Parallel Execution Groups
**Group 1 - Fast Unit Tests:** No dependencies
```
binary-manager.test.ts (version, URL, checksum logic)
operations.test.ts (CRUD operations)
unit.test.ts (general unit tests)
```

**Group 2 - Integration Tests:** Require Weaviate
```
downloads.test.ts → extraction.test.ts (download artifacts)
embeddedDB.test.ts → operations.test.ts (database setup)
env-vars.test.ts → lifecycle.test.ts (environment configuration)
```

**Group 3 - Security Tests:** Independent but resource-intensive
```
archiveBombs.test.ts (CPU intensive)
corruptedArchives.test.ts (disk I/O intensive)
```

#### Resource Dependencies
**Port Allocation:**
- Default: 8080 (most tests)
- Conflicts: port-conflicts.test.ts uses 8080-8090 range
- Multi-instance: Requires 3-5 ports simultaneously

**Disk Space:**
- Archive tests: ~100MB temp files
- Large dataset tests: ~500MB+ storage
- Concurrent execution: 2-3GB total space needed

**Memory:**
- Weaviate instances: ~200-500MB each
- Archive processing: ~100MB additional
- Concurrent limit: 2-3 instances max

### Helper Dependencies

#### Current Helper Interdependencies
```
mockArchives.ts (274 lines)
├── networkUtils.ts (mock HTTP for downloads)
└── processUtils.ts (temp file management)

networkUtils.ts (185 lines)
├── processUtils.ts (server process management)
└── securityArchives.ts (authenticated downloads)

processUtils.ts (322 lines)
├── securityArchives.ts (secure temp directories)
└── mockArchives.ts (process mocking)

securityArchives.ts (332 lines)
└── processUtils.ts (secure file operations)
```

#### Phase 3 Consolidation Plan
```
setup.ts (150 lines) - Foundation
├── mocks.ts (200 lines) - Archive/network mocking
├── fixtures.ts (150 lines) - Test data
└── assertions.ts (100 lines) - Custom matchers

mocks.ts dependencies:
├── setup.ts (cleanup coordination)
└── fixtures.ts (mock data generation)

fixtures.ts dependencies:
└── setup.ts (environment configuration)

assertions.ts dependencies:
└── None (pure utilities)
```

### Test Data Dependencies

#### Shared Test Data
**Fixture Files:** `tests/fixtures/`
- `sample-archives/` - Base archive files for corruption tests
- `config-templates/` - Configuration files for env-var tests
- `test-datasets/` - Sample data for CRUD operations

**Cross-Test Usage:**
```
sample-archives/valid.zip
├── downloads.test.ts (successful download)
├── extraction.test.ts (successful extraction)
└── corruptedArchives.test.ts (corruption base)

config-templates/default.json
├── env-vars.test.ts (environment testing)
├── lifecycle.test.ts (configuration validation)
└── embeddedDB.test.ts (database configuration)
```

### Failure Propagation Analysis

#### Critical Path Tests
**If these fail, block downstream:**
- `health-checker.test.ts` - Blocks all integration tests
- `config-defaults.test.ts` - Affects configuration-dependent tests
- `downloads.test.ts` - Blocks extraction and archive tests

#### Isolated Tests
**Can run independently:**
- Unit tests (no external dependencies)
- Security tests (self-contained)
- Performance tests (run last, don't block others)

#### Recovery Strategies
**Retry Logic:** Network-dependent tests
```
downloads.test.ts (3 retry attempts)
networkUtils.ts (connection recovery)
processUtils.ts (process restart)
```

**Fallback Modes:** Resource-constrained environments
```
Single instance mode (vs multi-instance)
Reduced dataset sizes
Sequential execution (vs parallel)
```

This dependency mapping ensures proper test execution order and resource allocation during the refactoring phases.
