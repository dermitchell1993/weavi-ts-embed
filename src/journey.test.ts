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
  });

  it('starts/stops EmbeddedDB with custom options', async () => {
    const client: EmbeddedClient = await weaviate.client(
      new EmbeddedOptions({
        port: 7878,
        version: '1.19.8',
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
  });

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
  });

  it('starts/stops EmbeddedDB with binaryUrl', async () => {
    let binaryUrl = 'https://github.com/weaviate/weaviate/releases/download/v1.19.8/weaviate-v1.19.8-';
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
  });
});

// Checks communication between the client and embedded server
// by creating, then deleting a collection
async function checkClientServerConn(client: EmbeddedClient) {
  const testCollection = {
    name: 'TestCollection',
    properties: [{ name: 'stringProp', dataType: 'text' }],
  };

  try {
    const res = await client.collections.create(testCollection);
    expect(res.name).toEqual('TestCollection');
    console.log('collection created!');
  } catch (err: any) {
    throw new Error(`unexpected error: ${err}`);
  }

  try {
    await client.collections.delete(testCollection.name);
    console.log('collection deleted!');
  } catch (err: any) {
    throw new Error(`unexpected error: ${err}`);
  }
}
