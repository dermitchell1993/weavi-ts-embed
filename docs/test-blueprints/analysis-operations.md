# Operations Test Blueprint

## Overview
- **Total lines in museum file**: 316 lines
- **Number of test suites**: 4 major describe blocks
- **Test cases**: ~15 individual tests
- **Dependencies**: EmbeddedClient, full Weaviate instance
- **Execution time**: 2-4 minutes (shared instance startup)
- **Platform support**: Linux and macOS only

## Test Scenarios

### Collection Management (~5 tests)
**Test names:**
- `creates collection with text properties`
- `lists all collections`
- `retrieves collection by name after creation`
- `deletes a collection`

**Assertions:**
- `expect(coll.name).toBe(name)`
- `expect(collections.length).toBe(3)`
- `expect(collections.map((c) => c.name)).toContain(n)`
- Collection existence and property validation

**Mock requirements:**
- None (full integration tests with real Weaviate instance)

### CRUD Operations (~6 tests)
**Test names:**
- `inserts single object`
- `inserts batch objects`
- `updates an object`
- `deletes object by ID`
- `deletes objects by filter`

**Assertions:**
- `expect(uuid).toBeDefined()`
- `expect(typeof uuid).toBe('string')`
- `expect(results.uuids.length).toBe(10)`
- `expect(result.objects.length).toBe(expectedCount)`
- Update verification and deletion confirmation

**Mock requirements:**
- None (real database operations)

### Query Operations (~3 tests)
**Test names:**
- `fetches with limit`
- `fetches with filters`

**Assertions:**
- `expect(result.objects.length).toBe(5)` (limit validation)
- `expect(result.objects.length).toBe(2)` (filter validation)
- `expect(result.objects.every((o) => o.properties.category === 'A')).toBe(true)`

**Mock requirements:**
- None (real query operations)

### Batch Operations (~1 test)
**Test names:**
- `bulk inserts 100+ objects`

**Assertions:**
- `expect(result.uuids.length).toBe(150)`
- `expect(fetchResult.objects.length).toBe(150)`
- Large dataset handling validation

**Mock requirements:**
- None (real bulk operations)

### Error Handling (~2 tests)
**Test names:**
- `rejects invalid collection names`
- `rejects invalid data types`

**Assertions:**
- `await expect(sharedClient.collections.create(...)).rejects.toThrow(/invalid.*class.*name/i)`
- `await expect(coll.data.insert(...)).rejects.toThrow(/type|invalid|number/i)`

**Mock requirements:**
- None (error handling through real operations)

## Patterns to Replicate

### Setup/Teardown Patterns
```javascript
// Shared instance setup (expensive, reused across tests)
beforeAll(async () => {
  if (process.platform !== 'linux' && process.platform !== 'darwin') return;
  console.log('🚀 Starting shared Weaviate instance...');
  const port = await getRandomPort();
  sharedClient = await weaviate.client(new EmbeddedOptions({ port }), {
    host: `127.0.0.1:${port}`,
    scheme: 'http',
  });
  await verifyConnection(sharedClient);
  console.log(`✅ Ready on port ${port}`);
}, 120000);

// Cleanup after each test
afterEach(async () => {
  if (!sharedClient) return;
  const collections = await sharedClient.collections.listAll().catch((err) => {
    console.warn('Failed to list collections during cleanup:', err);
    return [];
  });
  await Promise.all(
    collections.map((c) =>
      sharedClient.collections.delete(c.name).catch((err) => {
        console.warn(`Failed to delete collection ${c.name}:`, err);
      })
    )
  );
});

// Global teardown
afterAll(async () => {
  if (sharedClient?.embedded) {
    console.log('🛑 Stopping instance...');
    await sharedClient.embedded.stop();
  }
});
```

### Helper Patterns
```javascript
// Unique name generation for test isolation
const genName = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// Random port allocation
const getRandomPort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo;
      if (port) {
        srv.close(() => resolve(port));
      } else {
        reject(new Error('No port found'));
      }
    });
  });

// Connection verification
const verifyConnection = async (client: EmbeddedClient) => {
  const maxRetries = 10;
  const retryDelay = 1500; // 1.5 seconds
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create and delete a test collection to verify full connectivity
      const testCollection = await client.collections.create({
        name: `test_connection_${Date.now()}`,
        properties: [{ name: 'test', dataType: 'text' }]
      });
      await client.collections.delete(testCollection.name);
      return; // Success
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw new Error(`Failed to connect after ${maxRetries} attempts. Last error: ${lastError?.message}`);
};
```

### Test Data Patterns
```javascript
// Collection creation with properties
const coll = await sharedClient.collections.create({
  name: genName('TestCollection'),
  properties: [
    { name: 'title', dataType: 'text' },
    { name: 'content', dataType: 'text' },
  ],
});

// Single object insertion
const uuid = await coll.data.insert({
  title: 'Test Article',
  content: 'Test content',
});

// Batch insertion
const objects = Array.from({ length: 10 }, (_, i) => ({
  title: `Article ${i}`,
  index: i,
}));
const results = await coll.data.insertMany(objects);

// Query with filters
const result = await coll.query.fetchObjects({
  filters: coll.filter.byProperty('category').equal('A'),
  limit: 10,
});
```

### Assertion Patterns
- **UUID validation**: `expect(uuid).toBeDefined()` + `expect(typeof uuid).toBe('string')`
- **Count validation**: `expect(results.uuids.length).toBe(expectedCount)`
- **Query results**: `expect(result.objects.length).toBe(expectedLength)`
- **Filter validation**: `expect(result.objects.every((o) => condition)).toBe(true)`
- **Error handling**: `await expect(operation).rejects.toThrow(/pattern/)`

## Split Strategy

**File 1: tests/unit/operations/crud.test.ts** (~180 lines)
- Collection Management (5 tests)
- CRUD Operations (5 tests)
- Error Handling (2 tests)

**File 2: tests/unit/operations/advanced.test.ts** (~160 lines)
- Query Operations (3 tests)
- Batch Operations (1 test)
- Complex scenarios and edge cases

## Notes

- **Shared instance pattern**: Expensive setup (2-4 min) but enables fast individual tests
- **Platform restrictions**: Linux/macOS only due to embedded binary availability
- **Test isolation**: Unique collection names prevent interference
- **Cleanup strategy**: Aggressive collection deletion after each test
- **Connection verification**: Actual database operations to ensure readiness
- **Large dataset testing**: 100+ objects for performance validation
- **Error patterns**: Invalid collection names and type mismatches

## Implementation Notes

- Maintain shared instance pattern for performance
- Keep platform-specific skip logic
- Preserve aggressive cleanup to prevent test interference
- Include connection verification before test execution
- Use unique name generation for test isolation
- Maintain comprehensive error message validation
- Keep large dataset testing for performance validation

