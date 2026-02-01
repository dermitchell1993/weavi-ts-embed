/**
 * Core type definitions for Weaviate TypeScript Embedded Client v3 Migration
 *
 * This module provides the foundational TypeScript interfaces that serve as
 * contracts for the embedded Weaviate database functionality during the v3
 * migration. These types enable parallel development across Wave 1-3 modules.
 *
 * Note: EmbeddedOptions already exists as a class in embedded.ts for v2
 * compatibility. These additional interfaces (BinaryInfo, ProcessConfig,
 * HealthCheckConfig) provide the type contracts needed for v3 migration work.
 */

/**
 * Information about the Weaviate binary for download and management.
 *
 * Contains metadata about the Weaviate binary including version, location,
 * platform details, and verification information. Used by the binary
 * management module to download, verify, and manage Weaviate binaries.
 *
 * Type-safe: platform and arch use literal unions matching Platform interface
 * to ensure compile-time verification of supported platforms.
 *
 * @example
 * ```typescript
 * const binaryInfo: BinaryInfo = {
 *   version: '1.23.7',
 *   url: 'https://github.com/weaviate/weaviate/releases/...',
 *   path: '/home/user/.cache/weaviate-embedded-1.23.7',
 *   platform: 'linux',
 *   arch: 'x64',
 *   exists: false
 * };
 * ```
 */
export interface BinaryInfo {
  /**
   * Semantic version of the Weaviate binary (e.g., '1.23.7').
   */
  version: string;

  /**
   * Full URL where the binary can be downloaded from.
   * Typically points to a GitHub release or custom binary URL.
   */
  url: string;

  /**
   * Absolute path where the binary is (or will be) stored locally.
   */
  path: string;

  /**
   * Operating system platform.
   * Only 'darwin' (macOS) and 'linux' are supported by Weaviate Embedded.
   */
  platform: 'darwin' | 'linux';

  /**
   * CPU architecture.
   * Only 'arm64' and 'x64' are supported by Weaviate Embedded.
   */
  arch: 'arm64' | 'x64';

  /**
   * Optional checksum for binary verification (MD5, SHA256, etc.).
   * Used to verify binary integrity after download.
   */
  checksum?: string;

  /**
   * Whether the binary already exists at the specified path.
   */
  exists: boolean;
}

/**
 * Configuration for spawning and managing the Weaviate process.
 *
 * Defines how the Weaviate binary should be executed, including the binary
 * path, command-line arguments, environment variables, and working directory.
 * Used by the process management module to spawn and control the Weaviate
 * server process.
 *
 * @example
 * ```typescript
 * const processConfig: ProcessConfig = {
 *   binaryPath: '/path/to/weaviate',
 *   args: ['--host', '127.0.0.1', '--port', '6789', '--scheme', 'http'],
 *   env: {
 *     PERSISTENCE_DATA_PATH: '/data',
 *     AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
 *   }
 * };
 * ```
 */
export interface ProcessConfig {
  /**
   * Absolute path to the Weaviate binary executable.
   */
  binaryPath: string;

  /**
   * Command-line arguments to pass to the Weaviate binary.
   * Typically includes host, port, and scheme configuration.
   */
  args: string[];

  /**
   * Environment variables for the Weaviate process.
   * Includes both system env vars and Weaviate-specific configuration.
   */
  env: NodeJS.ProcessEnv;

  /**
   * Optional working directory for the spawned process.
   * Defaults to the current working directory if not specified.
   */
  cwd?: string;
}

/**
 * Configuration for health checking the embedded Weaviate instance.
 *
 * Defines parameters for verifying that the Weaviate instance is running
 * and accessible, including connection details, timeout settings, and retry
 * behavior. Used by the health check module to wait for the instance to be
 * ready and to verify its availability.
 *
 * @example
 * ```typescript
 * const healthCheckConfig: HealthCheckConfig = {
 *   host: '127.0.0.1',
 *   port: 6789,
 *   timeout: 30000,
 *   interval: 500,
 *   maxRetries: 60
 * };
 * ```
 */
export interface HealthCheckConfig {
  /**
   * Host address where Weaviate is running.
   */
  host: string;

  /**
   * Port number where Weaviate is listening.
   */
  port: number;

  /**
   * Maximum time to wait for Weaviate to become ready (in milliseconds).
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Interval between health check attempts (in milliseconds).
   * @default 500 (0.5 seconds)
   */
  interval?: number;

  /**
   * Maximum number of health check retry attempts.
   * Calculated as timeout / interval if not specified.
   */
  maxRetries?: number;

  /**
   * Whether to suppress console logging during health checks.
   * Useful for production environments where console spam is not desired.
   * @default false
   */
  silent?: boolean;
}

/**
 * Logger interface for configurable logging throughout the library.
 *
 * Users can provide a custom logger implementation to control how warnings,
 * errors, and informational messages are handled. This is particularly useful
 * for:
 * - Suppressing warnings in production environments
 * - Integrating with custom logging systems (Winston, Bunyan, etc.)
 * - Testing without console noise
 *
 * If not provided, the library will use console methods by default.
 *
 * @example
 * ```typescript
 * // Suppress all logging
 * const silentLogger: Logger = {
 *   warn: () => {},
 *   error: () => {},
 *   info: () => {}
 * };
 *
 * // Custom logging integration with debug support
 * const customLogger: Logger = {
 *   warn: (msg) => myLogSystem.warning(msg),
 *   error: (msg) => myLogSystem.error(msg),
 *   info: (msg) => myLogSystem.info(msg),
 *   debug: (msg) => myLogSystem.debug(msg)
 * };
 * ```
 */
export interface Logger {
  /**
   * Log a warning message.
   * Used for non-critical issues that users should be aware of.
   */
  warn(message: string): void;

  /**
   * Log an error message.
   * Used for critical issues that may affect functionality.
   */
  error(message: string): void;

  /**
   * Log an informational message.
   * Used for general informational messages.
   */
  info(message: string): void;

  /**
   * Log a debug message (optional).
   * Used for detailed diagnostic information.
   * This method is optional to maintain backward compatibility.
   */
  debug?(message: string): void;
}

/**
 * Default logger implementation that uses console methods.
 * This is used when no custom logger is provided.
 */
export const defaultLogger: Logger = {
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
  info: (message: string) => console.info(message),
  debug: (message: string) => console.debug(message),
};
