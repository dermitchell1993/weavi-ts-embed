# 🔄 Migration Schematics

## Overview
Detailed mapping of current scattered test files to target organized structure. This schematic provides exact file-by-file migration paths for the refactoring.

## 📊 Current State Analysis (test-museum branch)

### Monster Files (Primary Targets)
| Current File | Lines | Status | Target Split |
|-------------|-------|--------|--------------|
| `src/binary-manager.test.ts` | 904 | ❌ >333 | 4 files |
| `src/health-checker.test.ts` | 812 | ❌ >333 | 3 files |
| `src/process-manager.test.ts` | 555 | ❌ >333 | 2 files |
| `src/operations.test.ts` | 316 | ⚠️ Near limit | 2 files |

### Scattered Config Tests
| Current File | Lines | Target Location |
|-------------|-------|----------------|
| `src/__tests__/config-defaults.test.ts` | 90 | `tests/unit/config/defaults.test.ts` |
| `src/__tests__/config-validation-basic.test.ts` | 144 | `tests/unit/config/validation-basic.test.ts` |
| `src/__tests__/config-validation-fields.test.ts` | 131 | `tests/unit/config/validation-fields.test.ts` |
| `src/__tests__/config-validation-version.test.ts` | 167 | `tests/unit/config/validation-version.test.ts` |
| `src/__tests__/config-logger.test.ts` | 299 | `tests/unit/config/logger.test.ts` ⚠️ |
| `src/__tests__/config-merge.test.ts` | 104 | `tests/unit/config/merge.test.ts` |
| `src/__tests__/config-pipeline.test.ts` | 81 | `tests/unit/config/pipeline.test.ts` |
| `src/__tests__/config-error.test.ts` | 66 | `tests/unit/config/error.test.ts` |
| `src/__tests__/config-test-helpers.ts` | 120 | `tests/unit/config/helpers.ts` |

### Other Test Files
| Current File | Lines | Target Location | Notes |
|-------------|-------|----------------|-------|
| `src/connectToEmbedded.test.ts` | 244 | `tests/integration/connection.test.ts` | Rename |
| `src/journey.test.ts` | 90 | `tests/integration/journey.test.ts` | Keep name |
| `src/unit.test.ts` | 62 | `tests/unit/unit.test.ts` | Keep name |
| `src/platform.test.ts` | 214 | `tests/unit/platform.test.ts` | Move |

## 🎯 Migration Mapping

### Binary Manager (904 lines → 4 files)

#### 1. download.test.ts (~220 lines)
**Source Lines**: 81-411 (Version Resolution + URL Construction + Download Logic)
**Test Categories**:
- Version resolution logic
- URL construction and validation
- Download initiation
- Retry mechanisms
- Network failure scenarios

#### 2. extraction.test.ts (~210 lines)
**Source Lines**: 412-735 (Download Logic continuation + Extraction Logic)
**Test Categories**:
- Archive extraction (tar.gz, zip)
- Checksum validation
- Caching behavior
- Corrupted archive handling
- File system operations

#### 3. verification.test.ts (~200 lines)
**Source Lines**: 736-863 (Persistence + Integration & Edge Cases)
**Test Categories**:
- Binary integrity verification
- Platform compatibility checks
- Security validations
- Edge case handling
- Error recovery

#### 4. lifecycle.test.ts (~250 lines)
**Source Lines**: 864-904 (Performance & Resource Management)
**Test Categories**:
- Resource management
- Performance optimizations
- End-to-end integration flows
- Cleanup procedures
- Concurrent access handling

### Health Checker (812 lines → 3 files)

#### 1. wait-for-ready.test.ts (~270 lines)
**Source Lines**: 21-668 (All waitForReady scenarios)
**Test Categories**:
- Connection establishment
- Retry logic with backoff
- Timeout handling
- Success/failure paths
- Concurrent access

#### 2. health-status.test.ts (~270 lines)
**Source Lines**: 669-739 (checkHealth + checkLiveness)
**Test Categories**:
- Health endpoint validation
- Liveness probe testing
- Status response parsing
- HTTP error handling
- Different host/port combinations

