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
 * Options for connecting to an embedded Weaviate instance
 */
export interface ConnectToEmbeddedOptions extends EmbeddedOptionsConfig {
  /**
   * gRPC port for the embedded Weaviate instance
   * @default 50051
   */
  grpcPort?: number;
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
 * Error Handling:
 * - Throws if binary download fails (network, disk space, permissions)
 * - Throws if health check times out (binary won't start, port conflicts)
 * - Throws if connection to Weaviate fails (configuration issues)
 *
 * @param options - Optional configuration for the embedded Weaviate instance
 * @returns Promise resolving to a WeaviateClient v3 instance with embedded DB management
 * @throws Error if binary cannot be downloaded, started, or connected to
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
 *   grpcPort: 50052,
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
export async function connectToEmbedded(options?: ConnectToEmbeddedOptions): Promise<EmbeddedClient> {
  try {
    // Initialize embedded options with defaults
    const embeddedOptions = new EmbeddedOptions(options);

    // Create the embedded database instance
    const embeddedDB = new EmbeddedDB(embeddedOptions);

    // Start the binary and wait for health check
    // This can throw if: binary download fails, health check times out, port already in use
    await embeddedDB.start();

    // Give the system a moment to fully stabilize after Raft election
    // This prevents "connection refused" errors in CI environments
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Connect using the official v3 client with connectToLocal()
    // The embedded instance runs on localhost by default
    // gRPC port defaults to 50051 but can be customized
    const grpcPort = options?.grpcPort ?? 50051;
    const client = await weaviate.connectToLocal({
      host: embeddedOptions.host,
      port: embeddedOptions.port,
      grpcPort,
    });

    // Extend the client with embedded DB management
    const embeddedClient: EmbeddedClient = {
      ...client,
      embedded: embeddedDB,
    };

    return embeddedClient;
  } catch (error) {
    // Re-throw with more context for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect to embedded Weaviate: ${errorMessage}`);
  }
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
export * from './binary-manager';

// Export v3 type definitions (explicitly exported to document v3 migration types)
export type { BinaryInfo, ProcessConfig, HealthCheckConfig } from './types';

// Export Wave 1 modules
export { waitForReady, checkHealth, checkLiveness } from './health-checker';
export * from './process-manager';

// Re-export commonly used v3 WeaviateClient types for convenience
export type { WeaviateClient } from 'weaviate-client';
