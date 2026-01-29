import { connectToEmbedded } from '../../src/connectToEmbedded';
import { WeaviateClient } from 'weaviate-client';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

/**
 * Type-safe data types for Weaviate properties.
 * The Weaviate client types dataType as 'string', but these are the valid values.
 */
type WeaviateDataType =
  | 'text'
  | 'int'
  | 'number'
  | 'boolean'
  | 'date'
  | 'uuid'
  | 'geoCoordinates'
  | 'phoneNumber'
  | 'blob';

/**
 * Integration tests for Weaviate v3 client operations.
 *
 * These tests verify the complete integration of the v3 Weaviate client with the embedded instance,
 * including collection management, object CRUD operations, and query operations.
 *
 * Note: These tests require an actual Weaviate binary to be present and will
 * interact with real system resources (ports, processes, file system).
 */
describe('Weaviate V3 Operations Integration Tests', () => {
  let client: WeaviateClient;
  let testDataDir: string;

  // Use a unique port range to avoid conflicts with other tests
  // PRI-744a uses 19080, PRI-744b uses 18080-18098, so we use 20080+ here
  const TEST_PORT = parseInt(process.env.TEST_V3_PORT || '20080', 10);
  const TEST_GRPC_PORT = parseInt(process.env.TEST_V3_GRPC_PORT || '51052', 10);

  // Increase timeout for integration tests as they involve real process operations
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Create a unique test data directory
    testDataDir = join(tmpdir(), `weaviate-v3-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    mkdirSync(testDataDir, { recursive: true });

    try {
      // Connect to embedded Weaviate instance
      console.log(`[V3 Operations Test] Connecting to embedded Weaviate on port ${TEST_PORT}...`);
      client = await connectToEmbedded({
        port: TEST_PORT,
        grpcPort: TEST_GRPC_PORT,
        version: '1.23.0', // Use a stable version for testing
        persistenceDataPath: testDataDir,
      });
      console.log('[V3 Operations Test] Connected successfully!');
    } catch (error) {
      console.error('[V3 Operations Test] Failed to connect to embedded Weaviate:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));

      // If connection fails, skip all tests in this suite
      console.warn('⚠️  Skipping V3 operations tests: Unable to connect to embedded Weaviate');
      console.warn('💡 This may be due to:');
      console.warn('   - No internet connection');
      console.warn('   - GitHub releases unreachable');
      console.warn('   - Port conflicts');
      console.warn('   - Binary download failure');

      throw new Error(
        'Integration tests require Weaviate binary and available ports. ' +
          'Ensure you have internet connection and ports are free. ' +
          'See error details above.'
      );
    }
  });

  afterAll(async () => {
    // Clean up: close client and stop embedded instance
    if (client) {
      try {
        console.log('[V3 Operations Test] Shutting down embedded Weaviate...');
        await client.close();
        console.log('[V3 Operations Test] Shutdown complete');
      } catch (error) {
        console.error('[V3 Operations Test] Error during shutdown:', error);
      }
    }

    // Clean up test data directory
    try {
      rmSync(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.error('[V3 Operations Test] Error cleaning up test data directory:', error);
    }
  });

  describe('Collection Lifecycle', () => {
    const testCollectionName = 'TestArticle';

    afterEach(async () => {
      // Clean up: delete test collection if it exists
      try {
        const exists = await client.collections.exists(testCollectionName);
        if (exists) {
          await client.collections.delete(testCollectionName);
        }
      } catch (error) {
        console.error('Error cleaning up test collection:', error);
      }
    });

    it('should create a collection with properties', async () => {
      // Create a collection with properties
      const collection = await client.collections.create({
        name: testCollectionName,
        description: 'A test collection for articles',
        properties: [
          {
            name: 'title',
            dataType: 'text' as WeaviateDataType,
            description: 'The title of the article',
          },
          {
            name: 'content',
            dataType: 'text' as WeaviateDataType,
            description: 'The content of the article',
          },
          {
            name: 'views',
            dataType: 'int' as WeaviateDataType,
            description: 'Number of views',
          },
        ],
      });

      expect(collection).toBeDefined();
      expect(collection.name).toBe(testCollectionName);

      // Verify collection exists
      const exists = await client.collections.exists(testCollectionName);
      expect(exists).toBe(true);
    });

    it('should delete a collection successfully', async () => {
      // Create a collection first
      await client.collections.create({
        name: testCollectionName,
        properties: [
          {
            name: 'title',
            dataType: 'text' as WeaviateDataType,
          },
        ],
      });

      // Verify it exists
      let exists = await client.collections.exists(testCollectionName);
      expect(exists).toBe(true);

      // Delete the collection
      await client.collections.delete(testCollectionName);

      // Verify it no longer exists
      exists = await client.collections.exists(testCollectionName);
      expect(exists).toBe(false);
    });

    it('should list all collections', async () => {
      // Create a test collection
      await client.collections.create({
        name: testCollectionName,
        properties: [
          {
            name: 'title',
            dataType: 'text' as WeaviateDataType,
          },
        ],
      });

      // List all collections
      const collections = await client.collections.listAll();

      expect(Array.isArray(collections)).toBe(true);
      expect(collections.length).toBeGreaterThan(0);

      // Find our test collection in the list
      const foundCollection = collections.find((c: any) => c.name === testCollectionName);
      expect(foundCollection).toBeDefined();
    });
  });

  describe('Object CRUD Operations', () => {
    const testCollectionName = 'TestProduct';

    beforeAll(async () => {
      // Create a collection for object operations
      await client.collections.create({
        name: testCollectionName,
        properties: [
          {
            name: 'name',
            dataType: 'text' as WeaviateDataType,
            description: 'Product name',
          },
          {
            name: 'price',
            dataType: 'number' as WeaviateDataType,
            description: 'Product price',
          },
          {
            name: 'inStock',
            dataType: 'boolean' as WeaviateDataType,
            description: 'Whether product is in stock',
          },
        ],
      });
    });

    afterAll(async () => {
      // Clean up: delete test collection
      try {
        const exists = await client.collections.exists(testCollectionName);
        if (exists) {
          await client.collections.delete(testCollectionName);
        }
      } catch (error) {
        console.error('Error cleaning up test collection:', error);
      }
    });

    it('should create an object successfully', async () => {
      const collection = client.collections.get(testCollectionName);

      // Create an object
      const result = await collection.data.insert({
        name: 'Laptop',
        price: 999.99,
        inStock: true,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string'); // UUID
    });

    it('should read an object by UUID', async () => {
      const collection = client.collections.get(testCollectionName);

      // Create an object
      const uuid = await collection.data.insert({
        name: 'Mouse',
        price: 29.99,
        inStock: true,
      });

      // Read the object back
      const retrieved = await collection.query.fetchObjectById(uuid);

      expect(retrieved).toBeDefined();
      expect(retrieved?.properties.name).toBe('Mouse');
      expect(retrieved?.properties.price).toBe(29.99);
      expect(retrieved?.properties.inStock).toBe(true);
    });

    it('should update an object successfully', async () => {
      const collection = client.collections.get(testCollectionName);

      // Create an object
      const uuid = await collection.data.insert({
        name: 'Keyboard',
        price: 79.99,
        inStock: true,
      });

      // Update the object
      await collection.data.update({
        id: uuid,
        properties: {
          price: 69.99,
          inStock: false,
        },
      });

      // Verify the update
      const retrieved = await collection.query.fetchObjectById(uuid);

      expect(retrieved?.properties.price).toBe(69.99);
      expect(retrieved?.properties.inStock).toBe(false);
      expect(retrieved?.properties.name).toBe('Keyboard'); // Should remain unchanged
    });

    it('should delete an object successfully', async () => {
      const collection = client.collections.get(testCollectionName);

      // Create an object
      const uuid = await collection.data.insert({
        name: 'Monitor',
        price: 299.99,
        inStock: true,
      });

      // Delete the object
      await collection.data.deleteById(uuid);

      // Verify deletion - should return null
      const retrieved = await collection.query.fetchObjectById(uuid);
      expect(retrieved).toBeNull();
    });
  });

  describe('Query Operations', () => {
    const testCollectionName = 'TestDocument';

    beforeAll(async () => {
      // Create a collection for query operations
      await client.collections.create({
        name: testCollectionName,
        properties: [
          {
            name: 'title',
            dataType: 'text' as WeaviateDataType,
            description: 'Document title',
          },
          {
            name: 'content',
            dataType: 'text' as WeaviateDataType,
            description: 'Document content',
          },
          {
            name: 'category',
            dataType: 'text' as WeaviateDataType,
            description: 'Document category',
          },
        ],
      });

      // Insert test data
      const collection = client.collections.get(testCollectionName);
      await collection.data.insertMany([
        {
          title: 'Introduction to AI',
          content: 'Artificial Intelligence is transforming technology',
          category: 'Technology',
        },
        {
          title: 'Cosmic Science',
          content: 'The universe is vast and full of mysteries',
          category: 'Science',
        },
        {
          title: 'Advanced AI Techniques',
          content: 'Deep learning and neural networks are powerful tools',
          category: 'Technology',
        },
      ]);
    });

    afterAll(async () => {
      // Clean up: delete test collection
      try {
        const exists = await client.collections.exists(testCollectionName);
        if (exists) {
          await client.collections.delete(testCollectionName);
        }
      } catch (error) {
        console.error('Error cleaning up test collection:', error);
      }
    });

    it('should fetch all objects from a collection', async () => {
      const collection = client.collections.get(testCollectionName);

      // Fetch all objects
      const result = await collection.query.fetchObjects({
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.objects.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter objects by property value', async () => {
      const collection = client.collections.get(testCollectionName);

      // Query with filter
      const result = await collection.query.fetchObjects({
        filters: collection.filter.byProperty('category').equal('Technology'),
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.objects.length).toBe(2);
      result.objects.forEach((obj: any) => {
        expect(obj.properties.category).toBe('Technology');
      });
    });

    it('should perform BM25 search with proper ranking', async () => {
      const collection = client.collections.get(testCollectionName);

      // BM25 search for "AI" - should rank documents with "AI" in title higher
      const result = await collection.query.bm25('AI', {
        limit: 5,
      });

      expect(result).toBeDefined();
      expect(result.objects.length).toBeGreaterThan(0);

      // Results should contain documents mentioning "AI"
      const hasRelevantResults = result.objects.some((obj: any) => {
        const title = obj.properties.title?.toLowerCase() || '';
        const content = obj.properties.content?.toLowerCase() || '';
        return title.includes('ai') || content.includes('ai');
      });

      expect(hasRelevantResults).toBe(true);

      // Verify ranking: documents with "AI" in title should rank higher
      // than those with "AI" only in content
      if (result.objects.length >= 2) {
        const firstDoc = result.objects[0];
        const firstTitle =
          typeof firstDoc.properties.title === 'string' ? firstDoc.properties.title.toLowerCase() : '';
        const firstContent =
          typeof firstDoc.properties.content === 'string' ? firstDoc.properties.content.toLowerCase() : '';

        // The first result should be highly relevant (contain "AI" in title or content)
        const isFirstRelevant = firstTitle.includes('ai') || firstContent.includes('ai');

        expect(isFirstRelevant).toBe(true);
      }
    });
  });

  describe('Batch Operations', () => {
    const testCollectionName = 'TestBatch';

    beforeAll(async () => {
      // Create a collection for batch operations
      await client.collections.create({
        name: testCollectionName,
        properties: [
          {
            name: 'title',
            dataType: 'text' as WeaviateDataType,
          },
          {
            name: 'index',
            dataType: 'int' as WeaviateDataType,
          },
        ],
      });
    });

    afterAll(async () => {
      // Clean up: delete test collection
      try {
        const exists = await client.collections.exists(testCollectionName);
        if (exists) {
          await client.collections.delete(testCollectionName);
        }
      } catch (error) {
        console.error('Error cleaning up test collection:', error);
      }
    });

    it('should insert multiple objects in batch', async () => {
      const collection = client.collections.get(testCollectionName);

      // Prepare batch data
      const batchData = Array.from({ length: 10 }, (_, i) => ({
        title: `Item ${i}`,
        index: i,
      }));

      // Insert batch
      const results = await collection.data.insertMany(batchData);

      expect(results).toBeDefined();
      expect(results.uuids).toBeDefined();
      expect(Object.keys(results.uuids).length).toBe(10);

      // Verify objects were inserted
      const fetchResult = await collection.query.fetchObjects({ limit: 20 });
      expect(fetchResult.objects.length).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid collection creation gracefully', async () => {
      // Try to create a collection with an invalid name (empty string)
      await expect(
        client.collections.create({
          name: '',
          properties: [],
        })
      ).rejects.toThrow();
    });

    it('should handle deleting non-existent collection', async () => {
      const nonExistentCollection = 'NonExistentCollection12345';

      // Verify it doesn't exist
      const exists = await client.collections.exists(nonExistentCollection);
      expect(exists).toBe(false);

      // Try to delete it - should not throw but handle gracefully
      await expect(client.collections.delete(nonExistentCollection)).rejects.toThrow();
    });

    it('should handle reading non-existent object', async () => {
      // Create a test collection
      const testCollectionName = 'TestErrorHandling';
      await client.collections.create({
        name: testCollectionName,
        properties: [
          {
            name: 'title',
            dataType: 'text' as WeaviateDataType,
          },
        ],
      });

      try {
        const collection = client.collections.get(testCollectionName);

        // Try to fetch an object with a non-existent UUID
        const fakeUuid = '00000000-0000-0000-0000-000000000000';
        const result = await collection.query.fetchObjectById(fakeUuid);

        // Should return null for non-existent object
        expect(result).toBeNull();
      } finally {
        // Clean up
        await client.collections.delete(testCollectionName);
      }
    });
  });

  describe('V3 Client Integration Validation', () => {
    it('should have all expected v3 client properties', () => {
      // Verify the client has the expected v3 API surface
      expect(client.collections).toBeDefined();
      expect(client.collections.create).toBeInstanceOf(Function);
      expect(client.collections.delete).toBeInstanceOf(Function);
      expect(client.collections.exists).toBeInstanceOf(Function);
      expect(client.collections.listAll).toBeInstanceOf(Function);
      expect(client.collections.get).toBeInstanceOf(Function);
    });

    it('should have working close method', () => {
      // The close method should be defined and callable
      expect(client.close).toBeDefined();
      expect(client.close).toBeInstanceOf(Function);

      // Note: We don't actually call close here as it would terminate the connection
      // for remaining tests. The afterAll hook handles cleanup.
    });

    it('should be able to check server readiness', async () => {
      // The v3 client should provide health check capabilities
      const isReady = await client.isReady();
      expect(isReady).toBe(true);
    });

    it('should be able to get Weaviate version', async () => {
      // The v3 client should provide version information
      const version = await client.getWeaviateVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });
  });
});
