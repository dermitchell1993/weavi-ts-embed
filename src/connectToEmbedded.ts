import { connectToLocal, WeaviateClient, AuthCredentials } from 'weaviate-client';
import { WeaviateProcess } from './weaviate-process';
import { BinaryManager } from './binary-manager';

/**
 * Options for connecting to an embedded Weaviate instance.
 */
export interface EmbeddedOptions {
  /**
   * The HTTP port for the embedded Weaviate server.
   * @default 8080
   */
  port?: number;

  /**
   * The gRPC port for the embedded Weaviate server.
   * @default 50051
   */
  grpcPort?: number;

  /**
   * The version of Weaviate to use.
   * @default 'latest'
   */
  version?: string;

  /**
   * Custom path to the Weaviate binary.
   * If not provided, the binary will be downloaded automatically.
   */
  binaryPath?: string;

  /**
   * Path where Weaviate should persist data.
   * If not provided, data will be stored in a temporary directory.
   */
  persistenceDataPath?: string;

  /**
   * Additional environment variables to pass to the Weaviate process.
   */
  additionalEnvVars?: Record<string, string>;

  /**
   * Additional headers to include in requests to Weaviate.
   */
  headers?: Record<string, string>;

  /**
   * Authentication credentials for Weaviate.
   */
  authCredentials?: AuthCredentials;
}

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
  const {
    port = 8080,
    grpcPort = 50051,
    version = 'latest',
    binaryPath,
    persistenceDataPath,
    additionalEnvVars = {},
    headers,
    authCredentials,
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

  // STUB: In future PRs, this will:
  // 1. Check if binary exists at binaryPath or download it (PRI-734)
  // 2. Detect platform and select correct binary (PRI-735)
  // 3. Spawn Weaviate process with environment variables (PRI-737)
  // 4. Wait for health check to pass (PRI-738)
  // 5. Handle port conflicts gracefully (PRI-739)

  console.log('[Embedded Weaviate] STUB: Binary lifecycle not yet implemented');
  console.log('[Embedded Weaviate] Assuming Weaviate is already running on specified ports...');

  // Initialize WeaviateProcess for lifecycle management
  // This will be fully integrated when PRI-737 (Process Spawning) is complete
  const weaviateProcess = new WeaviateProcess();

  // TODO [PRI-737]: Uncomment when process spawning is implemented
  // const binaryManager = new BinaryManager();
  // const resolvedBinaryPath = binaryPath || await binaryManager.ensureBinary(version);
  // await weaviateProcess.start({
  //   binaryPath: resolvedBinaryPath,
  //   port,
  //   grpcPort,
  //   persistenceDataPath,
  //   additionalEnvVars,
  // });

  // TODO [PRI-738]: Uncomment when health check is implemented
  // await waitForReady(port, grpcPort);

  // Connect to the embedded instance using the official v3 client
  const client = await connectToLocal({
    host: 'localhost',
    port,
    grpcPort,
    headers,
    authCredentials,
  });

  console.log('[Embedded Weaviate] Connected successfully!');

  // Hook into client.close() to gracefully shut down the embedded process
  const originalClose = client.close.bind(client);
  client.close = async () => {
    console.log('🛑 Shutting down embedded Weaviate instance...');

    // Close the client connection first
    await originalClose();

    // Stop the Weaviate process gracefully
    await weaviateProcess.stop();

    console.log('✅ Embedded Weaviate shutdown complete');
  };

  return client;
}
