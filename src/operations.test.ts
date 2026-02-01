/**
 * Weaviate Operations Test Suite
 *
 * Tests runtime operations using a SHARED Weaviate instance.
 * Pattern: One Weaviate startup, 15+ tests, complete in 2-4 minutes.
 */
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import weaviate, { EmbeddedClient, EmbeddedOptions } from './index';
import * as net from 'net';

let sharedClient: EmbeddedClient;

const genName = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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

// Verify connection with Raft leader election retry logic (based on journey.test.ts pattern)
async function verifyConnection(client: EmbeddedClient): Promise<void> {
  const maxRetries = 10;
  const retryDelay = 1500; // 1.5 seconds
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create and delete a test collection to verify full connectivity
      const testCollection = await client.collections.create({
        name: `ConnectionTest_${Date.now()}`,
        properties: [{ name: 'test', dataType: 'text' }],
      });
      await client.collections.delete(testCollection.name);
      console.log('✅ Connection verified');
      return; // Success
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message || String(err);

      // Check if it's a Raft leader election timing issue
      if (errorMessage.includes('leader not found') && attempt < maxRetries) {
        console.log(`⏳ Raft leader not ready, retrying (${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else if (attempt === maxRetries) {
        throw new Error(`Connection verification failed after ${maxRetries} retries: ${errorMessage}`);
      } else {
        // Different error, fail immediately
        throw new Error(`Connection verification failed: ${errorMessage}`);
      }
    }
  }

  throw lastError || new Error('Connection verification failed');
}

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

afterAll(async () => {
  if (sharedClient?.embedded) {
    console.log('🛑 Stopping instance...');
    await sharedClient.embedded.stop();
  }
});

describe('Weaviate Operations Suite', () => {
  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    it.skip('Platform not supported', () => {});
    return;
  }

  describe('Collection Management', () => {
    it('creates collection with text properties', async () => {
      const name = genName('BasicSchema');
      const coll = await sharedClient.collections.create({
        name,
        properties: [
          { name: 'title', dataType: 'text' },
          { name: 'content', dataType: 'text' },
        ],
      });
      expect(coll.name).toBe(name);
    });

    it('lists all collections', async () => {
      const names = ['List1', 'List2', 'List3'].map(genName);
      await Promise.all(
        names.map((name) =>
          sharedClient.collections.create({
            name,
            properties: [{ name: 'data', dataType: 'text' }],
          })
        )
      );
      const collections = await sharedClient.collections.listAll();
      expect(collections.length).toBe(3);
      names.forEach((n) => expect(collections.map((c) => c.name)).toContain(n));
    });

    it('retrieves collection by name after creation', async () => {
      const name = genName('GetDetails');
      await sharedClient.collections.create({
        name,
        properties: [
          { name: 'title', dataType: 'text' },
          { name: 'count', dataType: 'int' },
        ],
      });
      const coll = await sharedClient.collections.get(name);
      expect(coll.name).toBe(name);
    });

    it('deletes a collection', async () => {
      const name = genName('Delete');
      await sharedClient.collections.create({
        name,
        properties: [{ name: 'data', dataType: 'text' }],
      });
      await sharedClient.collections.delete(name);
      const collections = await sharedClient.collections.listAll();
      expect(collections.find((c) => c.name === name)).toBeUndefined();
    });
  });

  describe('CRUD Operations', () => {
    it('inserts single object', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('InsertSingle'),
        properties: [
          { name: 'title', dataType: 'text' },
          { name: 'content', dataType: 'text' },
        ],
      });
      const uuid = await coll.data.insert({
        title: 'Test Article',
        content: 'Test content',
      });
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
    });

    it('inserts batch objects', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('InsertBatch'),
        properties: [
          { name: 'title', dataType: 'text' },
          { name: 'index', dataType: 'int' },
        ],
      });
      const objects = Array.from({ length: 10 }, (_, i) => ({
        title: `Article ${i}`,
        index: i,
      }));
      const results = await coll.data.insertMany(objects);
      expect(results.uuids.length).toBe(10);
    });

    it('updates an object', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('Update'),
        properties: [
          { name: 'title', dataType: 'text' },
          { name: 'status', dataType: 'text' },
        ],
      });
      const uuid = await coll.data.insert({
        title: 'Original',
        status: 'draft',
      });
      await coll.data.update({
        id: uuid,
        properties: { title: 'Updated', status: 'published' },
      });
      const obj = await coll.query.fetchObjectById(uuid);
      expect(obj?.properties.title).toBe('Updated');
      expect(obj?.properties.status).toBe('published');
    });

    it('deletes object by ID', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('DeleteById'),
        properties: [{ name: 'data', dataType: 'text' }],
      });
      const uuid = await coll.data.insert({ data: 'test' });
      await coll.data.deleteById(uuid);
      const obj = await coll.query.fetchObjectById(uuid);
      expect(obj).toBeNull();
    });

    it('deletes objects by filter', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('DeleteByFilter'),
        properties: [{ name: 'status', dataType: 'text' }],
      });
      await coll.data.insertMany([
        { status: 'draft' },
        { status: 'draft' },
        { status: 'draft' },
        { status: 'published' },
        { status: 'published' },
      ]);
      await coll.data.deleteMany(coll.filter.byProperty('status').equal('draft'));
      const remaining = await coll.query.fetchObjects({ limit: 10 });
      expect(remaining.objects.length).toBe(2);
      expect(remaining.objects.every((o) => o.properties.status === 'published')).toBe(true);
    });
  });

  describe('Query Operations', () => {
    it('fetches with limit', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('FetchLimit'),
        properties: [{ name: 'index', dataType: 'int' }],
      });
      await coll.data.insertMany(Array.from({ length: 20 }, (_, i) => ({ index: i })));
      const result = await coll.query.fetchObjects({ limit: 5 });
      expect(result.objects.length).toBe(5);
    });

    it('fetches with filters', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('FetchFilter'),
        properties: [
          { name: 'category', dataType: 'text' },
          { name: 'value', dataType: 'int' },
        ],
      });
      await coll.data.insertMany([
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'A', value: 30 },
      ]);
      const result = await coll.query.fetchObjects({
        filters: coll.filter.byProperty('category').equal('A'),
        limit: 10,
      });
      expect(result.objects.length).toBe(2);
      expect(result.objects.every((o) => o.properties.category === 'A')).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    it('bulk inserts 100+ objects', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('BulkInsert'),
        properties: [
          { name: 'index', dataType: 'int' },
          { name: 'data', dataType: 'text' },
        ],
      });
      const objects = Array.from({ length: 150 }, (_, i) => ({
        index: i,
        data: `Item ${i}`,
      }));
      const result = await coll.data.insertMany(objects);
      expect(result.uuids.length).toBe(150);
      const fetchResult = await coll.query.fetchObjects({ limit: 200 });
      expect(fetchResult.objects.length).toBe(150);
    });
  });

  describe('Error Handling', () => {
    it('rejects invalid collection names', async () => {
      await expect(
        sharedClient.collections.create({
          name: 'invalid-name-with-dashes',
          properties: [{ name: 'data', dataType: 'text' }],
        })
      ).rejects.toThrow(/invalid.*class.*name|class.*name.*invalid/i);
    });

    it('rejects invalid data types', async () => {
      const coll = await sharedClient.collections.create({
        name: genName('InvalidData'),
        properties: [{ name: 'count', dataType: 'int' }],
      });
      await expect(coll.data.insert({ count: 'not a number' })).rejects.toThrow(/type|invalid|number/i);
    });
  });
});
