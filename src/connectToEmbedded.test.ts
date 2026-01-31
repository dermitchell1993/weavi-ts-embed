/**
 * Tests for the connectToEmbedded() factory function (Wave 1.1)
 *
 * These tests verify that the factory function correctly:
 * 1. Starts the embedded Weaviate binary
 * 2. Waits for health checks to pass
 * 3. Returns a properly configured WeaviateClient v3 instance
 * 4. Handles custom configuration options
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectToEmbedded, EmbeddedClient } from './index';

describe('connectToEmbedded() factory function', () => {
  let client: EmbeddedClient;

  afterAll(() => {
    // Cleanup: stop the embedded instance after all tests
    if (client?.embedded) {
      client.embedded.stop();
    }
  });

  it('should connect to embedded Weaviate with default options', async () => {
    client = await connectToEmbedded();

    // Verify we got a valid client
    expect(client).toBeDefined();
    expect(client.embedded).toBeDefined();

    // Verify the embedded instance is running
    expect(client.embedded.pid).toBeGreaterThan(0);

    // Verify the client has v3 API methods
    expect(client.collections).toBeDefined();
    expect(typeof client.collections.create).toBe('function');

    // Verify we can make a basic API call
    const isReady = await client.isReady();
    expect(isReady).toBe(true);
  }, 90000); // Extended timeout for binary download and startup

  it('should connect with custom port', async () => {
    const customClient = await connectToEmbedded({
      port: 6790,
    });

    expect(customClient).toBeDefined();
    expect(customClient.embedded.options.port).toBe(6790);

    // Cleanup
    customClient.embedded.stop();
  }, 90000);

  it('should connect with custom host', async () => {
    const customClient = await connectToEmbedded({
      host: '127.0.0.1',
      port: 6791,
    });

    expect(customClient).toBeDefined();
    expect(customClient.embedded.options.host).toBe('127.0.0.1');

    // Cleanup
    customClient.embedded.stop();
  }, 90000);

  it('should allow collection operations via v3 API', async () => {
    if (!client) {
      client = await connectToEmbedded();
    }

    // Create a test collection using v3 API
    const collectionName = 'TestArticle';

    await client.collections.create({
      name: collectionName,
      properties: [
        {
          name: 'title',
          dataType: 'text' as any,
        },
        {
          name: 'content',
          dataType: 'text' as any,
        },
      ],
    });

    // Verify collection exists
    const collection = client.collections.get(collectionName);
    expect(collection).toBeDefined();

    // Verify we can query the collection
    const result = await collection.query.fetchObjects();
    expect(result).toBeDefined();
    expect(Array.isArray(result.objects)).toBe(true);

    // Cleanup: delete the collection
    await client.collections.delete(collectionName);
  }, 90000);

  it('should properly extend WeaviateClient interface', async () => {
    if (!client) {
      client = await connectToEmbedded();
    }

    // Verify all expected v3 client properties/methods exist
    expect(client.collections).toBeDefined();
    expect(client.backup).toBeDefined();
    expect(client.cluster).toBeDefined();
    expect(client.isReady).toBeDefined();
    expect(client.getOpenIDConfiguration).toBeDefined();
    expect(client.getMeta).toBeDefined();

    // Verify embedded property exists
    expect(client.embedded).toBeDefined();
    expect(typeof client.embedded.start).toBe('function');
    expect(typeof client.embedded.stop).toBe('function');
  }, 90000);

  it('should handle version specification', async () => {
    // Note: This test might be slow as it may download a specific version
    const versionClient = await connectToEmbedded({
      version: 'latest',
      port: 6792,
    });

    expect(versionClient).toBeDefined();
    expect(versionClient.embedded.options.version).toBeDefined();

    // Cleanup
    versionClient.embedded.stop();
  }, 120000); // Longer timeout for potential download
});
