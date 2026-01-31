import { EmbeddedDB, EmbeddedOptions, EmbeddedOptionsConfig } from './embedded';
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

/**
 * Connect to an embedded Weaviate instance with the official v3 client.
 *
 * This is the main factory function for Wave 1 that wraps the embedded
 * Weaviate database with the official WeaviateClient v3 interface.
 *
 * Implementation Flow:
 * 1. Initialize EmbeddedOptions from the provided configuration
 * 2. Create and start the embedded Weaviate binary
 * 3. Wait for the health check to confirm the instance is ready
 * 4. Return a WeaviateClient v3 instance connected via connectToLocal()
 *
 * @param options - Optional configuration for the embedded Weaviate instance
 * @returns Promise resolving to a WeaviateClient v3 instance with embedded DB management
 *
 * @example
 * ```typescript
 * import { connectToEmbedded } from 'weaviate-ts-embedded';
 *
 * // Connect with default settings
 * const client = await connectToEmbedded();
 *
 * // Connect with custom configuration
 * const client = await connectToEmbedded({
 *   host: '127.0.0.1',
 *   port: 8080,
 *   version: '1.23.7'
 * });
 *
 * // Use the client (v3 API)
 * const myCollection = client.collections.get('Article');
 * const result = await myCollection.query.fetchObjects();
 *
 * // Cleanup when done
 * client.embedded.stop();
 * ```
 */
export async function connectToEmbedded(options?: EmbeddedOptionsConfig): Promise<EmbeddedClient> {
  // Initialize embedded options with defaults
  const embeddedOptions = new EmbeddedOptions(options);

  // Create the embedded database instance
  const embeddedDB = new EmbeddedDB(embeddedOptions);

  // Start the binary and wait for health check
  await embeddedDB.start();

  // Connect using the official v3 client with connectToLocal()
  // The embedded instance runs on localhost by default
  const client = await weaviate.connectToLocal({
    host: embeddedOptions.host,
    port: embeddedOptions.port,
    grpcPort: 50051, // Default gRPC port for embedded Weaviate
  });

  // Extend the client with embedded DB management
  const embeddedClient: EmbeddedClient = {
    ...client,
    embedded: embeddedDB,
  };

  return embeddedClient;
}

// Legacy API - preserved for backward compatibility
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

// Export v3 type definitions (explicitly exported to document v3 migration types)
export type { BinaryInfo, ProcessConfig, HealthCheckConfig } from './types';

// Re-export commonly used v3 WeaviateClient types for convenience
export type { WeaviateClient } from 'weaviate-client';
