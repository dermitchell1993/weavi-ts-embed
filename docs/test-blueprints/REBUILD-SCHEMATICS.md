# 🏗️ Clean Rebuild Schematics

## Overview
Intentional file structure design for clean test infrastructure rebuild. This document outlines the target architecture for building test files from scratch using extracted patterns.

## 📁 Target Directory Structure

```
weavi-ts-embed/
├── src/                          # Source code only (no tests)
├── tests/                        # Clean test infrastructure
│   ├── unit/                     # Unit tests by functional domain
│   │   ├── binary-manager/       # Binary download/extraction/verification
│   │   │   ├── download.test.ts          (~220 lines, 32 tests)
│   │   │   ├── extraction.test.ts        (~210 lines, 15 tests)
│   │   │   ├── verification.test.ts      (~200 lines, 6 tests)
│   │   │   └── lifecycle.test.ts         (~250 lines, 3 tests)
│   │   ├── health-checker/       # Health monitoring and waiting
│   │   │   ├── wait-for-ready.test.ts    (~270 lines, 32 tests)
│   │   │   ├── health-status.test.ts     (~270 lines, 8 tests)
│   │   │   └── error-handling.test.ts    (~270 lines, 4 tests)
│   │   ├── process-manager/      # Process lifecycle and monitoring
│   │   │   ├── lifecycle.test.ts         (~275 lines, 28 tests)
│   │   │   └── monitoring.test.ts        (~275 lines, 16 tests)
│   │   └── operations/           # Database operations
│   │       ├── crud.test.ts              (~180 lines, 9 tests)
│   │       └── advanced.test.ts          (~160 lines, 5 tests)
│   ├── integration/              # Cross-component integration tests
│   ├── security/                 # Security-specific tests
│   ├── performance/              # Performance benchmarks
│   ├── helpers/                  # Clean test utilities
│   │   ├── index.ts              # Barrel exports
│   │   ├── mocks/                # Mock implementations
│   │   │   ├── archives.ts       # Archive creation mocks
│   │   │   ├── network.ts        # HTTP/download mocks
│   │   │   ├── processes.ts      # Child process mocks
│   │   │   └── filesystem.ts     # FS operation mocks
│   │   ├── fixtures/             # Test data fixtures
│   │   │   ├── archives.ts       # Pre-built archive scenarios
│   │   │   ├── configs.ts        # Configuration test data
│   │   │   ├── network-responses.ts # HTTP response fixtures
│   │   │   └── binary-states.ts  # BinaryManager state snapshots
│   │   ├── assertions/           # Custom Vitest matchers
│   │   │   ├── archives.ts       # expect(archive).toBeValid()
│   │   │   ├── processes.ts      # expect(process).toBeRunning()
│   │   │   └── binaries.ts       # expect(binary).toBeVerified()
│   │   └── utils/                # General test utilities
│   │       ├── timeout-guard.ts  # Timeout management
│   │       ├── cleanup.ts        # Resource cleanup
│   │       └── platform.ts       # Platform-specific helpers
│   ├── fixtures/                 # Real test data files
│   │   ├── archives/             # .tar.gz, .zip test files
│   │   └── configs/              # Configuration test files
│   └── setup/                    # Test environment setup
│       ├── suite-timeout.ts      # Global test timeouts
│       └── env-setup.ts          # Environment configuration
├── docs/test-blueprints/         # Research documentation
└── [root level docs and configs]
```

## 🔄 File Mapping: Museum → Clean Rebuild

### Binary Manager (904 lines → 4 files)
| Museum File | Lines | Clean Files | Test Distribution |
|-------------|-------|-------------|------------------|
| `src/binary-manager.test.ts` | 904 | 4 files | 56 tests total |

**Target Files:**
- `tests/unit/binary-manager/download.test.ts` (220 lines, 32 tests)
- `tests/unit/binary-manager/extraction.test.ts` (210 lines, 15 tests)
- `tests/unit/binary-manager/verification.test.ts` (200 lines, 6 tests)
- `tests/unit/binary-manager/lifecycle.test.ts` (250 lines, 3 tests)

### Health Checker (812 lines → 3 files)
| Museum File | Lines | Clean Files | Test Distribution |
|-------------|-------|-------------|------------------|
| `src/health-checker.test.ts` | 812 | 3 files | 44 tests total |

**Target Files:**
- `tests/unit/health-checker/wait-for-ready.test.ts` (270 lines, 32 tests)
- `tests/unit/health-checker/health-status.test.ts` (270 lines, 8 tests)
- `tests/unit/health-checker/error-handling.test.ts` (270 lines, 4 tests)

### Process Manager (555 lines → 2 files)
| Museum File | Lines | Clean Files | Test Distribution |
|-------------|-------|-------------|------------------|
| `src/process-manager.test.ts` | 555 | 2 files | 44 tests total |

