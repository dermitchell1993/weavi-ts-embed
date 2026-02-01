# Documentation Index

Welcome to the weavi-ts-embed documentation! This directory contains technical documentation, performance analysis, and development guides.

## 📚 Available Documentation

### Performance & Testing

- **[test-performance.md](test-performance.md)** - Comprehensive test performance analysis
  - Test suite architecture (30 files analyzed)
  - Phase 1 & 2.3 validation results
  - Bottleneck identification (Weaviate startup time)
  - Performance projections & optimization roadmap
  - *Updated: 2026-02-01*

- **[PHASE_2.4_SUMMARY.md](PHASE_2.4_SUMMARY.md)** - Phase 2.4 completion report
  - Validation checklist for all test optimization phases
  - CI integration details
  - Lessons learned & recommendations
  - *Completed: 2026-02-01*

## 🎯 Quick Links

### For Contributors

- [Test Performance Analysis](test-performance.md) - Understand test timing and optimization strategies
- [Main README](../README.md) - Project overview and usage examples
- [Contributing Guide](../CONTRIBUTING.md) - Development workflow (if exists)

### For Performance Analysis

**Key Metrics:**
- Total test files: **30**
- Integration test files: **3** (sequential execution)
- Operations test file: **1** (15 tests, shared instance)
- Current estimated CI time: **16-21 min**
- Target CI time: **2-4 min**

**Primary Bottleneck:**
- Weaviate startup time: **60-90s per instance**
- Accounts for **~87%** of total test time

### For Test Development

**Test Script Usage:**
```bash
# Run individual test suites
npm run test:unit          # Unit tests (fast, no Weaviate)
npm run test:integration   # Integration tests (sequential)
npm run test:operations    # Operations tests (shared instance)

# Run all tests with timing instrumentation
npm run test:ci:timed      # Outputs test-metrics.json with timing data

# Run standard CI pipeline
npm run test:ci
```

**Performance Measurement:**
```bash
# Generate performance metrics
bash scripts/measure-test-performance.sh

# View metrics
cat test-metrics.json | jq .
```

## 📊 Test Suite Architecture

```
30 test files total:
├── Unit Tests (8 files)
│   └── Fast, no Weaviate dependencies
├── Integration Tests (14 files)
│   ├── journey.test.ts (config tests)
│   ├── operations.test.ts (shared instance pattern)
│   └── env-vars, port-conflicts, lifecycle, etc.
├── Security Tests (2 files)
│   └── Archive validation, corruption handling
└── Performance Tests (1 file)
    └── Benchmarking suite
```

## 🚀 Recent Changes

### Phase 2.4 (2026-02-01)
- ✅ Integrated operations.test.ts into CI pipeline
- ✅ Added timing instrumentation script
- ✅ Documented performance bottlenecks
- ✅ Provided optimization roadmap

### Phase 2.3 (Merged PR #74)
- ✅ Created operations.test.ts (15 tests, shared instance)
- ✅ Reduced Weaviate startups from 15+ to 1

### Phase 1 (Complete)
- ✅ Implemented file-sequential execution
- ✅ Eliminated race conditions & port conflicts

## 🔮 Future Phases

**Phase 3 Recommendations:**
1. Consolidate more tests into shared-instance pattern
2. Target: 30+ tests with 2-3 Weaviate startups
3. Est. additional savings: 8-12 minutes

See [test-performance.md](test-performance.md) for detailed recommendations.

---

**Last Updated:** 2026-02-01  
**Maintainer:** weavi-ts-embed team

