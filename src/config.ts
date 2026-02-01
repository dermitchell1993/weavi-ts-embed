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
import { Logger, defaultLogger } from './types';

/**
 * Default configuration values for embedded Weaviate instance.
 * These defaults are applied when user doesn't provide specific values.
 */
export const DEFAULT_CONFIG: Required<Omit<EmbeddedOptionsConfig, 'version' | 'binaryUrl' | 'logger'>> & {
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
  /**
   * IPv6 Address Validation Pattern
   *
   * Supports both full and compressed IPv6 forms, including:
   * - Full form: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
   * - Compressed: 2001:db8:85a3::8a2e:370:7334
   * - Loopback: ::1
   * - Link-local: fe80::1%eth0
   * - IPv4-mapped: ::ffff:192.0.2.1
   *
   * Pattern breakdown (alternation groups):
   * 1. ([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}
   *    → Full form: 8 groups of hex digits (aaaa:bbbb:cccc:dddd:eeee:ffff:gggg:hhhh)
   *
   * 2. ([0-9a-fA-F]{1,4}:){1,7}:
   *    → Compressed with trailing :: (e.g., 2001:db8::)
   *
   * 3. ([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}
   *    → Compressed in middle with 1 trailing group (e.g., 2001:db8::1)
   *
   * 4-7. ([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2} ... {1,3} ... {1,4} ... {1,5}
   *    → Various compressed forms with multiple trailing groups
   *
   * 8. [0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})
   *    → Single leading group with compression (e.g., 2001::8a2e:370:7334)
   *
   * 9. :((:[0-9a-fA-F]{1,4}){1,7}|:)
   *    → Leading :: with groups (e.g., ::1, ::ffff:192.0.2.1) or :: alone
   *
   * 10. fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}
   *    → Link-local addresses with zone ID (e.g., fe80::1%eth0)
   *
   * 11. ::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|...[0-9])\.){3}...
   *    → IPv4-mapped IPv6 (e.g., ::ffff:192.0.2.1)
   *
   * 12. ([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|...[0-9])\.){3}...
   *    → IPv4-compatible IPv6 (e.g., 2001:db8::192.0.2.1)
   */
  const ipv6Pattern =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
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
 *
 * @param version - The version string to validate
 * @param logger - Optional logger for warnings (defaults to console)
 */
function validateVersion(version: string, logger: Logger = defaultLogger): void {
  if (typeof version !== 'string') {
    throw new ConfigValidationError('Version must be a string', 'version');
  }

  if (version === 'latest') {
    return;
  }

  // Check for path traversal attempts FIRST (including URL-encoded variants)
  // Defense-in-depth: decode once to catch URL-encoded path traversal attempts
  // e.g., '1.23.0%2F..%2F..%2Ftmp' would decode to '1.23.0/../../tmp'
  let decodedVersion: string;
  try {
    decodedVersion = decodeURIComponent(version);
  } catch {
    // If decoding fails, use original version (malformed encoding is suspicious)
    decodedVersion = version;
  }

  if (decodedVersion.includes('..') || decodedVersion.includes('/') || decodedVersion.includes('\\')) {
    throw new ConfigValidationError(
      'Version contains invalid characters (path traversal attempt detected)',
      'version'
    );
  }

  // Semantic version format: {major}.{minor}.{patch}[-prerelease][+build]
  // Match patterns like: 0.1.0, 1.23.7, 1.2.3, 10.20.30
  // Pre-release examples: 1.0.0-alpha, 1.0.0-beta.2, 1.0.0-rc.1
  // Build metadata examples: 1.0.0+build.1, 1.0.0+20230615
  // Combined: 1.0.0-rc.1+build.123
  // Follows semver spec which allows 0.x.x for early-stage software
  // Anchored regex ensures entire string matches (not just substring)
  //
  // Pattern: [0-9A-Za-z.-]+ strictly follows semver 2.0.0 spec section 9
  // "Identifiers MUST comprise only ASCII alphanumerics and hyphens [0-9A-Za-z-]"
  // Dots are allowed as separators between identifiers
  const versionPattern = /^(0|[1-9]\d*)\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
  if (!versionPattern.test(version)) {
    throw new ConfigValidationError(
      "Version must be 'latest' or follow semantic versioning format: " +
        '{major}.{minor}.{patch}[-prerelease][+build]',
      'version'
    );
  }

  // Warn about unusual-but-valid version patterns
  const majorVersion = version.split('.')[0];
  const hasPreRelease = version.includes('-');
  const hasBuildMetadata = version.includes('+');

  // Warn about pre-1.0 versions (development/unstable)
  if (majorVersion === '0') {
    logger.warn(
      `⚠️  Version ${version} has major version 0.x.x - this indicates initial development phase. ` +
        'Per semver spec, the public API should not be considered stable.'
    );
  }

  // Warn about build metadata without pre-release (unusual pattern)
  if (hasBuildMetadata && !hasPreRelease) {
    logger.warn(
      `ℹ️  Version ${version} includes build metadata without pre-release tag. ` +
        'This is valid but uncommon - build metadata is typically used with pre-releases.'
    );
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
 * @param logger - Optional logger for warnings (defaults to console or config.logger)
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
export function validateOptions(
  config: EmbeddedOptionsConfig,
  logger: Logger = config.logger || defaultLogger
): EmbeddedOptionsConfig {
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
    validateVersion(config.version, logger);
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
  // Extract logger from userConfig or baseConfig (userConfig takes precedence)
  const logger = userConfig?.logger || baseConfig?.logger || defaultLogger;

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

  // Validate the final configuration with the extracted logger
  return validateOptions(config, logger);
}