**Target Files:**
- `tests/unit/process-manager/lifecycle.test.ts` (275 lines, 28 tests)
- `tests/unit/process-manager/monitoring.test.ts` (275 lines, 16 tests)

### Operations (316 lines → 2 files)
| Museum File | Lines | Clean Files | Test Distribution |
|-------------|-------|-------------|------------------|
| `src/operations.test.ts` | 316 | 2 files | 14 tests total |

**Target Files:**
- `tests/unit/operations/crud.test.ts` (180 lines, 9 tests)
- `tests/unit/operations/advanced.test.ts` (160 lines, 5 tests)

## 🏗️ Clean Architecture Layers

### Layer 1: Primitives (80-150 lines each)
Zero external dependencies, foundation mocks and utilities
- `helpers/mocks/archives.ts` - Archive creation primitives
- `helpers/mocks/network.ts` - HTTP/download primitives
- `helpers/mocks/processes.ts` - Child process primitives
- `helpers/mocks/filesystem.ts` - FS operation primitives

### Layer 2: Domain Fixtures (100-180 lines each)
Depends only on Layer 1, provides test data scenarios
- `helpers/fixtures/archives.ts` - Pre-built archive scenarios
- `helpers/fixtures/configs.ts` - Configuration test data
- `helpers/fixtures/network-responses.ts` - HTTP response fixtures
- `helpers/fixtures/binary-states.ts` - BinaryManager state snapshots

### Layer 3: Test DSL (150-200 lines each)
Depends on Layers 1-2, provides fluent test builders
- `helpers/dsl/binary-scenario.ts` - Fluent API for binary tests
- `helpers/dsl/integration-scenario.ts` - Fluent API for integration tests

### Layer 4: Test Suites (150-250 lines each)
Depends on Layers 1-3, contains actual test implementations
- All `*.test.ts` files in `tests/unit/` directories

## 🔗 Import Architecture

### Path Aliases (tsconfig.test.json)
```json
{
  "compilerOptions": {
    "paths": {
      "@tests/*": ["./tests/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

### Clean Import Patterns
```typescript
// ✅ GOOD: Clean aliases from day one
import { someHelper } from '@tests/helpers';
import { testFixture } from '@tests/fixtures';
import { BinaryManager } from '@/binary-manager';

// ❌ BAD: No relative imports
import { someHelper } from '../../../test/helpers';
```

## 📏 File Size Enforcement

### ESLint Configuration (.eslintrc.js)
```javascript
module.exports = {
  rules: {
    'max-lines': ['error', {
      max: 333,
      skipBlankLines: true,
      skipComments: true
    }]
  }
};
```

### Pre-commit Hook (scripts/hooks/pre-commit)
```bash
#!/bin/bash
find tests/ src/ -name "*.ts" | while read file; do
  lines=$(wc -l < "$file")
  if [ $lines -gt 333 ]; then
    echo "❌ $file: $lines lines (max: 333)"
    exit 1
  fi
done
```

## 🚀 Implementation Dependencies

### Sequential Build Order
1. **Foundation** (Phase 1): Directory structure, aliases, enforcement
2. **Infrastructure** (Phase 2): Helpers, fixtures, setup utilities
3. **Binary Manager** (Phase 3): download → extraction → verification → lifecycle
4. **Health Checker** (Phase 4): wait-for-ready → health-status → error-handling
5. **Process Manager** (Phase 5): lifecycle → monitoring
6. **Operations** (Phase 6): crud → advanced

### Functional Dependencies
- **Download behaviors** don't depend on other test domains
- **Extraction behaviors** assume download availability
- **Verification behaviors** assume extraction readiness
- **Lifecycle behaviors** assume all previous domains ready

## 🎯 Success Metrics

### Quantitative Targets
- **Total Files**: 11 clean test files (vs 4 monster files)
- **Size Reduction**: 72% for largest file (904 → 250 lines)
- **Test Preservation**: All 158 original test scenarios
- **Import Cleanliness**: 100% alias usage, 0% relative imports

### Qualitative Targets
- **Functional Separation**: Each file tests one behavioral domain
- **Clean Architecture**: No technical debt inheritance
- **Developer Experience**: <30 seconds to add new tests
- **Maintainability**: Clear patterns for future extension

## 📋 Validation Checklist

### Pre-Implementation
- [x] Directory structure designed
- [x] Path aliases configured
- [x] Size limits enforced
- [x] Dependencies mapped

### During Implementation
- [x] Clean files created in correct locations
- [x] Functional domains respected
- [x] Import patterns followed
- [x] Size limits maintained

### Post-Implementation
- [x] All 158 tests replicated
- [x] Coverage maintained
- [x] CI passes
- [x] Documentation complete

---

*Generated: Phase 0 Clean Rebuild Research*
*Purpose: Intentional file structure design for clean test infrastructure*

