# Helpers Consolidation Blueprint

## Overview
- **Current helper files**: 7 files (1387 lines total)
- **Target consolidation**: 8 files (~930 lines total)
- **Consolidation ratio**: 22→8 files (62% reduction)
- **Approach**: Purpose-based organization instead of scattered utilities

## Current Helper Files Analysis

### Archive & Mocking Files (883 lines)
1. **mockArchives.ts** (274 lines) - Archive creation utilities
2. **securityArchives.ts** (332 lines) - Security-focused archive generators
3. **networkUtils.ts** (185 lines) - Network/HTTP mocking utilities
4. **processUtils.ts** (322 lines) - Process management, port checking

### Configuration & Setup Files (274 lines)
5. **config-test-helpers.ts** (120 lines) - Config-specific test helpers
6. **suiteTimeout.ts** (56 lines) - Test suite timeout configuration
7. **timeoutGuard.ts** (98 lines) - Timeout guard implementation

## Target Consolidation Structure

### 1. index.ts (~50 lines) - Barrel Export
**Purpose**: Single entry point for all helper imports
**Content**: Re-exports from all other helper files
**Pattern**:
```typescript
// tests/helpers/index.ts
export * from './setup';
export * from './mocks';
export * from './fixtures';
export * from './assertions';
export * from './binary-helpers';
export * from './operations-helpers';
export * from './timeout-guard';
```

### 2. setup.ts (~150 lines) - Test Setup/Teardown
**Source files**: suiteTimeout.ts, processUtils.ts (partial)
**Functions**:
- `setupSuiteTimeout()` - Suite-level timeout management
- `setupBinaryTest()` - Binary test environment setup
- `cleanupBinaryTest()` - Binary test cleanup
- `getRandomPort()` - Port discovery utility
- `isPortAvailable()` - Port availability checking

### 3. mocks.ts (~200 lines) - Archive/Network/Process Mocking
**Source files**: mockArchives.ts, networkUtils.ts, processUtils.ts (partial)
**Functions**:
- Archive mocking: `createCorruptedTarArchive()`, `createCorruptedZipArchive()`
- Network mocking: `mockHttpsGet()`, `createRetryOptions()`
- Process mocking: `mockProcessSpawn()`, `mockFsOperations()`
- Security mocking: `createZipBomb()`, `createPathTraversalArchive()`

### 4. fixtures.ts (~150 lines) - Test Data & Configurations
**Source files**: config-test-helpers.ts, securityArchives.ts (partial)
**Content**:
- `validVersions` - Valid version test data
- `invalidVersions` - Invalid version test data
- `testConfigurations` - Common test configurations
- `securityTestArchives` - Pre-built security test archives

### 5. assertions.ts (~100 lines) - Custom Matchers
**Source files**: New file (extracted patterns)
**Functions**:
- Custom Vitest matchers for common assertions
- Collection operation assertions
- Binary manager state assertions
- Error message pattern matchers

### 6. binary-helpers.ts (~150 lines) - Binary-Manager Specific
**Source files**: mockArchives.ts, securityArchives.ts, networkUtils.ts
**Functions**:
- `setupBinaryManagerTest()` - Binary manager test setup
- `createTestArchive()` - Archive creation for binary tests
- `mockDownloadResponse()` - Download mocking utilities
- `verifyBinaryExtraction()` - Extraction verification helpers

### 7. operations-helpers.ts (~100 lines) - Operations Specific
**Source files**: config-test-helpers.ts (partial), processUtils.ts (partial)
**Functions**:
- `genName()` - Unique name generation
- `verifyConnection()` - Connection verification with retry
- `createTestCollection()` - Collection creation helpers
- `cleanupCollections()` - Collection cleanup utilities

### 8. timeout-guard.ts (~80 lines) - Timeout Guard
**Source files**: timeoutGuard.ts
**Functions**:
- `withTimeout()` - Timeout wrapper for async operations
- `createTimeoutController()` - AbortController with timeout
- `TimeoutError` - Custom timeout error class

## Consolidation Benefits

### Code Organization
- **Purpose-based grouping**: Related functionality together
- **Reduced file count**: 7→8 files (but more focused)
- **Clear responsibilities**: Each file has a single, clear purpose
- **Easier maintenance**: Related code changes are localized

### Import Simplification
**Before** (scattered imports):
```typescript
import { createCorruptedTarArchive } from '../../../test/helpers/mockArchives';
import { getRandomPort } from '../../../test/helpers/processUtils';
import { validVersions } from '../../../src/__tests__/config-test-helpers';
```

**After** (barrel exports):
```typescript
import { createCorruptedTarArchive, getRandomPort, validVersions } from '@tests/helpers';
```

### Usage Pattern Shift

**Old Pattern** (elaborate DSL):
```typescript
scenario().withArchive('corrupted').expectError().run()
```

**New Pattern** (simple functions):
```typescript
const { binaryManager, cleanup } = await setupBinaryTest({
  archive: 'corrupted',
  network: 'online'
});
await expect(binaryManager.extract()).rejects.toThrow('EXTRACTION_FAILED');
await cleanup();
```

## Migration Strategy

### Phase 1: Create New Structure
1. Create `tests/helpers/` directory structure
2. Create 8 new helper files with consolidated functionality
3. Extract and adapt code from existing helper files
4. Update imports to use new structure

### Phase 2: Update Test Files
1. Update all test file imports to use `@tests/helpers` barrel export
2. Replace elaborate DSL usage with simple function calls
3. Verify all tests still pass with new helpers

### Phase 3: Remove Old Files
1. Delete old helper files after successful migration
2. Update any remaining references
3. Verify no broken imports

## Implementation Notes

- **Backward compatibility**: Maintain function signatures where possible
- **Type safety**: Preserve TypeScript types and interfaces
- **Error handling**: Consolidate error handling patterns
- **Performance**: No performance impact from consolidation
- **Testing**: Helpers should be tested in isolation where appropriate

## File Size Distribution

| File | Target Lines | Purpose |
|------|-------------|---------|
| index.ts | ~50 | Barrel exports |
| setup.ts | ~150 | Test environment setup |
| mocks.ts | ~200 | Mocking utilities |
| fixtures.ts | ~150 | Test data |
| assertions.ts | ~100 | Custom matchers |
| binary-helpers.ts | ~150 | Binary-specific helpers |
| operations-helpers.ts | ~100 | Operations-specific helpers |
| timeout-guard.ts | ~80 | Timeout management |

**Total**: ~930 lines (32% reduction from 1387 lines)</content>
</xai:function_call/>
</xai:function_call name="run_command">
<parameter name="command">git add docs/test-blueprints/helpers-consolidation.md

