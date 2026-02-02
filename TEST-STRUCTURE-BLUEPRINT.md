# 🏗️ Test Structure Blueprint

## Overview
This blueprint outlines the target test organization for the Weaviate TS Embedded project, transforming scattered tests into a clean, modular structure with ≤333 lines per file.

## 📁 Target Directory Structure

```
weavi-ts-embed/
├── src/                          # Source code only
├── tests/                        # All tests (single source of truth)
│   ├── unit/                     # Unit tests by module
│   │   ├── binary-manager/       # Binary manager tests (4 files)
│   │   │   ├── download.test.ts      (~220 lines)
│   │   │   ├── extraction.test.ts    (~210 lines)
│   │   │   ├── verification.test.ts  (~200 lines)
│   │   │   └── lifecycle.test.ts     (~250 lines)
│   │   ├── health-checker/       # Health checker tests (3 files)
│   │   │   ├── wait-for-ready.test.ts  (~270 lines)
│   │   │   ├── health-status.test.ts   (~270 lines)
│   │   │   └── error-handling.test.ts  (~270 lines)
│   │   ├── process-manager/      # Process manager tests (2 files)
│   │   │   ├── lifecycle.test.ts       (~275 lines)
│   │   │   └── monitoring.test.ts      (~275 lines)
│   │   ├── operations/           # Operations tests (2 files)
│   │   │   ├── crud.test.ts             (~180 lines)
│   │   │   └── advanced.test.ts         (~160 lines)
│   │   ├── config/               # Config tests (9 files)
│   │   │   ├── defaults.test.ts         (~90 lines)
│   │   │   ├── validation-basic.test.ts (~144 lines)
│   │   │   ├── validation-fields.test.ts (~131 lines)
│   │   │   ├── validation-version.test.ts (~167 lines)
│   │   │   ├── logger.test.ts           (~299 lines) ⚠️ NEEDS SPLITTING
│   │   │   ├── merge.test.ts            (~104 lines)
│   │   │   ├── pipeline.test.ts         (~81 lines)
│   │   │   ├── error.test.ts            (~66 lines)
│   │   │   └── helpers.ts               (~120 lines)
│   │   └── [other unit tests]     # Platform, unit, etc.
│   ├── integration/              # Integration tests
│   │   ├── connection.test.ts     # connectToEmbedded
│   │   ├── journey.test.ts        # End-to-end flows
│   │   └── [other integration tests]
│   ├── security/                 # Security-specific tests
│   ├── performance/              # Performance benchmarks
│   ├── helpers/                  # Shared test utilities (8 files)
│   │   ├── index.ts               (~50 lines)  # Barrel export
│   │   ├── setup.ts               (~150 lines) # Test setup/teardown
│   │   ├── mocks.ts               (~200 lines) # Mock creation
│   │   ├── fixtures.ts            (~150 lines) # Test data
│   │   ├── assertions.ts          (~100 lines) # Custom matchers
│   │   ├── binary-helpers.ts      (~150 lines) # Binary-specific
│   │   ├── operations-helpers.ts  (~100 lines) # Operations-specific
│   │   └── timeout-guard.ts       (~80 lines)  # Timeout utilities
│   ├── fixtures/                 # Test data files
│   └── setup/                    # Test configuration
├── TESTING.md                    # Root-level testing guide
└── [configs updated with aliases]
```

## 📊 File Size Constraints

- **Maximum lines per file**: 333 lines
- **Target average**: ≤250 lines per file
- **Enforcement**: ESLint rule + pre-commit hook + CI validation

## 🎯 Test Categories & Responsibilities

### Binary Manager Tests
**download.test.ts** (~220 lines)
- Version resolution logic
- URL construction
- Download initiation and retry logic
- Network failure handling

**extraction.test.ts** (~210 lines)
- Archive extraction (tar.gz, zip)
- Checksum validation
- Caching mechanisms
- Corrupted archive handling

**verification.test.ts** (~200 lines)
- Binary integrity checks
- Platform compatibility
- Security validations
- Edge case handling

**lifecycle.test.ts** (~250 lines)
- Persistence and data paths
- Resource management
- Performance optimizations
- End-to-end integration

### Health Checker Tests
**wait-for-ready.test.ts** (~270 lines)
- Connection establishment
- Retry logic with exponential backoff
- Timeout handling
- Success/failure scenarios

**health-status.test.ts** (~270 lines)
- Health endpoint checking
- Liveness probe validation
- Status response parsing
- Error condition handling

**error-handling.test.ts** (~270 lines)
- Input validation
- Boundary condition testing
- Security edge cases
- Resource cleanup verification

### Process Manager Tests
**lifecycle.test.ts** (~275 lines)
- Process spawning and configuration
- Environment variable handling
- Startup and shutdown sequences
- Configuration persistence

**monitoring.test.ts** (~275 lines)
- Runtime status checking
- PID management
- Process termination handling
- Resource monitoring

### Operations Tests
**crud.test.ts** (~180 lines)
- Collection creation/management
- Object insertion (single and batch)
- Data updates and deletion
- Basic query operations

**advanced.test.ts** (~160 lines)
- Complex query patterns
- Batch operations
- Error handling and recovery
- Performance edge cases

## 🔗 Import Strategy

### Path Aliases
```typescript
// tsconfig.test.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@tests/*": ["tests/*"]
    }
  }
}
```

### Import Examples
```typescript
// Clean imports throughout codebase
import { setupBinaryTest } from '@tests/helpers';
import { createMockArchive } from '@tests/helpers/mocks';
import { configDefaults } from '@tests/fixtures';
```

## 📈 Quality Metrics

- **Test Coverage**: Maintain ≥ current baseline
- **CI Performance**: No degradation in test execution time
- **Developer Experience**: "Add test" time <30 seconds
- **Code Quality**: Zero redundancy, maximum reuse
- **Maintainability**: Clear separation of concerns

## 🚨 Special Considerations

### Files Requiring Attention
- `config-logger.test.ts` (299 lines) - May need further splitting
- Complex test scenarios with extensive setup
- Performance-critical test paths

### Migration Strategy
- Start with foundation (Phase 1-3)
- Split monsters systematically (Phase 4)
- Migrate and organize remaining tests (Phase 5-8)
- Add enforcement (Phase 9)
- Cleanup and documentation (Phase 10-12)

---

*Generated: Phase 0 Research Analysis*
*Status: Ready for Implementation*

