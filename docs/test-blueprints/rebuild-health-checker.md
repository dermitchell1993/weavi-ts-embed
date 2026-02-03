# 🏥 Health Checker Clean Rebuild Research

## Overview
**Museum File Examined:** `src/health-checker.test.ts` (812 lines, 44 tests)
**Clean Rebuild Structure:** 3 intentional files (≤275 lines each)
**Test Patterns Extracted:** 44 test scenarios for clean replication

## 📁 Intentional File Structure

### 1. `tests/unit/health-checker/wait-for-ready.test.ts` (~270 lines)
**Test Category:** All waitForReady scenarios
**Tests:** 32 tests

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

### 2. `tests/unit/health-checker/health-status.test.ts` (~270 lines)
**Test Category:** checkHealth + checkLiveness
**Tests:** 8 tests

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

### 3. `tests/unit/health-checker/error-handling.test.ts` (~270 lines)
**Test Category:** Edge cases + validation
**Tests:** 4 tests

#### Error Handling Tests (4 tests)
- Tests for edge cases and validation scenarios not covered in the main waitForReady logic
- Boundary condition testing
- Security validation
- Resource cleanup verification

## 📊 Clean Replication Notes

### Test Pattern Replication Rules
1. **Pattern-Based Recreation**: Use extracted test names and assertions to build fresh implementations
2. **Intentional Setup Design**: Design setup/teardown based on functional needs, not copied code
3. **Clean Import Architecture**: Use `@tests/` aliases from the start
4. **Functional Coverage**: Ensure each file covers its behavioral domain completely

### Implementation Dependencies
- **wait-for-ready.test.ts**: Independent (core waiting and retry behaviors)
- **health-status.test.ts**: Independent (endpoint validation behaviors)
- **error-handling.test.ts**: May depend on other patterns for complex edge case setup

### File Size Discipline
- Target: ≤275 lines per file (well under 333 limit)
- Average: ~270 lines
- All files meet size constraints through functional separation

---

*Generated: Phase 0 Clean Rebuild Research*
*Health Checker: 812 lines examined → 3 clean files (44 test patterns extracted)*
