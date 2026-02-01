import { describe, it, expect } from 'vitest';
import { connectToEmbedded } from '.';
import type { WeaviateClient } from 'weaviate-client';

describe('embedded', () => {
  it('checks platform', () => {});
  if (process.platform != 'linux' && process.platform != 'darwin') {
    console.warn(`Skipping because EmbeddedDB does not support ${process.platform}`);
    return;
  }

  it('starts/stops EmbeddedDB with default options', async () => {
    const client: WeaviateClient = await connectToEmbedded();
    await checkClientServerConn(client).catch((err: any) => {
      throw new Error(`unexpected failure: ${err}`);
    });
    await client.embedded?.stop();
    // Wait for the process to fully terminate before next test
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 60000); // 60s timeout - optimized with binary caching and concurrent download prevention

  it('starts/stops EmbeddedDB with custom options', async () => {
    const client: WeaviateClient = await connectToEmbedded({
      port: 7878,
      version: '1.27.0', // Updated to v1.27.0 for v3 client compatibility (gRPC requirement)
      env: {
        QUERY_DEFAULTS_LIMIT: 50,
        DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
      },
    });
    await checkClientServerConn(client).catch((err: any) => {
      client.embedded?.stop();
      throw new Error(`unexpected failure: ${err}`);
    });
    await client.embedded?.stop();
    // Wait for the process to fully terminate before next test
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 60000); // 60s timeout - optimized with binary caching and concurrent download prevention

  it('starts/stops EmbeddedDB with latest version', async () => {
    const client: WeaviateClient = await connectToEmbedded({
      port: 7880,
      version: 'latest',
    });
    await checkClientServerConn(client).catch((err: any) => {
      client.embedded?.stop();
      throw new Error(`unexpected error: ${err}`);
    });
    await client.embedded?.stop();
    // Wait for the process to fully terminate before next test
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 60000); // 60s timeout - optimized with binary caching and concurrent download prevention
});

// Checks communication between the client and embedded server
// by creating, then deleting a collection
/* eslint-disable no-await-in-loop */
async function checkClientServerConn(client: WeaviateClient) {
  const testCollection = {
    name: 'TestCollection',
    properties: [{ name: 'stringProp', dataType: 'text' }],
  };

  // The new connectToEmbedded() handles health checks and waits for Weaviate to be ready
  // So we can directly create the collection without retry logic
  try {
    const res = await client.collections.create(testCollection);
    expect(res.name).toEqual('TestCollection');
  } catch (err: any) {
    throw new Error(`unexpected error during collection creation: ${err}`);
  }

  try {
    await client.collections.delete(testCollection.name);
    console.log('collection deleted!');
  } catch (err: any) {
    throw new Error(`unexpected error: ${err}`);
  }
}