#### 3. error-handling.test.ts (~270 lines)
**Source Lines**: Various (Edge cases + validation from waitForReady)
**Test Categories**:
- Input validation
- Boundary conditions
- Security edge cases
- Resource cleanup
- Error propagation

### Process Manager (555 lines → 2 files)

#### 1. lifecycle.test.ts (~275 lines)
**Source Lines**: 55-429 (start + stop + cleanup + getConfig)
**Test Categories**:
- Process spawning
- Environment configuration
- Startup sequences
- Shutdown procedures
- Configuration management

#### 2. monitoring.test.ts (~275 lines)
**Source Lines**: 302-555 (isRunning + getPid + kill + getConfig)
**Test Categories**:
- Runtime status checking
- PID retrieval and validation
- Process termination
- Kill signal handling
- Monitoring edge cases

### Operations (316 lines → 2 files)

#### 1. crud.test.ts (~180 lines)
**Source Lines**: 108-244 (Collection Management + CRUD Operations)
**Test Categories**:
- Collection creation/deletion
- Object insertion (single/batch)
- Data updates
- Basic deletion operations

#### 2. advanced.test.ts (~160 lines)
**Source Lines**: 245-316 (Query Operations + Batch Operations + Error Handling)
**Test Categories**:
- Complex queries
- Batch processing
- Error scenarios
- Performance edge cases

## 🔧 Helper Infrastructure Migration

### Current Helper Locations
- `src/__tests__/config-test-helpers.ts` → `tests/helpers/`
- Timeout utilities (scattered) → `tests/helpers/timeout-guard.ts`

### Target Helper Structure
```
tests/helpers/
├── index.ts                    # Barrel export
├── setup.ts                    # Test setup/teardown utilities
├── mocks.ts                    # Mock creation functions
├── fixtures.ts                 # Test data and configurations
├── assertions.ts               # Custom matchers
├── binary-helpers.ts           # Binary-manager specific helpers
├── operations-helpers.ts       # Operations specific helpers
└── timeout-guard.ts            # Timeout management
```

## 📋 Migration Checklist

### Pre-Migration Setup
- [ ] Create `tests/` directory structure
- [ ] Configure path aliases (`@/`, `@tests/`)
- [ ] Set up ESLint max-lines rule
- [ ] Create pre-commit hooks

### File Splitting Execution
- [ ] Split `binary-manager.test.ts` → 4 files
- [ ] Split `health-checker.test.ts` → 3 files
- [ ] Split `process-manager.test.ts` → 2 files
- [ ] Split `operations.test.ts` → 2 files

### Test Migration
- [ ] Move config tests to `tests/unit/config/`
- [ ] Move integration tests to `tests/integration/`
- [ ] Update all import paths to use aliases
- [ ] Verify test execution after each move

### Infrastructure Migration
- [ ] Consolidate helpers into `tests/helpers/`
- [ ] Move fixtures to `tests/fixtures/`
- [ ] Update setup files to `tests/setup/`

### Validation & Cleanup
- [ ] Run full test suite after each phase
- [ ] Verify line count constraints
- [ ] Remove obsolete files
- [ ] Update documentation

## ⚠️ Special Handling Required

### Config Logger Tests
`config-logger.test.ts` (299 lines) may need further splitting:
- Split into `logger-basic.test.ts` and `logger-advanced.test.ts`
- Or integrate smaller pieces into other config test files

### Import Path Updates
All files will need import updates:
```typescript
// Before
import { someHelper } from '../../../__tests__/config-test-helpers'

// After
import { someHelper } from '@tests/helpers'
```

### Test Dependencies
Some tests may have interdependencies that need careful handling during splitting.

## 📊 Success Validation

### Quantitative Metrics
- [ ] All files ≤333 lines
- [ ] Test coverage maintained
- [ ] CI time unchanged
- [ ] Zero tests in `src/` directory

### Qualitative Metrics
- [ ] Clear test organization by concern
- [ ] Consistent import patterns
- [ ] Easy test discovery (<30 seconds)
- [ ] No redundant test code

---

*Generated: Phase 0 Research Analysis*
*Status: Ready for Phase 1 Execution*

