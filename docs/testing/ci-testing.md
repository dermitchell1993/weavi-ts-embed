# CI/CD Testing Documentation

This document explains the testing strategy and performance characteristics of the CI/CD pipeline for the Weaviate TypeScript Embedded Client.

## Table of Contents

- [Overview](#overview)
- [Node.js Version Support](#nodejs-version-support)
- [CI/CD Pipeline Structure](#cicd-pipeline-structure)
- [Performance Optimization Strategy](#performance-optimization-strategy)
- [Local Testing](#local-testing)

---

## Overview

The CI/CD pipeline is designed to ensure code quality and compatibility across multiple Node.js versions (18, 20, 22) and platforms (Ubuntu, macOS). The pipeline includes:

- **Lint & Type Check**: Fast feedback on code quality issues
- **Unit Tests**: Comprehensive test coverage across all Node versions
- **Integration Tests**: Real Weaviate process testing on multiple platforms
- **Build**: TypeScript compilation validation
- **Publish**: Automated npm publishing on release tags

---

## Node.js Version Support

### Performance Characteristics

This package supports **Node.js 18, 20, and 22** with significantly different performance profiles:

#### Node.js 20 & 22 (Recommended for Production)
- ✅ **Integration test time**: ~30-40 seconds
- ✅ **Faster V8 JIT compilation**: Better JavaScript execution speed
- ✅ **Improved garbage collection**: More efficient memory management
- ✅ **Better child process spawning**: Faster Weaviate process startup

**Use case**: Production deployments, development environments where speed matters

#### Node.js 18 (Supported but Slower)
- ⚠️ **Integration test time**: ~2 minutes (3-4x slower than Node 20/22)
- ⚠️ **Older V8 engine**: Less optimized JIT compilation
- ⚠️ **Legacy garbage collection**: Older memory management algorithms
- ⚠️ **Slower child processes**: More overhead when spawning Weaviate

**Use case**: Legacy projects, compatibility testing, organizations still on Node 18

### Why the Performance Gap?

The 3-4x performance difference between Node 18 and Node 20/22 is due to:

1. **V8 Engine Improvements**: Node 20+ includes V8 v11+ with significant JIT optimizations
2. **Child Process Efficiency**: Better handling of process spawning and IPC
3. **Garbage Collection**: Improved memory management reduces pause times
4. **Native Module Loading**: Faster require/import resolution

These are **engine-level differences** that cannot be optimized through configuration or code changes.

---

## CI/CD Pipeline Structure

### Job Flow

```
Lint & Type Check (Node 18, Ubuntu)
       ↓
   ┌───┴───┐
   ↓       ↓
Unit Tests  Setup Binaries (Ubuntu + macOS)
(Node 18/20/22)  ↓
       ↓         ↓
       └─→ Integration Tests (Matrix: 2 OS × 3 Node versions)
              ↓
           Build (Node 18)
              ↓
         Publish (on tags)
```

### Integration Test Matrix

**On Pull Requests:**
- ✅ Node 20 + Ubuntu: **RUN**
- ✅ Node 20 + macOS: **RUN**
- ✅ Node 22 + Ubuntu: **RUN**
- ✅ Node 22 + macOS: **RUN**
- ⏭️ Node 18 + Ubuntu: **SKIP** (saves ~2 minutes)
- ⏭️ Node 18 + macOS: **SKIP** (saves ~2 minutes)

**On Push to Main/Branches:**
- ✅ All 6 combinations run (including Node 18)

**Total time saved per PR: ~4 minutes** ⚡

---

## Performance Optimization Strategy

### Problem Identified

Integration tests spawn real Weaviate processes, which are CPU and I/O intensive. On Node 18, this results in:
- 54 total integration tests
- ~2.2 seconds per test on Node 18
- ~0.65 seconds per test on Node 20/22
- **3.4x performance gap**

### Solution: Conditional Testing

We implemented a **step-level conditional** in the CI/CD workflow:

```yaml
- name: Run integration tests only
  # Skip Node 18 on PRs (only run on push) - saves ~4min per PR
  if: matrix.node-version != 18 || github.event_name == 'push'
  run: npx jest tests/integration --maxWorkers=3 --verbose
```

**Why step-level?**
- Job-level conditionals fail because `matrix.node-version` isn't available before matrix expansion
- Step-level conditionals allow the job to run but skip only the slow test step
- This ensures CI doesn't fail and provides clear feedback

### What We Tried (and Why It Didn't Work)

❌ **Increased Jest workers** (`--maxWorkers=2` → `--maxWorkers=3`)
   - Only saved 2 seconds (minimal effect)
   - Bottleneck is execution speed, not parallelization

❌ **Binary caching optimizations**
   - Binary downloads are already fast (<10 seconds)
   - Not the primary bottleneck

❌ **Job-level conditionals**
   - GitHub Actions can't access matrix variables before expansion
   - Caused entire job to be skipped (broke CI)

✅ **Step-level conditional skipping**
   - Matrix variables are accessible at step level
   - Graceful skip on Node 18 for PRs
   - All other tests still run

---

## Local Testing

### Running Tests Locally

**Unit tests only:**
```bash
npm test -- --testPathIgnorePatterns=integration
```

**Integration tests only:**
```bash
npm test -- tests/integration
```

**All tests:**
```bash
npm test
```

### Performance Tips

1. **Use Node 20 or 22** for faster test execution during development
2. **Run specific test files** to avoid waiting for full suite:
   ```bash
   npx jest tests/integration/lifecycle.test.ts
   ```
3. **Use `--maxWorkers=1`** if experiencing port conflicts:
   ```bash
   npx jest tests/integration --maxWorkers=1
   ```

### Expected Local Test Times

| Node Version | Unit Tests | Integration Tests | Total |
|--------------|-----------|------------------|-------|
| Node 18      | ~5s       | ~2 minutes       | ~2m 5s |
| Node 20      | ~3s       | ~30-40 seconds   | ~35-43s |
| Node 22      | ~3s       | ~30-40 seconds   | ~35-43s |

---

## Troubleshooting

### CI Tests Are Slow

**Q: Why are my integration tests taking 2 minutes on Node 18?**

A: This is expected behavior. Node 18's V8 engine is 3-4x slower than Node 20/22. Use Node 20/22 for faster feedback during development.

**Q: Can I speed up Node 18 integration tests?**

A: Not significantly. The performance gap is due to V8 engine differences. The only real solution is upgrading to Node 20/22.

### CI Tests Are Failing

**Q: Node 18 integration tests are skipped on my PR. Is this a problem?**

A: No, this is by design. Node 18 integration tests only run on push to main/branches to save CI time. Unit tests still validate Node 18 compatibility.

**Q: All my checks failed to run after adding a conditional.**

A: Ensure conditionals are at the **step level**, not job level. Matrix variables aren't available at job level.

---

## Recommendations

### For Development
- Use **Node 20 or 22** for fastest feedback
- Run integration tests on your target Node version before pushing
- Use `--maxWorkers=3` for parallel test execution (default in CI)

### For Production
- Deploy with **Node 20 or 22** for best performance
- Node 18 is supported but will have slower startup times
- Monitor process spawning times if using Node 18

### For CI/CD Maintenance
- Keep Node 18 integration tests on main branch (maintains compatibility)
- Skip Node 18 integration tests on PRs (faster feedback)
- Update Node versions as new LTS releases become available

---

## References

- [GitHub Actions Workflow File](../../.github/workflows/ci.yml)
- [Integration Tests README](../../tests/integration/README.md)
- [Node.js Release Schedule](https://github.com/nodejs/release#release-schedule)
- [V8 Engine Release Notes](https://v8.dev/blog)

