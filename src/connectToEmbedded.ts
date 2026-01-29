import { connectToLocal, WeaviateClient } from 'weaviate-client';
import { WeaviateProcess } from './weaviate-process';
import { BinaryManager } from './binary-manager';
import { waitForReady } from './health-check';
import { EmbeddedOptions, validateOptions } from './embedded-options';

// Re-export for convenience
export type { EmbeddedOptions };

/**
 * Connect to an embedded Weaviate instance.
 *
 * This function starts a local Weaviate server process and returns a connected client.
 * The embedded server will be automatically downloaded if not already present.
 *
 * @param options Configuration options for the embedded instance
 * @returns A Promise that resolves to a WeaviateClient connected to the embedded instance
 *
 * @example
 * ```typescript
 * import { connectToEmbedded } from 'weaviate-ts-embedded';
 *
 * const client = await connectToEmbedded({
 *   port: 8080,
 *   version: '1.27.0'
 * });
 *
 * // Use the client...
 * const collections = await client.collections.list();
 *
 * // Clean up
 * await client.close();
 * ```
 */
export async function connectToEmbedded(options: EmbeddedOptions = {}): Promise<WeaviateClient> {
  // Validate options before proceeding
  validateOptions(options);

  const {
    port = 8080,
    grpcPort = 50051,
    version = 'latest',
    binaryPath,
    persistenceDataPath,
    additionalEnvVars = {},
    headers,
    authCredentials,
    healthCheckTimeout = 30000,
  } = options;

  // TODO [PRI-734]: Implement binary download manager with checksum verification
  // TODO [PRI-735]: Implement platform detection and binary selection
  // TODO [PRI-737]: Implement process spawning with environment variable support
  // TODO [PRI-738]: Implement health check with retry logic
  // TODO [PRI-739]: Implement port management and conflict detection

  console.log('[Embedded Weaviate] Starting embedded instance...');
  console.log(`[Embedded Weaviate] Version: ${version}`);
  console.log(`[Embedded Weaviate] HTTP Port: ${port}`);
  console.log(`[Embedded Weaviate] gRPC Port: ${grpcPort}`);
  console.log(`[Embedded Weaviate] Binary Path: ${binaryPath || '(auto-download)'}`);
  console.log(`[Embedded Weaviate] Data Path: ${persistenceDataPath || '(temporary)'}`);
  console.log(`[Embedded Weaviate] Additional Env Vars: ${Object.keys(additionalEnvVars).length} variables`);

  // Binary lifecycle management:
  // ✅ Binary download and management (PRI-734, PRI-735)
  // ✅ Process spawning with environment variables (PRI-737)
  // ✅ Health check with retry logic (PRI-738)
  // ✅ Shutdown lifecycle and resource cleanup (PRI-740)
  // TODO: Port conflict detection (PRI-739)

  // Initialize WeaviateProcess for lifecycle management
  const weaviateProcess = new WeaviateProcess();

  // PRI-737: Process spawning with binary management
  const binaryManager = new BinaryManager();
  const resolvedBinaryPath = binaryPath || (await binaryManager.ensureBinary(version));
  await weaviateProcess.start({
    binaryPath: resolvedBinaryPath,
    port,
    grpcPort,
    persistenceDataPath,
    additionalEnvVars,
  });

  // PRI-738: Wait for Weaviate to be ready with health check
  await waitForReady(port, { timeout: healthCheckTimeout });

  // Connect to the embedded instance using the official v3 client
  const client = await connectToLocal({
    host: 'localhost',
    port,
    grpcPort,
    headers,
    authCredentials,
  });

  // Validate that the client was created successfully
  if (!client) {
    throw new Error(
      'Failed to connect to Weaviate: connectToLocal returned undefined. This may indicate a gRPC connection issue.'
    );
  }

  console.log('[Embedded Weaviate] Connected successfully!');

  // Hook into client.close() to gracefully shut down the embedded process
  const originalClose = client.close.bind(client);
  client.close = async () => {
    console.log('🛑 Shutting down embedded Weaviate instance...');

    // Use try-finally to ensure process cleanup happens even if client close fails
    // This is critical because:
    // 1. The embedded process MUST be stopped to avoid resource leaks
    // 2. Client close failure shouldn't leave orphaned processes
    // 3. Process cleanup is independent of client connection state
    try {
      // Close the client connection first
      await originalClose();
    } finally {
      // Always stop the Weaviate process, even if client close failed
      // This ensures proper cleanup in all scenarios
      await weaviateProcess.stop();

      console.log('✅ Embedded Weaviate shutdown complete');
    }
  };

  // Attach process instance to client for debugging/testing
  // This allows checking process state and enables better testing
  (client as any).__weaviateProcess = weaviateProcess;

  return client;
}
