# 🔬 Detailed Test Blueprints

## Phase 0 Research: Extracted Test Names, Assertions & Patterns

This document contains the detailed blueprints synthesized from examining the museum files. Each monster file has been analyzed to extract exact test names, assertions, and patterns for precise splitting.

---

## ⚔️ Binary Manager Test Blueprints (904 lines → 4 files)

### 📁 `tests/unit/binary-manager/download.test.ts` (~220 lines)
**Test Category**: Version Resolution + URL Construction + Download Logic
**Total Tests**: 32 tests

#### Version Resolution Tests (9 tests)
- `should return "latest" when no version is specified`
- `should return "latest" when explicitly specified`
- `should accept valid semantic versions (major.minor.patch)`
- `should reject invalid version formats`
- `should treat empty version string as "latest"`
- `should reject versions with prefixes due to anchored regex`
- `should return undefined when binaryUrl is provided (version not needed)`
- `should throw error when both version and binaryUrl are provided`
- `should reject path traversal attempts in version string (SECURITY)`

#### URL Construction Tests (6 tests)
- `should return custom binaryUrl when provided`
- `should construct correct URL for Linux x64`
- `should construct correct URL for Linux arm64`
- `should construct correct URL for macOS (darwin) - uses "all" arch and .zip`
- `should use .tar.gz extension for Linux`
- `should use .zip extension for macOS`

#### Download Logic Tests (17 tests)
- `should handle successful download (200 OK)`
- `should follow redirects (302 status code)`
- `should provide helpful error message on 404 (binary not found)`
- `should handle network errors gracefully`
- `should provide version guidance for Linux (>= 1.18.0)`
- `should provide version guidance for macOS (>= 1.19.8)`
- `should handle unexpected status codes`
- `should create directories if they do not exist`
- `should not throw if directories already exist`
- `should use .tgz extension for Linux downloads`
- `should use .zip extension for macOS downloads`
- `should clean up partial downloads on error`

---

### 📁 `tests/unit/binary-manager/extraction.test.ts` (~210 lines)
**Test Category**: Extraction Logic + Checksum & Caching
**Total Tests**: 15 tests

#### Checksum & Caching Tests (11 tests)
- `should use default cache path when XDG_CACHE_HOME is not set`
- `should respect XDG_CACHE_HOME environment variable`
- `should create unique path for "latest" version`
- `should create unique path for specific versions to avoid collisions`
- `should use MD5 hash for custom binaryUrl to ensure uniqueness`
- `should generate consistent hash for same binaryUrl (deterministic)`
- `should handle URL with query parameters in hash`
- `should handle very long URLs in hash generation`
- `should handle special characters in cache path`
- `should prevent path traversal in version string (security)`
- `should reject path traversal patterns in version strings (SECURITY FIX)`

#### Extraction Logic Tests (4 tests)
- `should extract tar.gz files correctly`
- `should handle extraction errors with helpful message for custom binaryUrl`
- `should clean up temporary files after successful extraction`
- `should extract zip files correctly`
- `should set executable permissions (chmod 0o777) after extraction`
- `should handle missing binary in zip archive`
- `should clean up zip file after successful extraction`

---

### 📁 `tests/unit/binary-manager/verification.test.ts` (~200 lines)
**Test Category**: Integration & Edge Cases
**Total Tests**: 6 tests

#### Integration & Edge Cases Tests (6 tests)
- `should handle concurrent access to same binary path (caching)`
- `should handle rapid version changes`
- `should validate that binary exists before starting (skip download)`
- `should handle different architectures gracefully`
- `should handle environment variable edge cases`

---

### 📁 `tests/unit/binary-manager/lifecycle.test.ts` (~250 lines)
**Test Category**: Persistence & Performance
**Total Tests**: 3 tests

#### Persistence & Performance Tests (3 tests)
- `should use default persistence path when XDG_DATA_HOME is not set`
- `should respect XDG_DATA_HOME environment variable for persistence`
- `should create unique persistence paths per port to avoid conflicts`
- `should create persistence directory during initialization`
- `should reuse existing binaries (no re-download)`
- `should generate unique paths to prevent cache collisions`

