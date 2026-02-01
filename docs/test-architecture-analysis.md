# Test Architecture Analysis
**Date:** February 1, 2026  
**Phase:** 2.1 Investigation  
**Time Spent:** 30 minutes  

## Executive Summary

Current test suite has **3 test files** with **4 Weaviate startups** causing 8-16 minute CI times. The bottleneck is `journey.test.ts` which tests configuration variations, each requiring separate Weaviate instances. Achieving 2-3 min CI time requires test restructuring, not just shared instances.

---

## Current Test File Breakdown

### 1. `src/journey.test.ts` (Integration Tests) 🔴
**Type:** Integration tests  
**Weaviate Instances:** 4 (one per test)  
**Execution Time:** 8-16 minutes (2-4 min per startup)  
**Current Strategy:** Sequential execution with `VITEST_SINGLE_THREAD=true`

**Tests:**
1. **Test: default options** 
   - Configuration: Default (port 6789, no custom env)
   - Purpose: Validates `new EmbeddedOptions()` with defaults
   - Operations: Create/delete TestCollection
   - Duration: ~2-4 minutes

2. **Test: custom options** ⚠️
   - Configuration: Port 7878 (HARDCODED), custom env vars
   - Env Vars: `QUERY_DEFAULTS_LIMIT=50`, `DEFAULT_VECTORIZER_MODULE=text2vec-openai`
   - Purpose: Validates custom port and environment configuration
   - Operations: Create/delete TestCollection
   - Duration: ~2-4 minutes
   - **Issue:** Hardcoded port blocks parallelization

3. **Test: latest version**
   - Configuration: `version: 'latest'`
   - Purpose: Validates 'latest' version string triggers correct binary download
   - Operations: Create/delete TestCollection
   - Duration: ~2-4 minutes (includes binary download)

4. **Test: binaryUrl**
   - Configuration: Direct binary URL for v1.27.0
   - Purpose: Validates custom binary download URLs
   - Operations: Create/delete TestCollection  
   - Duration: ~2-4 minutes (includes binary download)

**Delays:** Each test includes 2-second delay after stop (8 seconds total overhead)

**Can These Share an Instance?** ❌ **NO**
- Each test validates DIFFERENT startup configurations
- Tests are verifying configuration/download logic, not just operations
- Sharing instances would invalidate the tests' purpose

---

### 2. `src/platform.test.ts` (Unit Tests) ✅
**Type:** Pure unit tests  
**Weaviate Instances:** 0  
**Execution Time:** <1 second  

**Tests:**
- Platform detection (darwin/linux, arm64/x64)
- Binary filename generation
- Unsupported platform error handling

**Can Share Instance?** N/A (no Weaviate needed)

---

### 3. `src/unit.test.ts` (Unit Tests) ✅
**Type:** Pure unit tests  
**Weaviate Instances:** 0  
**Execution Time:** <1 second

**Tests:**
- EmbeddedOptions default values
- EmbeddedOptions custom values
- Version validation
- Configuration conflicts

**Can Share Instance?** N/A (no Weaviate needed)

---

## Test Files Mentioned in Issue (NOT FOUND)

The issue description references:
- `tests/integration/env-vars.test.ts` ❌ Does not exist
- `tests/integration/multiple-instances.test.ts` ❌ Does not exist

**Recommendation:** Update parent issue to reflect actual test structure.

---

## Which Tests Can Share Instances?

### ❌ Cannot Share: journey.test.ts (Configuration Tests)
**Reason:** Tests validate STARTUP CONFIGURATION, not runtime operations.

Each test verifies:
1. EmbeddedOptions accepts specific configuration
2. Binary downloads correctly (version vs binaryUrl)
3. Weaviate starts with that configuration
4. Basic connectivity works

**Analogy:** These tests are like testing "Can I boot Linux with different kernel parameters?" - you need separate boot cycles to test each parameter set.

**Attempting to share would:**
- Invalidate test purpose (not testing config variations)
- Miss bugs in configuration/download logic
- Lose coverage of version-specific issues

### ✅ Could Share (Future): Application-Level Operation Tests
**If we add tests that:**
- Test CRUD operations extensively
- Test query variations
- Test data modeling patterns
- Test client API features

**Then shared instance pattern applies:**
```typescript
describe('Weaviate Operations', () => {
  let sharedClient: EmbeddedClient;
  
  beforeAll(async () => {
    sharedClient = await weaviate.client(new EmbeddedOptions());
  }, 120000);
  
  afterEach(async () => {
    // Delete all collections for isolation
    const collections = await sharedClient.collections.listAll();
    await Promise.all(collections.map(c => 
      sharedClient.collections.delete(c.name)
    ));
  });
  
  afterAll(async () => {
    await sharedClient.embedded.stop();
  });
  
  it('creates collections with various schemas', async () => { ... });
  it('performs vector searches', async () => { ... });
  it('handles large datasets', async () => { ... });
  // 20+ tests, ONE Weaviate startup
});
```

---

## Tests Requiring Special Handling

### 1. Port 7878 Hardcoding (Test 2)
**Issue:** Hardcoded port prevents parallelization and conflicts with other tests.

