# Unit Tests Inventory Blueprint

## Overview
- **Total unit test files**: 15 files
- **Total lines**: 4,065 lines across all unit tests
- **Files needing splits** (>333 lines): 3 files
- **Files within limits** (≤333 lines): 12 files
- **Largest file**: binary-manager.test.ts (904 lines → 4 files needed)
- **Second largest**: health-checker.test.ts (812 lines → 3 files needed)

## Files Requiring Splits

### binary-manager.test.ts (904 lines)
- **Status**: Requires split into 4 files (~225 lines each)
- **Location**: src/binary-manager.test.ts
- **Categories**: Version resolution, URL construction, checksum/caching, download logic, extraction logic, persistence, integration/edge cases, performance
- **Note**: Already analyzed in binary-manager.md blueprint

### health-checker.test.ts (812 lines)
- **Status**: Requires split into 3 files (~270 lines each)
- **Location**: src/health-checker.test.ts
- **Test count**: ~15 tests
- **Categories**: Health check logic, network error handling, timeout scenarios, HTTP status codes, connection validation

### operations.test.ts (316 lines)
- **Status**: Requires split into 2 files (~160 lines each)
- **Location**: src/operations.test.ts
- **Test count**: ~15 tests
- **Categories**: Collection management, CRUD operations, query operations, batch operations, error handling
- **Note**: Already analyzed in operations.md blueprint

## Files Within Limits (≤333 lines)

### Configuration Tests (src/__tests__/)
- **config-logger.test.ts** (299 lines) - Logger configuration and behavior
- **config-validation-version.test.ts** (167 lines) - Version validation logic
- **config-validation-basic.test.ts** (144 lines) - Basic configuration validation
- **config-validation-fields.test.ts** (131 lines) - Field validation logic
- **config-merge.test.ts** (104 lines) - Configuration merging logic
- **config-defaults.test.ts** (90 lines) - Default configuration values
- **config-pipeline.test.ts** (81 lines) - Configuration pipeline processing
- **config-error.test.ts** (66 lines) - Error handling in configuration

### Other Unit Tests
- **connectToEmbedded.test.ts** (244 lines) - Connection factory function tests
- **process-manager.test.ts** (555 lines) - Process management functionality
- **journey.test.ts** (90 lines) - End-to-end journey tests
- **unit.test.ts** (62 lines) - Basic EmbeddedOptions unit tests

## Migration Strategy

### Files to Move to tests/unit/ (13 files)
All files currently in src/ with .test.ts extension should move to tests/unit/:

1. **binary-manager.test.ts** → Split into 4 files in tests/unit/binary-manager/
2. **health-checker.test.ts** → Split into 3 files in tests/unit/health-checker/
3. **operations.test.ts** → Split into 2 files in tests/unit/operations/
4. **connectToEmbedded.test.ts** → tests/unit/connectToEmbedded.test.ts
5. **process-manager.test.ts** → tests/unit/process-manager.test.ts
6. **journey.test.ts** → tests/unit/journey.test.ts
7. **unit.test.ts** → tests/unit/embedded-options.test.ts (rename for clarity)

### Configuration Tests Migration
Move src/__tests__/ directory to tests/unit/config/:
- **src/__tests__/config-*.test.ts** → **tests/unit/config/*.test.ts**
- Maintain existing file names for consistency

## Embedded Options Duplication Analysis

### Current Status
- **unit.test.ts** (62 lines): Basic EmbeddedOptions constructor and validation tests
- **No embedded-options.test.ts file found** - contrary to plan assumptions
- **No duplication detected** - unit.test.ts appears to be the primary EmbeddedOptions test file

### Resolution
- Rename **unit.test.ts** → **embedded-options.test.ts** during migration
- No duplication removal needed
- File is well within size limits (62 lines)

## Size Analysis Summary

| Size Range | File Count | Total Lines | Notes |
|------------|------------|-------------|-------|
| >333 lines | 3 | 2,032 | Require splitting |
| 101-333 lines | 7 | 1,726 | Can move as-is |
| ≤100 lines | 5 | 307 | Can move as-is |

## Implementation Notes

- **Splitting priority**: binary-manager.test.ts (904 lines) and health-checker.test.ts (812 lines) are the main concerns
- **Configuration tests**: Keep organized in tests/unit/config/ subdirectory
- **Naming consistency**: Use descriptive names (e.g., embedded-options.test.ts instead of unit.test.ts)
- **Import updates**: All files will need import path updates from relative to @tests/ aliases
- **Test isolation**: Ensure no shared state between split files

## Next Steps

1. Use binary-manager.md and operations.md blueprints for splitting those files
2. Analyze health-checker.test.ts structure for splitting strategy
3. Plan configuration test reorganization
4. Update all import statements to use new @tests/ aliases

