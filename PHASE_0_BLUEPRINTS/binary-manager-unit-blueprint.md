# Phase 0 Blueprint: Binary Manager Unit Tests

## Museum Branch Analysis: tests/unit/binary-manager.test.ts (876 lines)

### Test Structure Extracted

#### 1. Constructor & Options Tests
**Test Cases:**
- `should create instance with default options`
- `should use "latest" as default version`
- `should accept specific version`
- `should accept custom binary URL`
- `should throw error when both version and binaryUrl are provided`

#### 2. Version Resolution Tests
**Test Cases:**
- `should return version as-is when valid semver`
- `should resolve "latest" to actual version`
- `should handle version "2.0.0"`
- Error scenarios: 404, timeout, malformed JSON, no releases

#### 3. URL Construction Tests
**Test Cases:**
- Platform-specific URL tests for darwin-arm64, darwin-x64, linux-arm64, linux-x64
- `should throw error for unsupported platform`

#### 4. Checksum Verification Tests
**Test Cases:**
- `should verify correct checksum`
- `should throw on checksum mismatch`
- `should skip verification when skipChecksumVerification=true`

#### 5. Caching Logic Tests
**Test Cases:**
- `should use default cache directory`
- `should respect XDG_CACHE_HOME`
- `should accept custom cache directory`

#### 6. Edge Cases and Error Scenarios
**Test Cases:**
- `should handle verbose logging option`
- `should handle invalid version format`

#### 7. Integration Tests
**Test Cases:**
- `should return existing binary without download`
- `should download and cache binary when not exists`

### Mocking Patterns: Platform, Network, Filesystem mocking
### Helper Functions: 8 distinct mocking utilities identified
### Total Test Cases: 45+ individual test cases