**Solution:**
```typescript
const customPort = await getRandomPort();
const client = await weaviate.client(
  new EmbeddedOptions({
    port: customPort,
    env: { ... }
  }),
  {
    scheme: 'http',
    host: `127.0.0.1:${customPort}`
  }
);
```

**Benefit:** Enables future parallel execution when beneficial.

### 2. Version Download Tests (Tests 3, 4)
**Issue:** Each downloads binary, adding 30-60s per test.

**Current Mitigation:** CI caches `~/.cache/weaviate-embedded-*` (already implemented).

**Future Optimization:** Consider mocking download for some tests if download logic is separately unit tested.

---

## Migration Complexity Estimates

### Option A: Reduce Integration Test Count (LOW COMPLEXITY)
**Changes:**
- Keep 2 integration tests (default + latest)
- Move custom config test to unit test (validate options object only)
- Remove binaryUrl test (redundant with version test)

**Effort:** 2-3 hours  
**Risk:** Low (reduced coverage, but configs are similar)  
**Result:** 4-8 min CI time (50% improvement)

### Option B: Shared Instance Pattern (MEDIUM COMPLEXITY)
**Changes:**
- Create new test file for operation tests
- Refactor journey.test.ts to minimal config validation
- Implement shared instance with collection cleanup
- Add 10+ operation tests to justify shared instance overhead

**Effort:** 4-6 hours  
**Risk:** Medium (new test patterns, more code)  
**Result:** 2-4 min CI time (75% improvement)

### Option C: Minimal Changes (VERY LOW COMPLEXITY)
**Changes:**
- Remove 2-second delays
- Use dynamic port for test 2

**Effort:** 30 minutes  
**Risk:** Zero  
**Result:** 7-15 min CI time (minimal improvement)

---

## Performance Comparison

| Approach | Integration Tests | Weaviate Startups | Est. CI Time | Effort | Risk |
|----------|-------------------|-------------------|--------------|--------|------|
| **Current** | 4 | 4 | 8-16 min | N/A | ✅ Stable |
| **Phase 1 (Done)** | 4 | 4 | 8-10 min | ✅ Complete | ✅ Zero |
| **Option A** | 2 | 2 | 4-8 min | 2-3 hrs | 🟡 Low |
| **Option B** | 1 + operations | 1 | 2-4 min | 4-6 hrs | 🟡 Medium |
| **Option C** | 4 | 4 | 7-15 min | 30 min | ✅ Zero |

---

## Recommendations

### Immediate (Phase 2.2 - Option C)
1. ✅ Remove hardcoded port 7878, use `getRandomPort()`
2. ✅ Remove 2-second delays (sequential execution already guaranteed)
3. ✅ Document that journey.test.ts should NOT use shared instances

**Benefit:** Small improvement, zero risk, sets foundation.

### Short-term (Phase 2.3 - Option A)
1. Keep 2 integration tests: default + latest version
2. Move custom config test to unit test level
3. Remove binaryUrl test (redundant)

**Benefit:** 50% CI time reduction, low risk.

### Long-term (Future Phase - Option B)
1. Separate configuration tests from operation tests
2. Implement shared instance pattern for operation tests
3. Add comprehensive operation test suite

**Benefit:** Achieves 2-3 min CI target, enables extensive operation testing.

---

## Key Insights

1. **Test Type Matters:** Configuration tests ≠ operation tests
   - Config tests: Need separate instances
   - Operation tests: Benefit from shared instances

2. **Current Test Suite:** Primarily configuration tests
   - Validates library setup/download logic
   - NOT testing Weaviate operations extensively

3. **Rails/Django Pattern:** Applies to application tests, not library tests
   - Rails tests application code using database
   - Our tests validate database library itself

4. **Path to 2-3 Min:** Requires test suite expansion, not just optimization
   - Need many operation tests to justify shared instance overhead
   - Shared instance startup (~2 min) only worthwhile with 10+ tests

---

## Edge Cases & Gotchas

### Collection Cleanup Failures
**Risk:** Test failure leaves orphaned collections.

**Mitigation:**
```typescript
afterEach(async () => {
  try {
    const collections = await client.collections.listAll();
    await Promise.all(
      collections.map(c => client.collections.delete(c.name).catch(() => {}))
    );
  } catch (err) {
    console.warn('Collection cleanup failed:', err);
  }
});
```

### Test Crashes Mid-Execution
**Risk:** Weaviate process left running.

**Mitigation:**
- Use `afterAll()` with timeout handling
- Consider process cleanup hooks

### Port Conflicts (Even with Random Ports)
**Risk:** Random port already in use.

**Mitigation:**
```typescript
async function getAvailablePort(retries = 5): Promise<number> {
  for (let i = 0; i < retries; i++) {
    try {
      const port = await getRandomPort();
      // Verify port is actually available
      return port;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 100));
    }
  }
}
```

---

## Conclusion

The shared instance pattern from Rails/Django is valuable but applies to a different test scenario than our current suite. Our tests validate library configuration/startup, which inherently requires multiple instances. To achieve 2-3 min CI, we need to either:

1. **Reduce config test count** (Option A): Quick win, moderate improvement
2. **Expand operation tests** (Option B): Long-term investment, full improvement

**Recommended Path:** Phase 2.2 (Option C) → Phase 2.3 (Option A) → Future (Option B)

