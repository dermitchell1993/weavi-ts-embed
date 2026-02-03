# ⚔️ Binary Manager Clean Rebuild Research

## Overview
**Museum File Examined:** `src/binary-manager.test.ts` (904 lines, 56 tests)
**Clean Rebuild Structure:** 4 intentional files (≤275 lines each)
**Test Patterns Extracted:** 56 test scenarios for clean replication

## 📁 Intentional File Structure

### 1. `tests/unit/binary-manager/download.test.ts` (~220 lines)
**Test Category:** Version Resolution + URL Construction + Download Logic
**Tests:** 32 tests

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

### 2. `tests/unit/binary-manager/extraction.test.ts` (~210 lines)
**Test Category:** Extraction Logic + Checksum & Caching
**Tests:** 15 tests

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

### 3. `tests/unit/binary-manager/verification.test.ts` (~200 lines)
**Test Category:** Integration & Edge Cases
**Tests:** 6 tests

#### Integration & Edge Cases Tests (6 tests)
- `should handle concurrent access to same binary path (caching)`
- `should handle rapid version changes`
- `should validate that binary exists before starting (skip download)`
- `should handle different architectures gracefully`
- `should handle environment variable edge cases`

---

### 4. `tests/unit/binary-manager/lifecycle.test.ts` (~250 lines)
**Test Category:** Persistence & Performance
**Tests:** 3 tests

#### Persistence & Performance Tests (3 tests)
- `should use default persistence path when XDG_DATA_HOME is not set`
- `should respect XDG_DATA_HOME environment variable for persistence`
- `should create unique persistence paths per port to avoid conflicts`
- `should create persistence directory during initialization`
- `should reuse existing binaries (no re-download)`
- `should generate unique paths to prevent cache collisions`

## 📊 Clean Replication Notes

### Test Pattern Replication Rules
1. **Pattern-Based Recreation**: Use extracted test names and assertions to build fresh implementations
2. **Intentional Setup Design**: Design setup/teardown based on functional needs, not copied code
3. **Clean Import Architecture**: Use `@tests/` aliases from the start
4. **Functional Coverage**: Ensure each file covers its behavioral domain completely

### Implementation Dependencies
- **download.test.ts**: Foundation - version resolution and network behaviors
- **extraction.test.ts**: Depends on download patterns (binary availability assumption)
- **verification.test.ts**: Depends on extraction patterns (binary ready assumption)
- **lifecycle.test.ts**: Depends on all previous patterns (full integration behaviors)

### File Size Discipline
- Target: ≤275 lines per file (well under 333 limit)
- Average: ~220 lines
- Largest file: 250 lines (lifecycle.test.ts - complex persistence behaviors)

---

*Generated: Phase 0 Clean Rebuild Research*
*Binary Manager: 904 lines examined → 4 clean files (56 test patterns extracted)*

