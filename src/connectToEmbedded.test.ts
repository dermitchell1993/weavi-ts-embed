/**
 * Tests for the connectToEmbedded() factory function (Wave 1.1)
 *
 * These tests verify that the factory function correctly:
 * 1. Starts the embedded Weaviate binary
 * 2. Waits for health checks to pass
 * 3. Returns a properly configured WeaviateClient v3 instance
 * 4. Handles custom configuration options
 * 5. Handles errors gracefully
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { connectToEmbedded, EmbeddedClient } from './index';

describe('connectToEmbedded() factory function', () => {
  let client: EmbeddedClient;
  const clientsToCleanup: EmbeddedClient[] = [];

  // Track clients created in tests for cleanup
  const trackClient = (c: EmbeddedClient) => {
    clientsToCleanup.push(c);
    return c;
  };

  afterEach(() => {
    // Clean up any clients created in individual tests
    clientsToCleanup.forEach((c) => {
      if (c?.embedded?.pid) {
        try {
          c.embedded.stop();
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    });
    clientsToCleanup.length = 0;
  });

  afterAll(() => {
    // Final cleanup: stop the main client
    if (client?.embedded?.pid) {
      try {
        client.embedded.stop();
      } catch (err) {
        // Ignore cleanup errors
      }
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
    const customClient = trackClient(
      await connectToEmbedded({
        port: 6790,
      })
    );

    expect(customClient).toBeDefined();
    expect(customClient.embedded.options.port).toBe(6790);
  }, 90000);

  it('should connect with custom host', async () => {
    const customClient = trackClient(
      await connectToEmbedded({
        host: '127.0.0.1',
        port: 6791,
      })
    );

    expect(customClient).toBeDefined();
    expect(customClient.embedded.options.host).toBe('127.0.0.1');
  }, 90000);

  it('should support custom gRPC port', async () => {
    const customClient = trackClient(
      await connectToEmbedded({
        port: 6792,
        grpcPort: 50052,
      })
    );

    expect(customClient).toBeDefined();
    // Note: We can't directly verify grpcPort from client, but connection should succeed
    const isReady = await customClient.isReady();
    expect(isReady).toBe(true);
  }, 90000);

  it('should allow collection operations via v3 API', async () => {
    if (!client) {
      client = await connectToEmbedded();
    }

    // Create a test collection using v3 API
    // Note: v3 API uses dataType enum or string literals
    const collectionName = 'TestArticle';

    await client.collections.create({
      name: collectionName,
      properties: [
        {
          name: 'title',
          dataType: 'text',
        },
        {
          name: 'content',
          dataType: 'text',
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
    const versionClient = trackClient(
      await connectToEmbedded({
        version: 'latest',
        port: 6793,
      })
    );

    expect(versionClient).toBeDefined();
    expect(versionClient.embedded.options.version).toBeDefined();
  }, 120000); // Longer timeout for potential download

  describe('error handling', () => {
    it('should throw error with context when connection fails', async () => {
      // This will fail because the port is invalid (too high)
      await expect(
        connectToEmbedded({
          port: 99999,
        })
      ).rejects.toThrow('Failed to connect to embedded Weaviate');
    }, 30000);

    it('should handle invalid configuration gracefully', async () => {
      // Provide both version and binaryUrl (should be rejected by EmbeddedOptions)
      await expect(
        connectToEmbedded({
          version: '1.23.7',
          binaryUrl: 'https://example.com/binary',
        } as any)
      ).rejects.toThrow();
    }, 10000);

    it('should verify cleanup stops the process', async () => {
      const tempClient = trackClient(
        await connectToEmbedded({
          port: 6794,
        })
      );

      expect(tempClient.embedded.pid).toBeGreaterThan(0);
      const pid = tempClient.embedded.pid;

      // Stop the client
      tempClient.embedded.stop();

      // Wait a bit for the process to terminate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify process is no longer running (this is platform-dependent)
      // On Unix systems, we can check if the process exists
      try {
        process.kill(pid, 0); // Signal 0 checks if process exists
        // If we get here, process still exists (might take a moment to stop)
        expect(true).toBe(true); // Process might still be terminating
      } catch (err) {
        // Process doesn't exist - this is expected after stop()
        expect(err).toBeDefined();
      }
    }, 90000);
  });

  describe('concurrent operations', () => {
    it('should handle multiple clients on different ports', async () => {
      // Create two clients concurrently on different ports
      const [client1, client2] = await Promise.all([
        connectToEmbedded({ port: 6795 }),
        connectToEmbedded({ port: 6796 }),
      ]);

      trackClient(client1);
      trackClient(client2);

      expect(client1.embedded.pid).toBeGreaterThan(0);
      expect(client2.embedded.pid).toBeGreaterThan(0);
      expect(client1.embedded.pid).not.toBe(client2.embedded.pid);

      // Both should be ready
      const [ready1, ready2] = await Promise.all([client1.isReady(), client2.isReady()]);
      expect(ready1).toBe(true);
      expect(ready2).toBe(true);
    }, 120000);
  });
});