---

## 🏥 Health Checker Test Blueprints (812 lines → 3 files)

### 📁 `tests/unit/health-checker/wait-for-ready.test.ts` (~270 lines)
**Test Category**: All waitForReady scenarios
**Total Tests**: 32 tests

#### Happy Path - Success Scenarios (6 tests)
- `should resolve immediately when Weaviate is ready on first attempt`
- `should log exact success message format on first attempt`
- `should retry and eventually succeed when Weaviate becomes ready`
- `should handle non-ok responses and retry until success`
- `should work with different host and port combinations`
- `should suppress console logs when silent mode is enabled`

#### Timeout Scenarios (5 tests)
- `should timeout after specified duration when server never becomes ready`
- `should timeout with custom short timeout value`
- `should respect timeout even with high maxRetries`
- `should handle timeout = 0 as immediate failure`

#### Retry Logic & MaxRetries (5 tests)
- `should respect maxRetries parameter and stop after limit`
- `should handle maxRetries = 1 (single attempt only)`
- `should handle maxRetries = 0 gracefully (no attempts)`
- `should calculate default maxRetries from timeout and interval`

#### Exponential Backoff Verification (5 tests)
- `should implement exponential backoff between retries`
- `should have monotonically increasing intervals with exponential backoff`
- `should cap exponential backoff at maximum interval`
- `should start backoff from configured interval value`

#### Edge Cases - Boundary Conditions (5 tests)
- `should handle interval = 0 (immediate retries)`
- `should handle extremely short intervals correctly`
- `should handle very large timeout values without issues`
- `should handle mixed error types in succession`

#### Concurrency & Resource Management (3 tests)
- `should handle multiple simultaneous waitForReady calls independently`
- `should clean up properly when promise resolves early`

#### Input Validation & Security (3 tests)
- `should handle negative timeout gracefully`
- `should handle negative interval values`
- `should handle negative maxRetries`
- `should not cause DoS with extremely large maxRetries`
- `should handle special characters in host safely`
- `should handle extremely large port numbers`

---

### 📁 `tests/unit/health-checker/health-status.test.ts` (~270 lines)
**Test Category**: checkHealth + checkLiveness
**Total Tests**: 8 tests

#### checkHealth Tests (7 tests)
- `should return true when Weaviate is ready`
- `should return false when Weaviate returns non-ok status`
- `should return false on connection error`
- `should work with different host and port combinations`
- `should handle network timeout errors`
- `should not throw exceptions on any error`
- `should handle different HTTP error codes`

#### checkLiveness Tests (7 tests)
- `should return true when Weaviate is live`
- `should return false when Weaviate is not live`
- `should return false on connection error`
- `should work with different host and port combinations`
- `should handle DNS resolution failures`
- `should differentiate between ready and live endpoints`
- `should handle different HTTP error codes`

---

### 📁 `tests/unit/health-checker/error-handling.test.ts` (~270 lines)
**Test Category**: Edge cases + validation
**Total Tests**: 4 tests

#### Error Handling Tests (4 tests)
- Tests for edge cases and validation scenarios not covered in the main waitForReady logic
- Boundary condition testing
- Security validation
- Resource cleanup verification

---

## ⚙️ Process Manager Test Blueprints (555 lines → 2 files)

### 📁 `tests/unit/process-manager/lifecycle.test.ts` (~275 lines)
**Test Category**: start + stop + cleanup + getConfig
**Total Tests**: 28 tests

#### start Method Tests (17 tests)
- `should spawn process with correct binary path`
- `should pass correct environment variables`
- `should resolve relative data paths to absolute`
- `should use absolute data paths as-is`
- `should use default data path if not provided`
- `should merge additional environment variables`
- `should merge base env with additionalEnvVars`
- `should pass cwd option if provided`
- `should capture stdout output when verbose is true`
- `should capture stderr output`
- `should not log empty stdout lines`
- `should throw error if process is already running`
- `should handle spawn errors`
- `should set process to null on exit`
- `should not log startup messages when verbose is false`
- `should not capture stdout when verbose is false`

