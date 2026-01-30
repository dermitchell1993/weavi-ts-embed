import { describe, it, expect } from 'vitest';
import weaviate, { EmbeddedClient, EmbeddedOptions } from '.';

describe('embedded', () => {
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
  }, 30000); // Optimized timeout to 30s for embedded DB startup

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
  }, 30000); // Optimized timeout to 30s for embedded DB startup

  it('starts/stops EmbeddedDB with latest version', async () => {
    const client: EmbeddedClient = await weaviate.client(
      new EmbeddedOptions({
        version: 'latest',
      })
    );
    await checkClientServerConn(client).catch((err: any) => {
      client.embedded.stop();
      throw new Error(`unexpected failure: ${err}`);
    });
    client.embedded.stop();
    // Wait for the process to fully terminate before next test
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 30000); // Optimized timeout to 30s for embedded DB startup

  it('starts/stops EmbeddedDB with binaryUrl', async () => {
    // Updated to v1.27.0 for v3 client compatibility (gRPC requirement)
    let binaryUrl = 'https://github.com/weaviate/weaviate/releases/download/v1.27.0/weaviate-v1.27.0-';
    if (process.platform == 'darwin') {
      binaryUrl += 'darwin-all.zip';
    } else {
      binaryUrl += `linux-amd64.tar.gz`;
    }
    const client: EmbeddedClient = await weaviate.client(
      new EmbeddedOptions({
        binaryUrl: binaryUrl,
      })
    );
    await checkClientServerConn(client).catch((err: any) => {
      client.embedded.stop();
      throw new Error(`unexpected failure: ${err}`);
    });
    client.embedded.stop();
    // Wait for the process to fully terminate
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 30000); // Optimized timeout to 30s for embedded DB startup
});

// Checks communication between the client and embedded server
// by creating, then deleting a collection
/* eslint-disable no-await-in-loop */
async function checkClientServerConn(client: EmbeddedClient) {
  const testCollection = {
    name: 'TestCollection',
    properties: [{ name: 'stringProp', dataType: 'text' }],
  };

  // Enhanced retry logic to handle Raft leader election timing
  const maxRetries = parseInt(process.env.WEAVIATE_COLLECTION_RETRY_MAX || '20', 10);
  const baseRetryDelay = parseInt(process.env.WEAVIATE_COLLECTION_RETRY_DELAY || '2500', 10); // 2.5 seconds base delay
  let lastError: any;

  console.log(
    `Testing collection creation with ${maxRetries} max retries, ${baseRetryDelay}ms base delay...`
  );

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Creating test collection...`);
      const res = await client.collections.create(testCollection);
      expect(res.name).toEqual('TestCollection');
      console.log('✅ Collection created successfully!');
      break; // Success, exit retry loop
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message || String(err);
      console.log(`❌ Attempt ${attempt} failed: ${errorMessage}`);

      // Check for Raft-related errors that indicate leader election issues
      const isRaftError =
        errorMessage.includes('leader not found') ||
        errorMessage.includes('raft') ||
        errorMessage.includes('consensus') ||
        errorMessage.includes('no leader') ||
        errorMessage.includes('election');

      if (isRaftError && attempt < maxRetries) {
        // Exponential backoff with jitter to handle timing variations
        const delay = baseRetryDelay + Math.random() * 1000 + attempt * 500;
        console.log(
          `🔄 Raft system not ready (attempt ${attempt}/${maxRetries}), waiting ${delay}ms before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (attempt === maxRetries) {
        console.error(`💥 Failed to create collection after ${maxRetries} retries. Last error: ${lastError}`);
        throw new Error(`failed to create collection after ${maxRetries} retries: ${lastError}`);
      } else {
        // Different error, fail immediately
        console.error(`💥 Unexpected error during collection creation: ${err}`);
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
