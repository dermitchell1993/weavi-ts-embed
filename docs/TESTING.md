# Testing Guide

## Overview

This project includes a comprehensive test suite with **119 unit tests** covering all core modules. Tests are designed to run quickly without requiring full Weaviate startup, using mocking to isolate functionality.

## Test Coverage

### Current Coverage Metrics
- **Statements**: 78.02% (948/1215)
- **Branches**: 80.92% (123/152) ✅
- **Functions**: 70.58% (24/34)
- **Lines**: 78.02% (948/1215)

### Module Coverage Breakdown

| Module | Statements | Branches | Functions | Lines | Tests |
|--------|-----------|----------|-----------|-------|-------|
| **binary-manager.ts** | 47.52% | 64.51% | 47.05% | 47.52% | 13 |
| **connectToEmbedded.ts** | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ | 17 |
| **embedded-options.ts** | 87.7% | 63.33% | 100% ✅ | 87.7% | 34 |
| **health-check.ts** | 98.81% | 90.9% | 100% ✅ | 98.81% | 15 |
| **port-utils.ts** | 100% ✅ | 100% ✅ | 100% ✅ | 100% ✅ | 11 |
| **weaviate-process.ts** | 81.36% | 89.13% | 85.71% | 81.36% | 30 |

**Total Tests**: 119 unit tests (excluding integration tests)

## Test Categories

### Unit Tests
Fast, isolated tests that run without external dependencies:
- **Location**: `src/**/*.test.ts`
- **Execution Time**: ~6-7 seconds
- **Count**: 119 tests

#### Covered Functionality:
1. **Binary Manager** (`binary-manager.test.ts`)
   - Binary download and caching
   - Platform detection (OS/architecture)
   - Checksum verification
   - Error handling for network failures

2. **Embedded Options** (`embedded-options.test.ts`)
   - Options validation
   - Default value handling
   - Port configuration
   - Environment variable validation
   - Type checking for all configuration options

3. **Port Utilities** (`port-utils.test.ts`)
   - Port availability checking
   - Random port allocation
   - Port range validation
   - Conflict detection

4. **Health Check** (`health-check.test.ts`)
   - HTTP health endpoint mocking
   - Retry logic with backoff
   - Timeout handling
   - Connection failure scenarios

5. **Weaviate Process** (`weaviate-process.test.ts`)
   - Process lifecycle management
   - Start/stop operations
   - Signal handling
   - Cleanup on exit
   - Error recovery

6. **Connect to Embedded** (`connectToEmbedded.test.ts`)
   - Client initialization
   - Configuration merging
   - Connection establishment
   - Authentication setup
   - Error handling

### Integration Tests
Slower tests that verify end-to-end functionality:
- **Location**: `tests/integration/**/*.test.ts`
- **Execution Time**: Varies (requires Weaviate binary)
- **Scope**: Port conflicts, full lifecycle

## Running Tests

### All Tests (Unit + Integration)
```bash
npm test
```

### Unit Tests Only (Fast)
```bash
npm run test:unit
```
**Execution Time**: ~6-7 seconds

### Unit Tests with Coverage
```bash
npm run test:unit:coverage
```

### Watch Mode
```bash
npm run test:unit -- --watch
```

### Specific Test File
```bash
npm run test:unit -- binary-manager.test.ts
```

### Verbose Output
```bash
npm run test:unit -- --verbose
```

## Test Structure

### Mocking Strategy
Tests use Jest's mocking capabilities to avoid external dependencies:
- **File System**: Temporary directories for isolated testing
- **Network Requests**: Mocked HTTP calls
- **Child Processes**: Mocked process spawning
- **Binary Downloads**: Simulated download scenarios

### Test Organization
```
src/
├── binary-manager.ts
├── binary-manager.test.ts      # Co-located with source
├── connectToEmbedded.ts
├── connectToEmbedded.test.ts
├── embedded-options.ts
├── embedded-options.test.ts
└── ...

tests/
└── integration/                # Separate integration tests
    └── port-conflicts.test.ts
```

## Configuration Files

### `jest.config.cjs`
Main Jest configuration for all tests (unit + integration).

### `jest.unit.config.cjs`
Optimized configuration for fast unit test execution:
- Excludes integration tests
- Uses parallel execution (50% CPU cores)
- Co-located test pattern: `**/src/**/*.test.ts`

## Writing New Tests

### Best Practices
1. **Co-locate Tests**: Place test files next to source files in `src/`
2. **Use Descriptive Names**: `describe()` blocks should clearly indicate what's being tested
3. **Mock External Dependencies**: Avoid network calls, file I/O in unit tests
4. **Test Edge Cases**: Include error scenarios, boundary conditions
5. **Keep Tests Fast**: Unit tests should complete in milliseconds
6. **Use `beforeEach`/`afterEach`**: Clean up test state properly

### Example Test Structure
```typescript
import { MyModule } from './my-module';

describe('MyModule', () => {
  let instance: MyModule;

  beforeEach(() => {
    instance = new MyModule();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Test error handling
    });
  });
});
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Manual workflow dispatch

### CI Configuration
See `.github/workflows/` for GitHub Actions configuration.

## Performance Benchmarks

| Test Suite | Test Count | Execution Time | Target |
|-----------|-----------|----------------|---------|
| Unit Tests | 119 | ~6-7s | < 10s ✅ |
| Integration Tests | 1 | ~5s | < 30s ✅ |
| **Total** | **120** | **~11-13s** | **< 60s ✅** |

## Coverage Goals

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Statements | 78.02% | 80% | 🟡 Close |
| Branches | 80.92% | 80% | ✅ Met |
| Functions | 70.58% | 70% | ✅ Met |
| Lines | 78.02% | 80% | 🟡 Close |

### Uncovered Areas
Most uncovered code is in edge cases and error handling paths:
- **binary-manager.ts**: Download error scenarios, checksum failures
- **weaviate-process.ts**: Process signal handling, crash recovery

These areas are difficult to test in unit tests and are better covered by integration tests or manual testing.

## Debugging Tests

### Run with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --config jest.unit.config.cjs --runInBand
```

### View Failed Test Output
```bash
npm run test:unit -- --verbose --no-coverage
```

### Enable Debug Logs
```bash
DEBUG=* npm run test:unit
```

## Known Issues

### Test Hanging
Some tests may require `--forceExit` flag due to async operations:
```bash
npm run test:unit -- --forceExit
```

This is expected and does not indicate test failures.

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Aim for 80%+ coverage on new code
3. Run `npm run test:unit:coverage` to verify
4. Update this documentation if adding new test categories

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)

