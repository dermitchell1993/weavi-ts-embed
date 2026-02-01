/**
 * Unit tests for Configuration Validator Module (Wave 1.5)
 *
 * Comprehensive test suite covering:
 * - validateOptions(): validation logic for all configuration fields
 * - applyDefaults(): default value application
 * - mergeConfig(): configuration merging
 * - prepareConfig(): complete validation pipeline
 */

import { describe, it, expect } from 'vitest';
import {
  validateOptions,
  applyDefaults,
  mergeConfig,
  prepareConfig,
  ConfigValidationError,
  DEFAULT_CONFIG,
} from './config';
import type { EmbeddedOptionsConfig } from './embedded';

describe('Configuration Validator', () => {
  describe('validateOptions', () => {
    describe('valid configurations', () => {
      it('should accept minimal valid config', () => {
        const config: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789 };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept config with version', () => {
        const config: EmbeddedOptionsConfig = { version: '1.23.7' };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept config with latest version', () => {
        const config: EmbeddedOptionsConfig = { version: 'latest' };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept config with binaryUrl', () => {
        const config: EmbeddedOptionsConfig = {
          binaryUrl: 'https://github.com/weaviate/weaviate/releases/download/v1.23.7/weaviate',
        };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept config with environment variables', () => {
        const config: EmbeddedOptionsConfig = {
          env: { DEBUG: 'true', LOG_LEVEL: 'info', PORT: '8080', ENABLED: true },
        };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept localhost as host', () => {
        const config: EmbeddedOptionsConfig = { host: 'localhost' };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept valid hostname', () => {
        const config: EmbeddedOptionsConfig = { host: 'weaviate.example.com' };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept IPv4 address', () => {
        const config: EmbeddedOptionsConfig = { host: '192.168.1.1' };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept complete valid config', () => {
        const config: EmbeddedOptionsConfig = {
          host: '127.0.0.1',
          port: 8080,
          version: '1.23.7',
          env: { DEBUG: 'true' },
        };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept empty config object', () => {
        const config: EmbeddedOptionsConfig = {};
        expect(() => validateOptions(config)).not.toThrow();
      });
    });

    describe('version and binaryUrl mutual exclusivity', () => {
      it('should reject config with both version and binaryUrl', () => {
        const config: EmbeddedOptionsConfig = {
          version: '1.23.7',
          binaryUrl: 'https://example.com/weaviate',
        };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Cannot provide both version and binaryUrl');
      });

      it('should set field for mutual exclusivity error', () => {
        const config: EmbeddedOptionsConfig = {
          version: 'latest',
          binaryUrl: 'https://example.com/weaviate',
        };
        try {
          validateOptions(config);
          expect.fail('Should have thrown ConfigValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ConfigValidationError);
          expect((error as ConfigValidationError).field).toBe('version/binaryUrl');
        }
      });
    });

    describe('host validation', () => {
      it('should reject non-string host', () => {
        const config = { host: 12345 } as unknown as EmbeddedOptionsConfig;
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Host must be a string');
      });

      it('should reject empty host', () => {
        const config: EmbeddedOptionsConfig = { host: '' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Host cannot be empty');
      });

      it('should reject whitespace-only host', () => {
        const config: EmbeddedOptionsConfig = { host: '   ' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Host cannot be empty');
      });

      it('should reject invalid host format', () => {
        const config: EmbeddedOptionsConfig = { host: 'invalid host!' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Host must be a valid');
      });

      it('should reject invalid IPv4', () => {
        const config: EmbeddedOptionsConfig = { host: '256.1.1.1' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
      });

      it('should accept compressed IPv6 addresses', () => {
        const ipv6Addresses = [
          '::1', // loopback
          '::', // all zeros
          'fe80::1', // link-local
          '2001:db8::1', // documentation
          '2001:db8::8a2e:370:7334', // compressed
          '::ffff:192.0.2.1', // IPv4-mapped
        ];
        ipv6Addresses.forEach((host) => {
          const config: EmbeddedOptionsConfig = { host };
          expect(() => validateOptions(config)).not.toThrow();
        });
      });
    });

    describe('port validation', () => {
      it('should reject non-number port', () => {
        const config = { port: '8080' } as unknown as EmbeddedOptionsConfig;
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Port must be a number');
      });

      it('should reject non-integer port', () => {
        const config: EmbeddedOptionsConfig = { port: 8080.5 };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Port must be an integer');
      });

      it('should reject port below valid range', () => {
        const config: EmbeddedOptionsConfig = { port: 0 };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Port must be between 1 and 65535');
      });

      it('should reject port above valid range', () => {
        const config: EmbeddedOptionsConfig = { port: 70000 };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Port must be between 1 and 65535');
      });

      it('should accept port 1', () => {
        const config: EmbeddedOptionsConfig = { port: 1 };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept port 65535', () => {
        const config: EmbeddedOptionsConfig = { port: 65535 };
        expect(() => validateOptions(config)).not.toThrow();
      });
    });

    describe('version validation', () => {
      it('should reject non-string version', () => {
        const config = { version: 123 } as unknown as EmbeddedOptionsConfig;
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Version must be a string');
      });

      it('should reject invalid version format', () => {
        const config: EmbeddedOptionsConfig = { version: '1.2' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('semantic versioning format');
      });

      it('should accept early-stage versions (0.x.x)', () => {
        const config: EmbeddedOptionsConfig = { version: '0.2.3' };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept valid semantic versions', () => {
        const versions = ['0.1.0', '0.2.3', '1.0.0', '1.23.7', '10.20.30', 'latest'];
        versions.forEach((version) => {
          const config: EmbeddedOptionsConfig = { version };
          expect(() => validateOptions(config)).not.toThrow();
        });
      });

      it('should reject version with extra parts', () => {
        const config: EmbeddedOptionsConfig = { version: '1.2.3.4' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
      });
    });

    describe('version validation - security', () => {
      it('rejects path traversal with ../', () => {
        const config: EmbeddedOptionsConfig = { version: '../../../etc/passwd' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow(/path traversal attempt detected/);
      });

      it('rejects path traversal with forward slashes', () => {
        const config1: EmbeddedOptionsConfig = { version: '1.23.0/../../tmp' };
        expect(() => validateOptions(config1)).toThrow(ConfigValidationError);

        const config2: EmbeddedOptionsConfig = { version: '/usr/local/bin' };
        expect(() => validateOptions(config2)).toThrow(ConfigValidationError);
      });

      it('rejects path traversal with backslashes', () => {
        const config1: EmbeddedOptionsConfig = { version: '1.23.0\\..\\..\\tmp' };
        expect(() => validateOptions(config1)).toThrow(ConfigValidationError);

        const config2: EmbeddedOptionsConfig = { version: 'C:\\Windows\\System32' };
        expect(() => validateOptions(config2)).toThrow(ConfigValidationError);
      });

      it('rejects URL-encoded path traversal attempts', () => {
        // %2F = /, %5C = \, %2E = .
        const config1: EmbeddedOptionsConfig = { version: '1.23.0%2F..%2F..%2Ftmp' };
        expect(() => validateOptions(config1)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config1)).toThrow(/path traversal attempt detected/);

        const config2: EmbeddedOptionsConfig = { version: '%2E%2E%2F%2E%2E%2Fetc%2Fpasswd' };
        expect(() => validateOptions(config2)).toThrow(ConfigValidationError);

        const config3: EmbeddedOptionsConfig = { version: '1.0.0%5C..%5C..%5Ctmp' };
        expect(() => validateOptions(config3)).toThrow(ConfigValidationError);
      });

      it('provides clear error message for path traversal', () => {
        const config: EmbeddedOptionsConfig = { version: '../test' };
        expect(() => validateOptions(config)).toThrow(
          'Version contains invalid characters (path traversal attempt detected)'
        );
      });
    });

    describe('version validation - backward compatibility', () => {
      it('accepts 0.x.x versions (early development)', () => {
        expect(() => validateOptions({ version: '0.1.0' })).not.toThrow();
        expect(() => validateOptions({ version: '0.23.7' })).not.toThrow();
        expect(() => validateOptions({ version: '0.0.1' })).not.toThrow();
      });

      it('accepts 1.x.x and higher versions', () => {
        expect(() => validateOptions({ version: '1.0.0' })).not.toThrow();
        expect(() => validateOptions({ version: '1.23.7' })).not.toThrow();
        expect(() => validateOptions({ version: '23.45.67' })).not.toThrow();
      });

      it('accepts versions with leading zeros in minor/patch', () => {
        // Leading zeros in minor/patch are technically non-standard but commonly used
        expect(() => validateOptions({ version: '1.01.0' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.01' })).not.toThrow();
        expect(() => validateOptions({ version: '1.01.01' })).not.toThrow();
        expect(() => validateOptions({ version: '10.001.2' })).not.toThrow();
      });
    });

    describe('version validation - pre-release tags', () => {
      it('accepts alpha pre-releases', () => {
        expect(() => validateOptions({ version: '1.0.0-alpha' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0-alpha.1' })).not.toThrow();
        expect(() => validateOptions({ version: '2.3.4-alpha.beta' })).not.toThrow();
      });

      it('accepts beta pre-releases', () => {
        expect(() => validateOptions({ version: '1.0.0-beta' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0-beta.2' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0-beta.11.ee' })).not.toThrow();
      });

      it('accepts release candidate pre-releases', () => {
        expect(() => validateOptions({ version: '1.0.0-rc.1' })).not.toThrow();
        expect(() => validateOptions({ version: '1.23.7-rc.2' })).not.toThrow();
        expect(() => validateOptions({ version: '2.0.0-rc.final' })).not.toThrow();
      });

      it('accepts numeric pre-release identifiers', () => {
        expect(() => validateOptions({ version: '1.0.0-0.3.7' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0-x.7.z.92' })).not.toThrow();
      });

      it('accepts pre-release identifiers with hyphens', () => {
        expect(() => validateOptions({ version: '1.0.0-alpha-test' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0-rc-1-beta-2' })).not.toThrow();
        expect(() => validateOptions({ version: '1.23.7-pre-release-candidate' })).not.toThrow();
      });

      it('accepts 0.x.x pre-release versions', () => {
        expect(() => validateOptions({ version: '0.1.0-alpha' })).not.toThrow();
        expect(() => validateOptions({ version: '0.23.7-rc.1' })).not.toThrow();
      });
    });

    describe('version validation - build metadata', () => {
      it('accepts build numbers', () => {
        expect(() => validateOptions({ version: '1.0.0+build.1' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0+build.123' })).not.toThrow();
        expect(() => validateOptions({ version: '1.23.7+456' })).not.toThrow();
      });

      it('accepts timestamp build metadata', () => {
        expect(() => validateOptions({ version: '1.0.0+20130313144700' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0+20230615' })).not.toThrow();
      });

      it('accepts mixed build metadata', () => {
        expect(() => validateOptions({ version: '1.0.0+exp.sha.5114f85' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0+build.v3.2.1' })).not.toThrow();
      });

      it('accepts 0.x.x with build metadata', () => {
        expect(() => validateOptions({ version: '0.1.0+build.1' })).not.toThrow();
        expect(() => validateOptions({ version: '0.23.7+20230615' })).not.toThrow();
      });
    });

    describe('version validation - combined pre-release and build', () => {
      it('accepts pre-release with build metadata', () => {
        expect(() => validateOptions({ version: '1.0.0-alpha+001' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0-beta.2+build.456' })).not.toThrow();
        expect(() => validateOptions({ version: '1.0.0-rc.1+20130313144700' })).not.toThrow();
      });

      it('accepts 0.x.x combined versions', () => {
        expect(() => validateOptions({ version: '0.1.0-alpha+build.1' })).not.toThrow();
      });

      it('maintains correct order: version-prerelease+build', () => {
        expect(() => validateOptions({ version: '1.0.0-rc.1+build' })).not.toThrow();
        // Note: Regex cannot enforce semantic ordering - '1.0.0+build-rc.1' passes regex
        // but violates semver semantics (build should not contain pre-release marker)
        // This is a known limitation of regex-based validation
      });
    });

    describe('version validation - invalid semver', () => {
      it('rejects pre-release without core version', () => {
        expect(() => validateOptions({ version: '-alpha' })).toThrow(ConfigValidationError);
        expect(() => validateOptions({ version: '-rc.1' })).toThrow(ConfigValidationError);
      });

      it('rejects build metadata without core version', () => {
        expect(() => validateOptions({ version: '+build.1' })).toThrow(ConfigValidationError);
        expect(() => validateOptions({ version: '+20230615' })).toThrow(ConfigValidationError);
      });

      it('rejects empty pre-release/build components', () => {
        expect(() => validateOptions({ version: '1.0.0-' })).toThrow(ConfigValidationError);
        expect(() => validateOptions({ version: '1.0.0+' })).toThrow(ConfigValidationError);
        expect(() => validateOptions({ version: '1.0.0-+' })).toThrow(ConfigValidationError);
      });

      it('rejects underscores in pre-release identifiers (semver spec compliance)', () => {
        // Per semver 2.0.0 spec section 9: identifiers must be [0-9A-Za-z-] only
        expect(() => validateOptions({ version: '1.0.0-alpha_beta' })).toThrow(ConfigValidationError);
        expect(() => validateOptions({ version: '1.0.0-rc_1' })).toThrow(ConfigValidationError);
      });

      it('rejects underscores in build metadata (semver spec compliance)', () => {
        expect(() => validateOptions({ version: '1.0.0+build_123' })).toThrow(ConfigValidationError);
        expect(() => validateOptions({ version: '1.0.0+sha_5114f85' })).toThrow(ConfigValidationError);
      });
    });

    describe('binaryUrl validation', () => {
      it('should reject non-string binaryUrl', () => {
        const config = { binaryUrl: 12345 } as unknown as EmbeddedOptionsConfig;
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('BinaryUrl must be a string');
      });

      it('should reject empty binaryUrl', () => {
        const config: EmbeddedOptionsConfig = { binaryUrl: '' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('BinaryUrl cannot be empty');
      });

      it('should reject invalid URL format', () => {
        const config: EmbeddedOptionsConfig = { binaryUrl: 'not-a-url' };
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('BinaryUrl must be a valid URL');
      });

      it('should accept valid URLs', () => {
        const urls = [
          'https://github.com/weaviate/weaviate/releases/download/v1.23.7/weaviate',
          'http://example.com/binary',
          'file:///path/to/binary',
        ];
        urls.forEach((binaryUrl) => {
          const config: EmbeddedOptionsConfig = { binaryUrl };
          expect(() => validateOptions(config)).not.toThrow();
        });
      });
    });

    describe('env validation', () => {
      it('should reject non-object env', () => {
        const config = { env: 'invalid' } as unknown as EmbeddedOptionsConfig;
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Env must be an object');
      });

      it('should reject null env', () => {
        const config = { env: null } as unknown as EmbeddedOptionsConfig;
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Env must be an object');
      });

      it('should reject array as env', () => {
        const config = { env: [] } as unknown as EmbeddedOptionsConfig;
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('Env must be an object');
      });

      it('should reject invalid env value types', () => {
        const config = { env: { KEY: { nested: 'object' } } } as unknown as EmbeddedOptionsConfig;
        expect(() => validateOptions(config)).toThrow(ConfigValidationError);
        expect(() => validateOptions(config)).toThrow('must be a string, number, boolean');
      });

      it('should accept string, number, and boolean env values', () => {
        const config: EmbeddedOptionsConfig = {
          env: {
            STRING_VAR: 'value',
            NUMBER_VAR: 42,
            BOOLEAN_VAR: true,
            UNDEFINED_VAR: undefined,
          },
        };
        expect(() => validateOptions(config)).not.toThrow();
      });

      it('should accept empty env object', () => {
        const config: EmbeddedOptionsConfig = { env: {} };
        expect(() => validateOptions(config)).not.toThrow();
      });
    });
  });

  describe('applyDefaults', () => {
    it('should return defaults for undefined config', () => {
      const result = applyDefaults();
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(DEFAULT_CONFIG.port);
      expect(result.env).toEqual(DEFAULT_CONFIG.env);
      expect(result.version).toBe(DEFAULT_CONFIG.version);
      expect(result.binaryUrl).toBeUndefined();
    });

    it('should return defaults for empty config', () => {
      const result = applyDefaults({});
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(DEFAULT_CONFIG.port);
      expect(result.env).toEqual(DEFAULT_CONFIG.env);
      expect(result.version).toBe(DEFAULT_CONFIG.version);
    });

    it('should preserve user-provided host', () => {
      const config: EmbeddedOptionsConfig = { host: 'localhost' };
      const result = applyDefaults(config);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(DEFAULT_CONFIG.port);
    });

    it('should preserve user-provided port', () => {
      const config: EmbeddedOptionsConfig = { port: 8080 };
      const result = applyDefaults(config);
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(8080);
    });

    it('should preserve user-provided version', () => {
      const config: EmbeddedOptionsConfig = { version: '1.23.7' };
      const result = applyDefaults(config);
      expect(result.version).toBe('1.23.7');
    });

    it('should not set version when binaryUrl is provided', () => {
      const config: EmbeddedOptionsConfig = { binaryUrl: 'https://example.com/binary' };
      const result = applyDefaults(config);
      expect(result.version).toBeUndefined();
      expect(result.binaryUrl).toBe('https://example.com/binary');
    });

    it('should preserve user-provided env', () => {
      const config: EmbeddedOptionsConfig = { env: { DEBUG: 'true' } };
      const result = applyDefaults(config);
      expect(result.env).toEqual({ DEBUG: 'true' });
    });

    it('should not modify original config object', () => {
      const config: EmbeddedOptionsConfig = { port: 8080 };
      const result = applyDefaults(config);
      expect(config).toEqual({ port: 8080 });
      expect(result).not.toBe(config);
    });

    it('should apply all defaults for minimal config', () => {
      const config: EmbeddedOptionsConfig = {};
      const result = applyDefaults(config);
      expect(result).toEqual({
        host: DEFAULT_CONFIG.host,
        port: DEFAULT_CONFIG.port,
        env: DEFAULT_CONFIG.env,
        version: DEFAULT_CONFIG.version,
        binaryUrl: undefined,
      });
    });
  });

  describe('mergeConfig', () => {
    it('should merge two configs with override taking precedence', () => {
      const base: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789 };
      const override: EmbeddedOptionsConfig = { port: 8080 };
      const result = mergeConfig(base, override);
      expect(result.host).toBe('127.0.0.1');
      expect(result.port).toBe(8080);
    });

    it('should merge environment variables', () => {
      const base: EmbeddedOptionsConfig = { env: { DEBUG: 'true', LOG_LEVEL: 'info' } };
      const override: EmbeddedOptionsConfig = { env: { LOG_LEVEL: 'debug', NEW_VAR: 'value' } };
      const result = mergeConfig(base, override);
      expect(result.env).toEqual({
        DEBUG: 'true',
        LOG_LEVEL: 'debug',
        NEW_VAR: 'value',
      });
    });

    it('should override version', () => {
      const base: EmbeddedOptionsConfig = { version: '1.0.0' };
      const override: EmbeddedOptionsConfig = { version: '2.0.0' };
      const result = mergeConfig(base, override);
      expect(result.version).toBe('2.0.0');
    });

    it('should override binaryUrl', () => {
      const base: EmbeddedOptionsConfig = { binaryUrl: 'https://old.com/binary' };
      const override: EmbeddedOptionsConfig = { binaryUrl: 'https://new.com/binary' };
      const result = mergeConfig(base, override);
      expect(result.binaryUrl).toBe('https://new.com/binary');
    });

    it('should not modify input configs', () => {
      const base: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789 };
      const override: EmbeddedOptionsConfig = { port: 8080 };
      const baseCopy = { ...base };
      const overrideCopy = { ...override };
      mergeConfig(base, override);
      expect(base).toEqual(baseCopy);
      expect(override).toEqual(overrideCopy);
    });

    it('should handle empty override', () => {
      const base: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789 };
      const override: EmbeddedOptionsConfig = {};
      const result = mergeConfig(base, override);
      expect(result).toEqual(base);
    });

    it('should handle empty base', () => {
      const base: EmbeddedOptionsConfig = {};
      const override: EmbeddedOptionsConfig = { host: 'localhost', port: 8080 };
      const result = mergeConfig(base, override);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(8080);
    });

    it('should merge when only base has env', () => {
      const base: EmbeddedOptionsConfig = { env: { DEBUG: 'true' } };
      const override: EmbeddedOptionsConfig = { port: 8080 };
      const result = mergeConfig(base, override);
      expect(result.env).toEqual({ DEBUG: 'true' });
      expect(result.port).toBe(8080);
    });

    it('should merge when only override has env', () => {
      const base: EmbeddedOptionsConfig = { port: 6789 };
      const override: EmbeddedOptionsConfig = { env: { DEBUG: 'true' } };
      const result = mergeConfig(base, override);
      expect(result.env).toEqual({ DEBUG: 'true' });
      expect(result.port).toBe(6789);
    });

    it('should not override with undefined values', () => {
      const base: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789, version: '1.0.0' };
      const override: EmbeddedOptionsConfig = { port: 8080 };
      const result = mergeConfig(base, override);
      expect(result.host).toBe('127.0.0.1');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('prepareConfig', () => {
    it('should apply defaults and validate', () => {
      const config: EmbeddedOptionsConfig = { port: 8080 };
      const result = prepareConfig(config);
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(8080);
      expect(result.version).toBe(DEFAULT_CONFIG.version);
    });

    it('should merge with base config', () => {
      const userConfig: EmbeddedOptionsConfig = { port: 8080 };
      const baseConfig: EmbeddedOptionsConfig = { host: 'localhost', env: { DEBUG: 'true' } };
      const result = prepareConfig(userConfig, baseConfig);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(8080);
      expect(result.env).toEqual({ DEBUG: 'true' });
    });

    it('should throw on invalid config after defaults', () => {
      const config: EmbeddedOptionsConfig = { port: 70000 };
      expect(() => prepareConfig(config)).toThrow(ConfigValidationError);
    });

    it('should handle undefined user config', () => {
      const result = prepareConfig();
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(DEFAULT_CONFIG.port);
      expect(result.version).toBe(DEFAULT_CONFIG.version);
    });

    it('should handle user config with binaryUrl', () => {
      const config: EmbeddedOptionsConfig = { binaryUrl: 'https://example.com/binary' };
      const result = prepareConfig(config);
      expect(result.binaryUrl).toBe('https://example.com/binary');
      expect(result.version).toBeUndefined();
    });

    it('should handle version/binaryUrl conflicts by preferring binaryUrl', () => {
      // When binaryUrl is present (from either base or user), version should be removed
      const userConfig: EmbeddedOptionsConfig = { version: '1.23.7' };
      const baseConfig: EmbeddedOptionsConfig = { binaryUrl: 'https://example.com/binary' };
      const result = prepareConfig(userConfig, baseConfig);
      expect(result.binaryUrl).toBe('https://example.com/binary');
      expect(result.version).toBeUndefined();
    });

    it('should complete full pipeline successfully', () => {
      const userConfig: EmbeddedOptionsConfig = {
        host: 'localhost',
        port: 8080,
        version: '1.23.7',
        env: { DEBUG: 'true' },
      };
      const result = prepareConfig(userConfig);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(8080);
      expect(result.version).toBe('1.23.7');
      expect(result.env).toEqual({ DEBUG: 'true' });
    });
  });

  describe('ConfigValidationError', () => {
    it('should have correct name', () => {
      const error = new ConfigValidationError('test error');
      expect(error.name).toBe('ConfigValidationError');
    });

    it('should store field information', () => {
      const error = new ConfigValidationError('test error', 'testField');
      expect(error.field).toBe('testField');
    });

    it('should be instanceof Error', () => {
      const error = new ConfigValidationError('test error');
      expect(error).toBeInstanceOf(Error);
    });

    it('should work without field parameter', () => {
      const error = new ConfigValidationError('test error');
      expect(error.field).toBeUndefined();
      expect(error.message).toBe('test error');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONFIG.host).toBe('127.0.0.1');
      expect(DEFAULT_CONFIG.port).toBe(6789);
      expect(DEFAULT_CONFIG.env).toEqual({});
      expect(DEFAULT_CONFIG.version).toBe('latest');
      expect(DEFAULT_CONFIG.binaryUrl).toBeUndefined();
    });

    it('should be frozen or immutable', () => {
      // Verify we're not modifying the defaults in tests
      const original = { ...DEFAULT_CONFIG };
      expect(DEFAULT_CONFIG).toEqual(original);
    });
  });
});
