import { EmbeddedDB, EmbeddedOptions } from './embedded';
import weaviate, { WeaviateClient } from 'weaviate-client';

/**
 * EmbeddedClient extends the v3 WeaviateClient interface with embedded database lifecycle management.
 *
 * v3 Migration Notes:
 * - WeaviateClient interface from weaviate-client v3 includes: collections, backup, cluster, etc.
 * - Schema management moved from .schema to .collections API in v3
 * - No WeaviateClass type in v3 (use collections API instead)
 */
export interface EmbeddedClient extends WeaviateClient {
  embedded: EmbeddedDB;
}

const app = {
  client: async function (
    embedded: EmbeddedOptions,
    conn?: { host: string; scheme: string }
  ): Promise<EmbeddedClient> {
    if (!conn) conn = { host: '127.0.0.1:6789', scheme: 'http' };
    const embeddedDB = new EmbeddedDB(embedded);
    await embeddedDB.start();
    const [host, portStr] = conn.host.split(':');
    const port = parseInt(portStr, 10);
    const client = await weaviate.connectToCustom({
      httpHost: host,
      httpPort: port,
      httpSecure: conn.scheme === 'https',
      grpcHost: host,
      grpcPort: 50051, // Default gRPC port for embedded Weaviate
      grpcSecure: conn.scheme === 'https',
    });
    const embeddedClient: EmbeddedClient = {
      ...client,
      embedded: embeddedDB,
    };
    return embeddedClient;
  },
};

export default app;
export * from './embedded';
export * from './platform';
export * from './binary-manager';

// Export v3 type definitions (explicitly exported to document v3 migration types)
export type { BinaryInfo, ProcessConfig, HealthCheckConfig } from './types';

// Export Wave 1 modules
export { waitForReady, checkHealth, checkLiveness } from './health-checker';
export * from './process-manager';

// Re-export commonly used v3 WeaviateClient types for convenience
export type { WeaviateClient } from 'weaviate-client';
