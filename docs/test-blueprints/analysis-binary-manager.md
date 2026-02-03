# Binary Manager Test Blueprint

## Overview
- **Total lines in museum file**: 904 lines
- **Number of test suites**: 7 major describe blocks
- **Test cases**: ~54 individual tests
- **Dependencies**: EmbeddedOptions, EmbeddedDB classes
- **Mocking**: https, fs, tar, adm-zip modules

## Test Scenarios

### Version Resolution (~12 tests)
**Test names:**
- `should return "latest" when no version is specified`
- `should return "latest" when explicitly specified`
- `should accept valid semantic versions (major.minor.patch)`
- `should reject invalid version formats`
- `should treat empty version string as "latest"`
- `should reject versions with prefixes due to anchored regex`
- `should return undefined when binaryUrl is provided (version not needed)`
- `should throw error when both version and binaryUrl are provided`
- `should reject path traversal attempts in version string (SECURITY)`

**Assertions:**
- `expect(options.version).toBe('latest')`
- `expect(() => new EmbeddedOptions({ version })).toThrow(/invalid version/)`
- Security: Path traversal rejection with regex validation

**Mock requirements:**
- None (pure logic tests)

### URL Construction (~7 tests)
**Test names:**
- `should return custom binaryUrl when provided`
- `should construct correct URL for Linux x64`
- `should construct correct URL for Linux arm64`
- `should construct correct URL for macOS (darwin) - uses "all" arch and .zip`
- `should use .tar.gz extension for Linux`
- `should use .zip extension for macOS`

**Assertions:**
- `expect(options.binaryUrl).toContain('tar.gz')`
- `expect(options.binaryUrl).toBe(expectedUrl)`

**Mock requirements:**
- Process platform/arch mocking via `Object.defineProperty`

### Checksum & Caching (~12 tests)
**Test names:**
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

**Assertions:**
- `expect(options.binaryPath).toBe(expectedPath)`
- `expect(path1).toBe(path2)` (for uniqueness testing)
- Security: Path traversal rejection

**Mock requirements:**
- Environment variables (`XDG_CACHE_HOME`)
- `crypto.createHash` for MD5

### Download Logic (~10 tests)
**Test names:**
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

**Assertions:**
- `expect(mockCreateWriteStream).toBeDefined()`
- Network error handling via mock rejection
- Directory creation via `fs.mkdirSync` mocking

**Mock requirements:**
- `https.get` with response mocking (status codes, redirects)
- `fs.createWriteStream` with pipe/on events
- `fs.mkdirSync` for directory creation

### Extraction Logic (~8 tests)
**Test names:**
- `should extract tar.gz files correctly`
- `should handle extraction errors with helpful message for custom binaryUrl`
- `should clean up temporary files after successful extraction`
- `should extract zip files correctly`
- `should set executable permissions (chmod 0o777) after extraction`
- `should handle missing binary in zip archive`
- `should clean up zip file after successful extraction`

**Assertions:**
- `expect(options).toBeDefined()` (structure validation)
- `expect(options.binaryUrl).toContain('tar.gz')`
- Error cases: Missing binary detection

**Mock requirements:**
- `tar.extract` with event mocking
- `adm-zip` (Unzipper) with entry extraction
- `fs.chmodSync` for permissions
- `fs.unlinkSync` for cleanup

### Persistence & Data Path (~4 tests)
**Test names:**
- `should use default persistence path when XDG_DATA_HOME is not set`
- `should respect XDG_DATA_HOME environment variable for persistence`
- `should create unique persistence paths per port to avoid conflicts`
- `should create persistence directory during initialization`

**Assertions:**
- `expect(options.persistenceDataPath).toBe(expectedPath)`
- Port-based uniqueness validation

**Mock requirements:**
- Environment variables (`XDG_DATA_HOME`)
- `fs.mkdirSync` for directory creation

### Integration & Edge Cases (~6 tests)
**Test names:**
- `should handle concurrent access to same binary path (caching)`
- `should handle rapid version changes`
- `should validate that binary exists before starting (skip download)`
- `should handle different architectures gracefully`
- `should handle environment variable edge cases`
- `should clean up partial downloads on error`

**Assertions:**
- `expect(options1.binaryPath).toBe(options2.binaryPath)` (caching)
- Concurrent access validation
- Environment variable edge case handling

**Mock requirements:**
- `fs.existsSync` for binary validation
- Complex environment variable combinations

### Performance & Resource Management (~3 tests)
**Test names:**
- `should reuse existing binaries (no re-download)`
- `should generate unique paths to prevent cache collisions`

**Assertions:**
- `expect(options).toBeDefined()`
- Path uniqueness validation

**Mock requirements:**
- `fs.existsSync` for reuse detection

## Patterns to Replicate

### Setup/Teardown Patterns
```javascript
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.XDG_CACHE_HOME; // Clean env vars
});

afterEach(() => {
  delete process.env.XDG_CACHE_HOME; // Restore env
});

// Platform mocking
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    writable: false,
    enumerable: true,
    configurable: true,
  });
});
```

### Mock Creation Patterns
```javascript
// HTTPS mocking
const mockGet = vi.mocked(https.get);
mockGet.mockImplementation((_url: any, callback: any) => {
  callback(mockResponse);
  return { on: vi.fn().mockReturnThis() } as any;
});

// File stream mocking
const mockStream = {
  on: vi.fn().mockReturnThis(),
  pipe: vi.fn().mockReturnThis(),
  close: vi.fn(),
};
```

### Assertion Patterns
- **Existence**: `expect(options).toBeDefined()`
- **Equality**: `expect(options.version).toBe('latest')`
- **Error throwing**: `expect(() => new EmbeddedOptions({ version })).toThrow(/invalid version/)`
- **Path validation**: `expect(options.binaryPath).toBe(expectedPath)`
- **Security**: Path traversal rejection with descriptive error messages

## Split Strategy

**File 1: tests/unit/binary-manager/download.test.ts** (~220 lines)
- Download Logic scenarios (10 tests)
- Network error handling
- Redirect following
- Directory creation

**File 2: tests/unit/binary-manager/extraction.test.ts** (~220 lines)
- Extraction Logic scenarios (8 tests)
- Tar.gz and zip handling
- Permission setting
- Cleanup operations

**File 3: tests/unit/binary-manager/verification.test.ts** (~220 lines)
- Checksum & Caching scenarios (12 tests)
- Version Resolution scenarios (9 tests)
- Path uniqueness and security

**File 4: tests/unit/binary-manager/lifecycle.test.ts** (~220 lines)
- Persistence & Data Path (4 tests)
- Integration & Edge Cases (6 tests)
- Performance & Resource Management (3 tests)
- URL Construction (7 tests)

## Notes

- **Security focus**: Multiple path traversal tests with comprehensive coverage
- **Platform coverage**: Linux (x64/arm64) and macOS with different archive formats
- **Mock complexity**: Heavy use of vi.mocked() for external dependencies
- **Error handling**: Comprehensive network and extraction error scenarios
- **Caching logic**: Path uniqueness to prevent collisions between versions
- **Environment variables**: XDG_CACHE_HOME and XDG_DATA_HOME support

## Implementation Notes

- Use simple helper functions instead of complex DSL
- Maintain security test coverage (path traversal, malicious inputs)
- Keep platform-specific logic testing
- Preserve comprehensive error message validation
- Focus on behavior validation over implementation details

