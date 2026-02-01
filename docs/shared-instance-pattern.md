# Shared Instance Pattern Design
**Date:** February 1, 2026  
**Phase:** 2.1 Design  
**Pattern:** One Weaviate per test file, collection-based isolation  

## Overview

This document defines the **Shared Weaviate Instance Pattern** for integration tests that don't need to test configuration variations. This pattern reduces CI time by starting Weaviate ONCE per test file instead of once per test.

**When to Use:** Tests that validate operations/behavior, not startup configuration.  
**When NOT to Use:** Tests that validate different configurations/versions.

---

## Core Pattern Template

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import weaviate, { EmbeddedClient, EmbeddedOptions } from '.';

describe('Weaviate Operations Suite', () => {
  let sharedClient: EmbeddedClient;
  
  // ============================================
  // ONCE: Start Weaviate before all tests
  // ============================================
  beforeAll(async () => {
    sharedClient = await weaviate.client(new EmbeddedOptions());
    
    // Optional: Verify instance is ready
    const isReady = await sharedClient.isReady();
    expect(isReady).toBe(true);
  }, 120000); // 2-minute timeout for startup
  
  // ============================================
  // EACH: Clean up collections after every test
  // ============================================
  afterEach(async () => {
    try {
      const collections = await sharedClient.collections.listAll();
      await Promise.all(
        collections.map(collection => 
          sharedClient.collections.delete(collection.name)
            .catch(err => console.warn(`Failed to delete ${collection.name}:`, err))
        )
      );
    } catch (err) {
      console.warn('Collection cleanup failed:', err);
      // Don't fail test if cleanup fails
    }
  });
  
  // ============================================
  // ONCE: Stop Weaviate after all tests
  // ============================================
  afterAll(async () => {
    if (sharedClient?.embedded) {
      await sharedClient.embedded.stop();
    }
  });
  
  // ============================================
  // TESTS: Each test gets isolated collections
  // ============================================
  
  it('creates and queries a simple collection', async () => {
    // Use unique collection name to avoid conflicts
    const collName = `SimpleTest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const collection = await sharedClient.collections.create({
      name: collName,
      properties: [
        { name: 'title', dataType: 'text' },
        { name: 'content', dataType: 'text' },
      ],
    });
    
    expect(collection.name).toBe(collName);
    
    // Add data
    await collection.data.insert({
      title: 'Test Article',
      content: 'This is test content',
    });
    
    // Query data
    const results = await collection.query.fetchObjects({
      limit: 10,
    });
    
    expect(results.objects).toHaveLength(1);
    expect(results.objects[0].properties.title).toBe('Test Article');
    
    // Cleanup happens automatically in afterEach()
  });
  
  it('handles vector searches', async () => {
    const collName = `VectorTest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Collection-specific test logic here
    // Each test is isolated by unique collection name
  });
  
  it('manages large datasets', async () => {
    const collName = `LargeTest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Test logic...
  });
});
```

---

## Collection Naming Conventions

### Recommended Format
```typescript
const collName = `${TestPurpose}_${Date.now()}_${randomId()}`;
```

**Components:**
1. **TestPurpose**: Descriptive name (e.g., `VectorSearch`, `BulkImport`)
2. **Timestamp**: `Date.now()` ensures uniqueness across test runs
3. **Random ID**: `Math.random().toString(36).substring(7)` prevents same-millisecond conflicts

### Examples
```typescript
// Good ✅
`CreateTest_1738383600000_k2j5m9a`
`QueryTest_1738383600123_p9x2l4n`
`VectorSearch_1738383600456_q3w8r7t`

// Bad ❌
`TestCollection` // Conflicts if test runs twice
`Test1` // Not descriptive
`MyCollection_2026` // Timestamp not granular enough
```

### Helper Function
```typescript
function generateCollectionName(purpose: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return `${purpose}_${timestamp}_${randomId}`;
}

// Usage
const collName = generateCollectionName('VectorSearch');
```

---

## Cleanup Strategies

### Strategy 1: Collection Deletion (Recommended)
**When:** Default for most tests  
**Method:** Delete all collections after each test

```typescript
afterEach(async () => {
  const collections = await sharedClient.collections.listAll();
  await Promise.all(
    collections.map(c => sharedClient.collections.delete(c.name))
  );
});
```

**Pros:**
- ✅ Complete isolation
- ✅ No leftover data
- ✅ Works for all test types

**Cons:**
- ⚠️ Slower than data-only deletion (recreates schemas)

### Strategy 2: Data Deletion Only
**When:** Tests use same schema repeatedly  
**Method:** Delete data, keep schema

```typescript
let testCollection: Collection;

beforeAll(async () => {
  // Create collection once
  testCollection = await sharedClient.collections.create({
    name: 'SharedTestCollection',
    properties: [ /* ... */ ],
  });
});

afterEach(async () => {
  // Delete only data
  await testCollection.data.deleteAll();
});
```

**Pros:**
- ✅ Faster (no schema recreation)
- ✅ Good for high-volume test suites

**Cons:**
- ⚠️ Only works if all tests use same schema
- ⚠️ Less isolation (schema persists)

### Strategy 3: Hybrid Approach
**When:** Mix of schema and data tests  
**Method:** Selective cleanup

```typescript
afterEach(async function() {
  // Use function() to access test context
  const testName = this.currentTest?.title || '';
  
  if (testName.includes('schema')) {
    // Full cleanup for schema tests
    const collections = await sharedClient.collections.listAll();
    await Promise.all(collections.map(c => 
      sharedClient.collections.delete(c.name)
    ));
  } else {
    // Data-only cleanup for operation tests
    await testCollection.data.deleteAll();
  }
});
```

---

## Error Handling

### Graceful Cleanup Failures
**Principle:** Don't fail tests due to cleanup issues.

```typescript
afterEach(async () => {
  try {
    const collections = await sharedClient.collections.listAll();
    await Promise.all(
      collections.map(collection => 
        sharedClient.collections.delete(collection.name)
          .catch(err => {
            // Log but don't throw
            console.warn(`Failed to delete ${collection.name}:`, err);
          })
      )
    );
  } catch (err) {
    // Catch outer errors (e.g., listAll failure)
    console.warn('Collection cleanup failed:', err);
  }
});
```

### Startup Failures
**Principle:** Fail fast if Weaviate won't start.

```typescript
beforeAll(async () => {
  try {
    sharedClient = await weaviate.client(new EmbeddedOptions());
    
    // Verify readiness
    const isReady = await sharedClient.isReady();
    if (!isReady) {
      throw new Error('Weaviate started but not ready');
    }
  } catch (err) {
    console.error('Failed to start Weaviate:', err);
    throw err; // Fail the entire suite
  }
}, 120000);
```

### Test Crashes
**Principle:** Ensure Weaviate stops even if tests crash.

```typescript
afterAll(async () => {
  try {
    if (sharedClient?.embedded) {
      await sharedClient.embedded.stop();
    }
  } catch (err) {
    console.error('Failed to stop Weaviate:', err);
    // Try force kill as fallback
    if (sharedClient?.embedded?.process) {
      sharedClient.embedded.process.kill('SIGKILL');
    }
  }
});
```

---

## Advanced Patterns

### Pattern 1: Nested Describe Blocks
**Use Case:** Group related tests with different setup needs.

```typescript
describe('Weaviate Operations', () => {
  let sharedClient: EmbeddedClient;
  
  beforeAll(async () => {
    sharedClient = await weaviate.client(new EmbeddedOptions());
  }, 120000);
  
  afterAll(async () => {
    await sharedClient.embedded.stop();
  });
  
  describe('Basic CRUD', () => {
    afterEach(async () => {
      // Cleanup for CRUD tests
      const collections = await sharedClient.collections.listAll();
      await Promise.all(collections.map(c => 
        sharedClient.collections.delete(c.name)
      ));
    });
    
    it('creates objects', async () => { /* ... */ });
    it('updates objects', async () => { /* ... */ });
    it('deletes objects', async () => { /* ... */ });
  });
  
  describe('Vector Search', () => {
    let vectorCollection: Collection;
    
    beforeAll(async () => {
      // Create shared collection for vector tests
      vectorCollection = await sharedClient.collections.create({
        name: 'VectorTestCollection',
        vectorizer: 'text2vec-contextionary',
      });
    });
    
    afterEach(async () => {
      // Delete only data, keep schema
      await vectorCollection.data.deleteAll();
    });
    
    afterAll(async () => {
      // Delete collection after all vector tests
      await sharedClient.collections.delete('VectorTestCollection');
    });
    
    it('performs similarity search', async () => { /* ... */ });
    it('filters by distance', async () => { /* ... */ });
  });
});
```

### Pattern 2: Test Data Factories
**Use Case:** Reusable test data generation.

```typescript
// Test helpers
class WeaviateTestHelper {
  constructor(private client: EmbeddedClient) {}
  
  async createTestCollection(purpose: string, schema?: any) {
    const name = `${purpose}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return await this.client.collections.create({
      name,
      properties: schema || [
        { name: 'title', dataType: 'text' },
        { name: 'content', dataType: 'text' },
      ],
    });
  }
  
  async populateTestData(collection: Collection, count: number) {
    const objects = Array.from({ length: count }, (_, i) => ({
      title: `Test Object ${i}`,
      content: `This is test content for object ${i}`,
    }));
    
    await collection.data.insertMany(objects);
  }
  
  async cleanupAllCollections() {
    const collections = await this.client.collections.listAll();
    await Promise.all(
      collections.map(c => this.client.collections.delete(c.name))
    );
  }
}

// Usage in tests
describe('Weaviate Operations', () => {
  let sharedClient: EmbeddedClient;
  let helper: WeaviateTestHelper;
  
  beforeAll(async () => {
    sharedClient = await weaviate.client(new EmbeddedOptions());
    helper = new WeaviateTestHelper(sharedClient);
  }, 120000);
  
  afterEach(async () => {
    await helper.cleanupAllCollections();
  });
  
  afterAll(async () => {
    await sharedClient.embedded.stop();
  });
  
  it('handles large datasets', async () => {
    const collection = await helper.createTestCollection('LargeDataset');
    await helper.populateTestData(collection, 1000);
    
    const results = await collection.query.fetchObjects({ limit: 10 });
    expect(results.objects).toHaveLength(10);
  });
});
```

### Pattern 3: Parallel Tests with Different Instances
**Use Case:** Multiple test files need different configurations.

```typescript
// File: tests/operations-default.test.ts
describe('Operations (Default Config)', () => {
  let client: EmbeddedClient;
  beforeAll(async () => {
    client = await weaviate.client(new EmbeddedOptions());
  }, 120000);
  // ... tests
});

// File: tests/operations-custom.test.ts
describe('Operations (Custom Config)', () => {
  let client: EmbeddedClient;
  beforeAll(async () => {
    const port = await getRandomPort();
    client = await weaviate.client(new EmbeddedOptions({
      port,
      env: { QUERY_DEFAULTS_LIMIT: 100 }
    }));
  }, 120000);
  // ... tests
});
```

**With fileParallelism: 1:** Tests run sequentially, no port conflicts.  
**With fileParallelism: 2+:** Tests run in parallel, dynamic ports prevent conflicts.

---

## Edge Cases & Gotchas

### 1. Collection Name Conflicts
**Problem:** Two tests create same collection name simultaneously.

**Solution:** Always use timestamp + random ID in names.

```typescript
// Bad ❌
const collName = 'TestCollection';

// Good ✅
const collName = `Test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
```

### 2. Orphaned Collections
**Problem:** Test crashes, afterEach() doesn't run, collections remain.

**Mitigation:**
```typescript
beforeAll(async () => {
  sharedClient = await weaviate.client(new EmbeddedOptions());
  
  // Clean up any orphans from previous crashed runs
  const collections = await sharedClient.collections.listAll();
  await Promise.all(
    collections.map(c => sharedClient.collections.delete(c.name))
  );
});
```

### 3. Weaviate Not Fully Ready
**Problem:** Weaviate starts but Raft leader not elected yet.

**Solution:** Use retry logic (already in checkClientServerConn).

```typescript
async function waitForReady(client: EmbeddedClient, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const isReady = await client.isReady();
      if (isReady) return;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}

beforeAll(async () => {
  sharedClient = await weaviate.client(new EmbeddedOptions());
  await waitForReady(sharedClient);
}, 120000);
```

### 4. Memory Leaks
**Problem:** Long test suites accumulate data in shared instance.

**Mitigation:**
- Ensure afterEach() always runs (use try-catch)
- Consider restarting instance every N tests
- Monitor memory usage in CI

```typescript
let testCount = 0;

afterEach(async () => {
  testCount++;
  
  // Cleanup collections
  await helper.cleanupAllCollections();
  
  // Restart instance every 50 tests to prevent memory leaks
  if (testCount % 50 === 0) {
    console.log('Restarting instance to prevent memory leaks...');
    await sharedClient.embedded.stop();
    sharedClient = await weaviate.client(new EmbeddedOptions());
  }
});
```

### 5. Port Already in Use
**Problem:** Random port allocation fails (rare but possible).

**Solution:** Retry port allocation.

```typescript
async function getAvailablePort(retries = 5): Promise<number> {
  for (let i = 0; i < retries; i++) {
    try {
      return await getRandomPort();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error('Failed to find available port');
}

beforeAll(async () => {
  const port = await getAvailablePort();
  sharedClient = await weaviate.client(new EmbeddedOptions({ port }));
}, 120000);
```

---

## Performance Considerations

### Startup Overhead
**Cost:** ~2-4 minutes per Weaviate startup

**Break-Even Point:** Shared instance only saves time with 2+ tests per file.

```
1 test:   4 min startup = 4 min total
2 tests:  4 min startup + 2×2s tests = 4m 4s (worse than 2×4min = 8min separate!)
10 tests: 4 min startup + 10×2s tests = 4m 20s (vs 40min separate)
```

**Recommendation:** Use shared pattern with 5+ tests per file.

### Cleanup Overhead
**Cost:** ~100-500ms per collection deletion

**Optimization:**
```typescript
// Slow: Delete one by one
for (const c of collections) {
  await client.collections.delete(c.name);
}

// Fast: Delete in parallel
await Promise.all(
  collections.map(c => client.collections.delete(c.name))
);
```

### Data Volume
**Impact:** Large datasets slow down cleanup.

**Mitigation:**
- Use small test datasets
- Delete data before deleting collection (if supported)
- Consider truncate operations if available

---

## Migration Checklist

When converting tests to shared instance pattern:

- [ ] Identify tests that DON'T need separate configs
- [ ] Extract startup logic to beforeAll()
- [ ] Add unique collection names to each test
- [ ] Implement afterEach() cleanup
- [ ] Add afterAll() shutdown
- [ ] Add error handling for cleanup failures
- [ ] Verify tests still pass independently
- [ ] Verify tests pass in sequence
- [ ] Measure CI time improvement
- [ ] Update documentation

---

## Anti-Patterns (DON'T DO THIS)

### ❌ Shared Collection Names
```typescript
// BAD - Tests will conflict
it('test 1', async () => {
  await client.collections.create({ name: 'TestCollection' });
});

it('test 2', async () => {
  await client.collections.create({ name: 'TestCollection' }); // FAILS!
});
```

### ❌ No Cleanup
```typescript
// BAD - Data accumulates
afterEach(async () => {
  // Nothing! Collections pile up
});
```

### ❌ Cleanup Before Test
```typescript
// BAD - Cleanup should be AFTER
beforeEach(async () => {
  const collections = await client.collections.listAll();
  await Promise.all(collections.map(c => client.collections.delete(c.name)));
});
```

**Why bad?** If test fails midway, cleanup never happens.

### ❌ Throwing Cleanup Errors
```typescript
// BAD - Test failure masks real issue
afterEach(async () => {
  await client.collections.deleteAll(); // Throws if fails
});
```

**Better:** Catch and log, don't throw.

---

## Summary

**Use shared instance pattern when:**
- ✅ Testing operations, not configurations
- ✅ Have 5+ tests that can use same config
- ✅ Tests are independent via collection isolation

**Don't use shared instance pattern when:**
- ❌ Testing different configurations/versions
- ❌ Only 1-2 tests in file
- ❌ Tests need different Weaviate env vars

**Key principles:**
1. **One instance per file** (start in beforeAll)
2. **Unique collection names** (timestamp + random)
3. **Clean after each test** (afterEach cleanup)
4. **Fail gracefully** (catch cleanup errors)
5. **Stop after all tests** (afterAll shutdown)

This pattern can reduce CI time from 8-16 min to 2-4 min for test suites with many operation tests.

