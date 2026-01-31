# Security Tests - Corrupted Archive Handling

## Overview

This test suite verifies that the binary manager properly handles corrupted, malformed, and incomplete archive files with appropriate error handling and cleanup.

## Test Coverage

### 1. Corrupted TAR Archive Detection
- **Invalid header detection**: Rejects files with corrupted tar headers
- **Empty archive handling**: Gracefully handles zero-byte tar files
- **Header-only archives**: Detects tar files with only header bytes
- **Descriptive error messages**: Provides helpful error information without exposing sensitive paths

### 2. Corrupted ZIP Archive Detection
- **Invalid header detection**: Rejects files with corrupted zip headers
- **Empty archive handling**: Gracefully handles zero-byte zip files
- **Error message quality**: Ensures errors are informative and don't leak system information

### 3. Truncated Archive Detection
- **Incomplete TAR files**: Detects and rejects truncated tar.gz archives
- **Incomplete ZIP files**: Detects and rejects truncated zip archives
- **Download failure simulation**: Tests behavior when archives are incomplete (simulating interrupted downloads)

### 4. Partial Extraction Failure Handling
- **Mid-process failures**: Handles extraction failures during processing
- **Cleanup verification**: Ensures no partial files are left after failures
- **Resource management**: Verifies proper cleanup of temporary files

### 5. Security - Error Message Sanitization
- **Path exposure prevention**: Ensures error messages don't expose sensitive system paths
- **User directory protection**: Verifies no user-specific paths leak in errors
- **System path protection**: Confirms system directories are not exposed

### 6. Cleanup and Resource Management
- **Disk space leak prevention**: Verifies failed extractions don't accumulate files
- **Multiple failure resilience**: Tests that repeated failures don't cause resource leaks
- **Directory validation**: Ensures proper error handling for missing extraction directories

### 7. Performance Testing
- **Fast failure detection**: Verifies corrupted archives are detected quickly (< 2 seconds)
- **Immediate zip validation**: Ensures zip corruption is detected immediately

## Test Execution

### Run All Security Tests
```bash
npm test tests/security/corruptedArchives.test.ts
```

### Run Specific Test Suite
```bash
npm test tests/security/corruptedArchives.test.ts -- -t "Corrupted TAR"
```

### Run with Coverage
```bash
npm run test:coverage -- tests/security/corruptedArchives.test.ts
```

## Test Duration

All tests execute in **< 2 seconds** as specified in the requirements (PRI-828).

## Security Considerations

### Disk Space Protection
The tests ensure that failed extractions don't leak disk space by:
- Verifying cleanup after failures
- Testing multiple failed attempts
- Confirming no accumulated partial files

### Partial State Prevention
Tests verify that no partial extraction state persists after failures:
- Files are properly cleaned up
- Temporary directories are removed
- Resource handles are released

### Error Message Security
Tests confirm that error messages:
- Don't expose full system paths
- Don't reveal user directories
- Don't leak sensitive information

## Mock Archive Utilities

The `tests/helpers/mockArchives.ts` file provides utilities for creating various types of corrupted archives:

- `createCorruptedTarArchive()` - Creates invalid tar files
- `createCorruptedZipArchive()` - Creates invalid zip files
- `createTruncatedTarArchive()` - Creates incomplete tar files
- `createTruncatedZipArchive()` - Creates incomplete zip files
- `createEmptyTarArchive()` - Creates zero-byte tar files
- `createEmptyZipArchive()` - Creates zero-byte zip files
- `createHeaderOnlyTarArchive()` - Creates tar with only header bytes
- `createInternallyCorruptedTarArchive()` - Creates tar with valid header but corrupted content

## Dependencies

- **vitest**: Test framework
- **tar**: TAR archive handling
- **adm-zip**: ZIP archive handling
- **fs**: File system operations
- **path**: Path manipulation

## Related Issues

- **Parent Issue**: [PRI-824](https://linear.app/prince-josh/issue/PRI-824) - Binary Manager Test Enhancements
- **Current Issue**: [PRI-828](https://linear.app/prince-josh/issue/PRI-828) - Corrupted Archive Handling Tests

## Success Criteria (All Met ✅)

- ✅ Corrupted tar archive test passes
- ✅ Corrupted zip archive test passes
- ✅ Partial extraction failure test passes
- ✅ Partial files cleaned up on failure
- ✅ Truncated archive detection test passes
- ✅ Error messages are descriptive
- ✅ Tests execute in < 2 seconds
- ✅ Mock archive helper utilities created

