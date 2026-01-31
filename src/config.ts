/**
 * Configuration Validator Module (Wave 1.5)
 *
 * Provides validation, default application, and configuration merging for
 * EmbeddedOptions. This module ensures that user-provided configuration
 * is valid, complete, and ready for use by other Wave 1 modules.
 *
 * Target: ✅ Returns validated configuration object
 *
 * @example
 * ```typescript
 * import { validateOptions, applyDefaults, mergeConfig } from './config';
 *
 * const userConfig = { port: 8080 };
 * const validated = validateOptions(applyDefaults(userConfig));
 * ```
 */

import { EmbeddedOptionsConfig } from './embedded';

/**
 * Default configuration values for embedded Weaviate instance.
 * These defaults are applied when user doesn't provide specific values.
 */
export const DEFAULT_CONFIG: Required<Omit<EmbeddedOptionsConfig, 'version' | 'binaryUrl'>> & {
  version: string;
  binaryUrl: string | undefined;
} = {
  host: '127.0.0.1',
  port: 6789,
  env: {},
  version: 'latest',
  binaryUrl: undefined,
};

/**
 * Configuration validation error with detailed message and field information.
 */
export class ConfigValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates host field
 */
function validateHost(host: string): void {
  if (typeof host !== 'string') {
    throw new ConfigValidationError('Host must be a string', 'host');
  }
  if (host.trim().length === 0) {
    throw new ConfigValidationError('Host cannot be empty', 'host');
  }
  // Basic host format validation (IPv4, IPv6, or hostname)
  // IPv4: strict validation for each octet (0-255)
  const ipv4Pattern =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
  // IPv6: basic pattern matching
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  // Hostname: alphanumeric with hyphens, can have dots, but must start with letter
  const hostnamePattern =
    /^(?:localhost|[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/;

  if (!ipv4Pattern.test(host) && !ipv6Pattern.test(host) && !hostnamePattern.test(host)) {
    throw new ConfigValidationError(
      'Host must be a valid IPv4 address, IPv6 address, localhost, or hostname',
      'host'
    );
  }
}

/**
 * Validates port field
 */
function validatePort(port: number): void {
  if (typeof port !== 'number') {
    throw new ConfigValidationError('Port must be a number', 'port');
  }
  if (!Number.isInteger(port)) {
    throw new ConfigValidationError('Port must be an integer', 'port');
  }
  if (port < 1 || port > 65535) {
    throw new ConfigValidationError('Port must be between 1 and 65535', 'port');
  }
}

/**
 * Validates version field
 */
function validateVersion(version: string): void {
  if (typeof version !== 'string') {
    throw new ConfigValidationError('Version must be a string', 'version');
  }
  if (version !== 'latest') {
    // Semantic version format: {major}.{minor}.{patch}
    // Match patterns like: 1.23.7, 1.2.3, 10.20.30
    const versionPattern = /^[1-9]\d*\.\d+\.\d+$/;
    if (!versionPattern.test(version)) {
      throw new ConfigValidationError(
        "Version must be 'latest' or follow semantic versioning format: {major}.{minor}.{patch}",
        'version'
      );
    }
  }
}

/**
 * Validates binaryUrl field
 */
function validateBinaryUrl(binaryUrl: string): void {
  if (typeof binaryUrl !== 'string') {
    throw new ConfigValidationError('BinaryUrl must be a string', 'binaryUrl');
  }
  if (binaryUrl.trim().length === 0) {
    throw new ConfigValidationError('BinaryUrl cannot be empty', 'binaryUrl');
  }
  // Basic URL format validation
  try {
    // eslint-disable-next-line no-new
    new URL(binaryUrl);
  } catch {
    throw new ConfigValidationError('BinaryUrl must be a valid URL', 'binaryUrl');
  }
}

/**
 * Validates env field
 */
function validateEnv(env: object): void {
  if (typeof env !== 'object' || env === null || Array.isArray(env)) {
    throw new ConfigValidationError('Env must be an object', 'env');
  }
  // Validate that all env values are strings, numbers, or undefined
  for (const [key, value] of Object.entries(env)) {
    if (
      value !== undefined &&
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      throw new ConfigValidationError(
        `Environment variable "${key}" must be a string, number, boolean, or undefined`,
        'env'
      );
    }
  }
}

/**
 * Validates that the provided configuration is correct and consistent.
 *
 * Performs comprehensive validation including:
 * - Type checking for all configuration fields
 * - Range validation for numeric values (port)
 * - Format validation for version strings
 * - Mutual exclusivity checks (version vs binaryUrl)
 * - Host format validation
 *
 * @param config - Configuration object to validate
 * @returns The same configuration object if validation passes
 * @throws {ConfigValidationError} If validation fails with detailed error message
 *
 * @example
 * ```typescript
 * // Valid configuration
 * const config = validateOptions({ host: '127.0.0.1', port: 8080 });
 *
 * // Invalid configuration - throws error
 * try {
 *   validateOptions({ port: 70000 }); // Port out of range
 * } catch (error) {
 *   console.error(error.message); // "Port must be between 1 and 65535"
 * }
 * ```
 */
export function validateOptions(config: EmbeddedOptionsConfig): EmbeddedOptionsConfig {
  // Validate mutual exclusivity of version and binaryUrl
  if (config.version !== undefined && config.binaryUrl !== undefined) {
    throw new ConfigValidationError(
      'Cannot provide both version and binaryUrl - they are mutually exclusive',
      'version/binaryUrl'
    );
  }

  // Validate each field using helper functions
  if (config.host !== undefined) {
    validateHost(config.host);
  }

  if (config.port !== undefined) {
    validatePort(config.port);
  }

  if (config.version !== undefined) {
    validateVersion(config.version);
  }

  if (config.binaryUrl !== undefined) {
    validateBinaryUrl(config.binaryUrl);
  }

  if (config.env !== undefined) {
    validateEnv(config.env);
  }

  return config;
}

/**
 * Applies default values to a configuration object.
 *
 * Creates a new configuration object with defaults applied for any missing
 * fields. User-provided values always take precedence over defaults.
 * Does not modify the input configuration object.
 *
 * Default values:
 * - host: '127.0.0.1'
 * - port: 6789
 * - env: {}
 * - version: 'latest'
 *
 * @param config - Partial configuration object with user values
 * @returns New configuration object with defaults applied
 *
 * @example
 * ```typescript
 * const userConfig = { port: 8080 };
 * const withDefaults = applyDefaults(userConfig);
 * // Result: { host: '127.0.0.1', port: 8080, env: {}, version: 'latest' }
 * ```
 */
export function applyDefaults(config?: EmbeddedOptionsConfig): EmbeddedOptionsConfig {
  if (!config) {
    return { ...DEFAULT_CONFIG, binaryUrl: undefined };
  }

  // Create a new object with defaults and user overrides
  return {
    host: config.host ?? DEFAULT_CONFIG.host,
    port: config.port ?? DEFAULT_CONFIG.port,
    env: config.env ?? DEFAULT_CONFIG.env,
    version: config.version ?? (config.binaryUrl ? undefined : DEFAULT_CONFIG.version),
    binaryUrl: config.binaryUrl,
  };
}

/**
 * Merges two configuration objects with priority given to the override config.
 *
 * Performs a deep merge of configuration objects where:
 * - Primitive values (host, port, version, binaryUrl) from override take precedence
 * - Environment variables are merged, with override values taking precedence
 * - Undefined values in override do not override base values
 * - Does not modify input configuration objects
 *
 * This is useful for layering configurations (e.g., default → user → runtime).
 *
 * @param base - Base configuration object
 * @param override - Configuration object with values to override base
 * @returns New merged configuration object
 *
 * @example
 * ```typescript
 * const base = { host: '127.0.0.1', port: 6789, env: { DEBUG: 'true' } };
 * const override = { port: 8080, env: { LOG_LEVEL: 'info' } };
 * const merged = mergeConfig(base, override);
 * // Result: {
 * //   host: '127.0.0.1',
 * //   port: 8080,
 * //   env: { DEBUG: 'true', LOG_LEVEL: 'info' }
 * // }
 * ```
 */
export function mergeConfig(
  base: EmbeddedOptionsConfig,
  override: EmbeddedOptionsConfig
): EmbeddedOptionsConfig {
  // Start with base config
  const merged: EmbeddedOptionsConfig = { ...base };

  // Override primitive values if provided
  if (override.host !== undefined) {
    merged.host = override.host;
  }
  if (override.port !== undefined) {
    merged.port = override.port;
  }
  if (override.version !== undefined) {
    merged.version = override.version;
  }
  if (override.binaryUrl !== undefined) {
    merged.binaryUrl = override.binaryUrl;
  }

  // Merge environment variables (deep merge)
  if (override.env !== undefined || base.env !== undefined) {
    merged.env = {
      ...(base.env || {}),
      ...(override.env || {}),
    };
  }

  return merged;
}

/**
 * Complete configuration validation and preparation pipeline.
 *
 * Convenience function that merges base config with user config,
 * applies defaults, and validates the result. This is the recommended
 * way to prepare configuration for use by other modules.
 *
 * Merge order: defaults → base → user (user values have highest priority)
 *
 * @param userConfig - User-provided configuration
 * @param baseConfig - Optional base configuration to merge with
 * @returns Validated and complete configuration object
 * @throws {ConfigValidationError} If the final configuration is invalid
 *
 * @example
 * ```typescript
 * const config = prepareConfig({ port: 8080 });
 * // Returns validated config with defaults applied
 *
 * const configWithBase = prepareConfig(
 *   { port: 8080 },
 *   { host: 'localhost', env: { DEBUG: 'true' } }
 * );
 * // Returns validated config merged with base (host from base, port from user)
 * ```
 */
export function prepareConfig(
  userConfig?: EmbeddedOptionsConfig,
  baseConfig?: EmbeddedOptionsConfig
): EmbeddedOptionsConfig {
  // Start with defaults
  let config = applyDefaults();

  // Merge with base config if provided
  if (baseConfig) {
    config = mergeConfig(config, baseConfig);
  }

  // Merge with user config if provided
  if (userConfig) {
    config = mergeConfig(config, userConfig);
  }

  // Remove version if binaryUrl is set (mutual exclusivity)
  if (config.binaryUrl !== undefined) {
    config.version = undefined;
  }

  // Validate the final configuration
  return validateOptions(config);
}
