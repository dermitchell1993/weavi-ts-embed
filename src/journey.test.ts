import { describe, it, expect } from 'vitest';
import weaviate, { EmbeddedClient, EmbeddedOptions } from '.';

describe.concurrent('embedded', () => {
  it('checks platform', () => {});
  if (process.platform != 'linux' && process.platform != 'darwin') {
    console.warn(`Skipping because EmbeddedDB does not support ${process.platform}`);
    return;
  }

  it('starts/stops EmbeddedDB with default options', async () => {
    const client: EmbeddedClient = await weaviate.client(new EmbeddedOptions());
    await checkClientServerConn(client).catch((err: any) => {
      throw new Error(`unexpected failure: ${err}`);
    });
    client.embedded.stop();
    // Wait for the process to fully terminate before next test
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 60000); // Optimized timeout to 60s for embedded DB startup

  it('starts/stops EmbeddedDB with custom options', async () => {
    const client: EmbeddedClient = await weaviate.client(
      new EmbeddedOptions({
        port: 7878,
        version: '1.27.0', // Updated to v1.27.0 for v3 client compatibility (gRPC requirement)
        env: {
          QUERY_DEFAULTS_LIMIT: 50,
          DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
        },
      }),
      {
        scheme: 'http',
        host: '127.0.0.1:7878',
      }
    );
    await checkClientServerConn(client).catch((err: any) => {
      client.embedded.stop();
      throw new Error(`unexpected failure: ${err}`);
    });
    client.embedded.stop();
    // Wait for the process to fully terminate before next test
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 60000); // Optimized timeout to 60s for embedded DB startup

  it('starts/stops EmbeddedDB with latest version', async () => {
    const client: EmbeddedClient = await weaviate.client(
      new EmbeddedOptions({
        port: 7880,
        version: 'latest',
      }),
      {
        scheme: 'http',
        host: '127.0.0.1:7880',
      }
    );
    await checkClientServerConn(client).catch((err: any) => {
      client.embedded.stop();
      throw new Error(`unexpected failure: ${err}`);
    });
    client.embedded.stop();
    // Wait for the process to fully terminate before next test
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 60000); // Optimized timeout to 60s for embedded DB startup
});

// Checks communication between the client and embedded server
// by creating, then deleting a collection
/* eslint-disable no-await-in-loop */
async function checkClientServerConn(client: EmbeddedClient) {
  const testCollection = {
    name: 'TestCollection',
    properties: [{ name: 'stringProp', dataType: 'text' }],
  };

  // Optimized retry logic to handle Raft leader election timing
  const maxRetries = 5;
  const retryDelay = 500; // 0.5 seconds delay
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await client.collections.create(testCollection);
      expect(res.name).toEqual('TestCollection');
      break; // Success, exit retry loop
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message || String(err);

      // Check if it's a "leader not found" error (Raft not ready)
      if (errorMessage.includes('leader not found') && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else if (attempt === maxRetries) {
        throw new Error(`failed to create collection after ${maxRetries} retries: ${lastError}`);
      } else {
        // Different error, fail immediately
        throw new Error(`unexpected error during collection creation: ${err}`);
      }
    }
  }

  try {
    await client.collections.delete(testCollection.name);
    console.log('collection deleted!');
  } catch (err: any) {
    throw new Error(`unexpected error: ${err}`);
  }
}
