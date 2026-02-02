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

