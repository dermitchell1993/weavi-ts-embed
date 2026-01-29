import type { AuthCredentials } from 'weaviate-client';

/**
 * Configuration options for Weaviate Embedded.
 *
 * @example
 * ```typescript
 * const client = await connectToEmbedded({
 *   port: 8080,
 *   grpcPort: 50051,
 *   version: '1.27.0',
 *   persistenceDataPath: './my-weaviate-data',
 * });
 * ```
 */
export interface EmbeddedOptions {
  /**
   * HTTP port for Weaviate REST API.
   * @default 8080
   */
  port?: number;

  /**
   * gRPC port for high-performance operations.
   * @default 50051
   */
  grpcPort?: number;

  /**
   * Weaviate version to run. Use 'latest' for newest stable.
   * @default 'latest'
   * @example '1.27.0'
   */
  version?: string;

  /**
   * Path to custom binary (overrides automatic download).
   * @example '/usr/local/bin/weaviate'
   */
  binaryPath?: string;

  /**
   * Directory for Weaviate data persistence.
   * @default './data/weaviate'
   */
  persistenceDataPath?: string;

  /**
   * Additional environment variables for Weaviate process.
   * @example { ENABLE_MODULES: 'text2vec-openai', LOG_LEVEL: 'debug' }
   */
  additionalEnvVars?: Record<string, string>;

  /**
   * Custom HTTP headers for client requests.
   * @example { 'X-OpenAI-Api-Key': 'sk-...' }
   */
  headers?: Record<string, string>;

  /**
   * Authentication credentials.
   * @example { apiKey: 'your-api-key' }
   */
  authCredentials?: AuthCredentials;
}

/**
 * Validates a port number.
 * @param port - The port number to validate
 * @param portType - The type of port (for error messages)
 * @throws {Error} If the port is invalid
 */
function validatePort(port: number | undefined, portType: string): void {
  if (port === undefined) {
    return;
  }

  if (!Number.isInteger(port)) {
    throw new Error(`${portType} must be an integer`);
  }
  if (port < 1024 || port > 65535) {
    throw new Error(`${portType} must be between 1024 and 65535`);
  }
}

/**
 * Validates version format.
 * @param version - The version string to validate
 * @throws {Error} If the version format is invalid
 */
function validateVersion(version: string | undefined): void {
  if (version === undefined || version === '') {
    return;
  }

  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (version !== 'latest' && !versionPattern.test(version)) {
    throw new Error('Version must be in format X.Y.Z or "latest"');
  }
}

/**
 * Validates a string record (object with string values).
 * @param record - The record to validate
 * @param fieldName - The name of the field (for error messages)
 * @throws {Error} If the record is invalid
 */
function validateStringRecord(record: Record<string, string> | undefined, fieldName: string): void {
  if (record === undefined) {
    return;
  }

  if (typeof record !== 'object' || record === null) {
    throw new Error(`${fieldName} must be an object`);
  }

  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName}.${key} must be a string, got ${typeof value}`);
    }
  }
}

/**
 * Validates the EmbeddedOptions configuration.
 *
 * @param options - The options object to validate
 * @throws {Error} If any validation fails
 *
 * @example
 * ```typescript
 * try {
 *   validateOptions({ port: 8080, grpcPort: 50051 });
 * } catch (error) {
 *   console.error('Invalid options:', error.message);
 * }
 * ```
 */
export function validateOptions(options?: EmbeddedOptions): void {
  if (!options) {
    return;
  }

  // Validate ports
  validatePort(options.port, 'Port');
  validatePort(options.grpcPort, 'gRPC port');

  // Validate that ports are different if both are provided
  if (options.port !== undefined && options.grpcPort !== undefined && options.port === options.grpcPort) {
    throw new Error('HTTP port and gRPC port must be different');
  }

  // Validate version format
  validateVersion(options.version);

  // Validate string fields
  if (options.binaryPath !== undefined && typeof options.binaryPath !== 'string') {
    throw new Error('binaryPath must be a string');
  }

  if (options.persistenceDataPath !== undefined && typeof options.persistenceDataPath !== 'string') {
    throw new Error('persistenceDataPath must be a string');
  }

  // Validate string records
  validateStringRecord(options.additionalEnvVars, 'additionalEnvVars');
  validateStringRecord(options.headers, 'headers');

  // Validate authCredentials (basic check - detailed validation handled by weaviate-client)
  if (options.authCredentials !== undefined) {
    if (typeof options.authCredentials !== 'object' || options.authCredentials === null) {
      throw new Error('authCredentials must be an object');
    }
  }
}