#### stop Method Tests (4 tests)
- `should send SIGTERM to stop process`
- `should wait for process to exit gracefully`
- `should force kill after timeout`
- `should do nothing if no process is running`
- `should handle kill errors on SIGTERM`

#### cleanup Method Tests (2 tests)
- `should stop process and clear config`
- `should not throw if no process is running`

#### getConfig Method Tests (5 tests)
- `should return null when no process has been started`
- `should return config after process is started`
- `should preserve config after process is stopped`
- `should clear config after cleanup`

---

### 📁 `tests/unit/process-manager/monitoring.test.ts` (~275 lines)
**Test Category**: isRunning + getPid + kill
**Total Tests**: 16 tests

#### isRunning Method Tests (3 tests)
- `should return false when no process is running`
- `should return true when process is running`
- `should return false after process is killed`

#### getPid Method Tests (2 tests)
- `should return undefined when no process is running`
- `should return process PID when running`

#### kill Method Tests (4 tests)
- `should send SIGKILL to force kill process`
- `should log kill message when verbose is true`
- `should do nothing if no process is running`
- `should handle kill errors`

---

## 🔄 Operations Test Blueprints (316 lines → 2 files)

### 📁 `tests/unit/operations/crud.test.ts` (~180 lines)
**Test Category**: Collection Management + CRUD Operations
**Total Tests**: 9 tests

#### Collection Management Tests (4 tests)
- `creates collection with text properties`
- `lists all collections`
- `retrieves collection by name after creation`
- `deletes a collection`

#### CRUD Operations Tests (5 tests)
- `inserts single object`
- `inserts batch objects`
- `updates an object`
- `deletes object by ID`
- `deletes objects by filter`

---

### 📁 `tests/unit/operations/advanced.test.ts` (~160 lines)
**Test Category**: Query Operations + Batch Operations + Error Handling
**Total Tests**: 5 tests

#### Query Operations Tests (2 tests)
- `fetches with limit`
- `fetches with filters`

#### Batch Operations Tests (1 test)
- `bulk inserts 100+ objects`

#### Error Handling Tests (2 tests)
- `rejects invalid collection names`
- `rejects invalid data types`

---

## 📊 Blueprint Summary

| Original File | Lines | New Files | Total New Tests | Test Distribution |
|---------------|-------|-----------|----------------|-------------------|
| `binary-manager.test.ts` | 904 | 4 files | 56 tests | 32/15/6/3 |
| `health-checker.test.ts` | 812 | 3 files | 44 tests | 32/8/4 |
| `process-manager.test.ts` | 555 | 2 files | 44 tests | 28/16 |
| `operations.test.ts` | 316 | 2 files | 14 tests | 9/5 |

## 🎯 Implementation Strategy

### Test Extraction Rules
1. **Maintain Test Logic**: Preserve exact test assertions and expectations
2. **Keep Setup/Teardown**: Include relevant beforeEach/afterEach blocks
3. **Preserve Imports**: Ensure all required imports are included
4. **Update Paths**: Change relative imports to use `@tests/` aliases
5. **Verify Coverage**: Each new file should maintain test coverage for its domain

### File Size Targets
- **download.test.ts**: ~220 lines (32 tests)
- **extraction.test.ts**: ~210 lines (15 tests)
- **verification.test.ts**: ~200 lines (6 tests)
- **lifecycle.test.ts**: ~250 lines (3 tests)
- **wait-for-ready.test.ts**: ~270 lines (32 tests)
- **health-status.test.ts**: ~270 lines (8 tests)
- **error-handling.test.ts**: ~270 lines (4 tests)
- **process-lifecycle.test.ts**: ~275 lines (28 tests)
- **process-monitoring.test.ts**: ~275 lines (16 tests)
- **operations-crud.test.ts**: ~180 lines (9 tests)
- **operations-advanced.test.ts**: ~160 lines (5 tests)

---

*Generated: Phase 0 Detailed Research*
*Status: Ready for Implementation*

