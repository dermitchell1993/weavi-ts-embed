// V3 API (Modern - Recommended)
export { connectToEmbedded } from './connectToEmbedded';
export type { EmbeddedOptions } from './connectToEmbedded';

// Re-export WeaviateClient from weaviate-client for convenience
export type { WeaviateClient } from 'weaviate-client';

// V2 API (Deprecated - Will be removed in future version)
// TODO [PRI-736]: Remove old v2 client code
import { EmbeddedDB, EmbeddedOptions as EmbeddedOptionsV2 } from './embedded';
import weaviate, { ConnectionParams, WeaviateClient } from 'weaviate-ts-client';

export interface EmbeddedClient extends WeaviateClient {
  embedded: EmbeddedDB;
}

const app = {
  client: function (embedded: EmbeddedOptionsV2, conn?: ConnectionParams): EmbeddedClient {
    if (!conn) conn = { host: '127.0.0.1:6789', scheme: 'http' };
    const client = weaviate.client(conn);
    const embeddedClient: EmbeddedClient = {
      ...client,
      embedded: new EmbeddedDB(embedded),
    };
    return embeddedClient;
  },
};

export default app;
export * from './embedded';
