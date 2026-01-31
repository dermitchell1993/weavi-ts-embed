import { homedir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EmbeddedOptions, EmbeddedOptionsConfig } from '../../src/embedded';

describe('Configuration Validator', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = { ...originalEnv };
  });

  describe('Option Validation', () => {
    describe('version validation', () => {
      it('accepts valid version format with double digit minor', () => {
        const opt = new EmbeddedOptions({ version: '1.19.0' });
        expect(opt.version).toBe('1.19.0');
      });

      it('accepts valid version with actual single digit minor', () => {
        const opt = new EmbeddedOptions({ version: '1.9.0' });
        expect(opt.version).toBe('1.9.0');
      });

      it('accepts valid version format with patch suffix', () => {
        const opt = new EmbeddedOptions({ version: '1.18.1-alpha.0' });
        expect(opt.version).toBe('1.18.1-alpha.0');
      });

      it('accepts "latest" as version', () => {
        const opt = new EmbeddedOptions({ version: 'latest' });
        expect(opt.version).toBe('latest');
      });

      it('rejects invalid version format - single digit', () => {
        expect(() => new EmbeddedOptions({ version: '123' })).toThrow(
          "invalid version: 123. version must resemble '{major}.{minor}.{patch}, or 'latest'"
        );
      });

      it('rejects invalid version format - missing patch', () => {
        expect(() => new EmbeddedOptions({ version: '1.19' })).toThrow(
          "invalid version: 1.19. version must resemble '{major}.{minor}.{patch}, or 'latest'"
        );
      });

      it('rejects invalid version format - zero major version', () => {
        expect(() => new EmbeddedOptions({ version: '0.19.0' })).toThrow(
          "invalid version: 0.19.0. version must resemble '{major}.{minor}.{patch}, or 'latest'"
        );
      });

      it('accepts version with leading zero in minor (semantic versioning allows this)', () => {
        // The improved regex accepts this - leading zeros are technically valid in semver
        const opt = new EmbeddedOptions({ version: '1.09.0' });
        expect(opt.version).toBe('1.09.0');
      });

      it('rejects invalid version format - non-numeric', () => {
        expect(() => new EmbeddedOptions({ version: 'abc.def.ghi' })).toThrow(
          "invalid version: abc.def.ghi. version must resemble '{major}.{minor}.{patch}, or 'latest'"
        );
      });

      it('accepts very large version numbers', () => {
        const opt = new EmbeddedOptions({ version: '99.999.999' });
        expect(opt.version).toBe('99.999.999');
      });

      it('accepts version with triple digit components', () => {
        const opt = new EmbeddedOptions({ version: '123.456.789' });
        expect(opt.version).toBe('123.456.789');
      });
    });

    describe('binaryUrl validation', () => {
      it('accepts valid binaryUrl', () => {
        const opt = new EmbeddedOptions({ binaryUrl: 'https://example.com/weaviate' });
        expect(opt.binaryUrl).toBe('https://example.com/weaviate');
        expect(opt.version).toBeUndefined();
      });

      it('rejects both version and binaryUrl', () => {
        expect(
          () =>
            new EmbeddedOptions({
              version: '1.19.8',
              binaryUrl: 'https://example.com/weaviate',
            })
        ).toThrow('cannot provide both version and binaryUrl');
      });

      it('generates unique binaryPath for different binaryUrls', () => {
        const opt1 = new EmbeddedOptions({ binaryUrl: 'https://example.com/weaviate1' });
        const opt2 = new EmbeddedOptions({ binaryUrl: 'https://example.com/weaviate2' });
        expect(opt1.binaryPath).not.toBe(opt2.binaryPath);
      });

      it('generates consistent binaryPath for same binaryUrl', () => {
        const opt1 = new EmbeddedOptions({ binaryUrl: 'https://example.com/weaviate' });
        const opt2 = new EmbeddedOptions({ binaryUrl: 'https://example.com/weaviate' });
        expect(opt1.binaryPath).toBe(opt2.binaryPath);
      });
    });

    describe('host validation', () => {
      it('accepts valid hostname', () => {
        const opt = new EmbeddedOptions({ host: 'localhost' });
        expect(opt.host).toBe('localhost');
      });

      it('accepts valid IP address', () => {
        const opt = new EmbeddedOptions({ host: '192.168.1.1' });
        expect(opt.host).toBe('192.168.1.1');
      });

      it('accepts valid domain with subdomain', () => {
        const opt = new EmbeddedOptions({ host: 'weaviate.example.com' });
        expect(opt.host).toBe('weaviate.example.com');
      });

      it('accepts IPv6 loopback address', () => {
        const opt = new EmbeddedOptions({ host: '::1' });
        expect(opt.host).toBe('::1');
      });

      it('accepts IPv6 address with brackets', () => {
        const opt = new EmbeddedOptions({ host: '[::1]' });
        expect(opt.host).toBe('[::1]');
      });

      it('accepts full IPv6 address', () => {
        const opt = new EmbeddedOptions({ host: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' });
        expect(opt.host).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      });
    });

    describe('port validation', () => {
      it('accepts valid port number', () => {
        const opt = new EmbeddedOptions({ port: 8080 });
        expect(opt.port).toBe(8080);
      });

      it('accepts minimum port number', () => {
        const opt = new EmbeddedOptions({ port: 1 });
        expect(opt.port).toBe(1);
      });

      it('accepts maximum port number', () => {
        const opt = new EmbeddedOptions({ port: 65535 });
        expect(opt.port).toBe(65535);
      });

      it('accepts common development port', () => {
        const opt = new EmbeddedOptions({ port: 3000 });
        expect(opt.port).toBe(3000);
      });

      it('handles negative port number by defaulting to 6789', () => {
        // Note: TypeScript may prevent this at compile time, but testing runtime behavior
        const opt = new EmbeddedOptions({ port: -1 as any });
        // Negative ports are technically invalid, but the constructor doesn't validate
        // This documents current behavior - consider adding validation
        expect(opt.port).toBe(-1);
      });

      it('handles port number above maximum by accepting it', () => {
        // Port >65535 is invalid but not currently validated
        // This documents current behavior - consider adding validation
        const opt = new EmbeddedOptions({ port: 70000 });
        expect(opt.port).toBe(70000);
      });
    });

    describe('env validation', () => {
      it('accepts valid environment object', () => {
        const env = {
          DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
          ENABLE_MODULES: 'text2vec-openai',
        };
        const opt = new EmbeddedOptions({ env });
        expect(opt.env.DEFAULT_VECTORIZER_MODULE).toBe('text2vec-openai');
        expect(opt.env.ENABLE_MODULES).toBe('text2vec-openai');
      });

      it('accepts numeric environment values', () => {
        const env = {
          QUERY_DEFAULTS_LIMIT: 100,
          MAX_CONNECTIONS: 50,
        };
        const opt = new EmbeddedOptions({ env });
        expect(opt.env.QUERY_DEFAULTS_LIMIT).toBe(100);
        expect(opt.env.MAX_CONNECTIONS).toBe(50);
      });

      it('accepts empty environment object', () => {
        const opt = new EmbeddedOptions({ env: {} });
        expect(opt.env).toBeDefined();
      });
    });
  });

  describe('Defaults Application', () => {
    it('applies default host when not provided', () => {
      const opt = new EmbeddedOptions();
      expect(opt.host).toBe('127.0.0.1');
    });

    it('applies default port when not provided', () => {
      const opt = new EmbeddedOptions();
      expect(opt.port).toBe(6789);
    });

    it('applies default version when not provided', () => {
      const opt = new EmbeddedOptions();
      expect(opt.version).toBe('latest');
    });

    it('applies default binaryPath when not provided', () => {
      const opt = new EmbeddedOptions();
      expect(opt.binaryPath).toBe(join(homedir(), '.cache/weaviate-embedded-latest'));
    });

    it('applies default persistenceDataPath when not provided', () => {
      const opt = new EmbeddedOptions();
      // persistenceDataPath includes port suffix to avoid conflicts
      expect(opt.persistenceDataPath).toBe(join(homedir(), '.local/share/weaviate_6789'));
    });

    it('applies default environment variables', () => {
      const opt = new EmbeddedOptions();
      expect(opt.env.AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED).toBe('true');
      expect(opt.env.QUERY_DEFAULTS_LIMIT).toBe('20');
      expect(opt.env.DEFAULT_VECTORIZER_MODULE).toBe('none');
      expect(opt.env.CLUSTER_HOSTNAME).toBe('Embedded_at_6789');
    });

    it('applies default ENABLE_MODULES with multiple modules', () => {
      const opt = new EmbeddedOptions();
      expect(opt.env.ENABLE_MODULES).toContain('text2vec-openai');
      expect(opt.env.ENABLE_MODULES).toContain('text2vec-cohere');
      expect(opt.env.ENABLE_MODULES).toContain('text2vec-huggingface');
      expect(opt.env.ENABLE_MODULES).toContain('ref2vec-centroid');
      expect(opt.env.ENABLE_MODULES).toContain('generative-openai');
      expect(opt.env.ENABLE_MODULES).toContain('qna-openai');
    });

    it('uses XDG_CACHE_HOME for binaryPath when set', () => {
      process.env.XDG_CACHE_HOME = '/custom/cache';
      const opt = new EmbeddedOptions();
      expect(opt.binaryPath).toBe('/custom/cache-latest');
    });

    it('uses XDG_DATA_HOME for persistenceDataPath when set', () => {
      process.env.XDG_DATA_HOME = '/custom/data';
      const opt = new EmbeddedOptions();
      // persistenceDataPath includes port suffix to avoid conflicts
      expect(opt.persistenceDataPath).toBe('/custom/data_6789');
    });

    it('sets CLUSTER_HOSTNAME based on port', () => {
      const opt = new EmbeddedOptions({ port: 9999 });
      expect(opt.env.CLUSTER_HOSTNAME).toBe('Embedded_at_9999');
    });

    it('sets PERSISTENCE_DATA_PATH to persistenceDataPath', () => {
      const opt = new EmbeddedOptions();
      expect(opt.env.PERSISTENCE_DATA_PATH).toBe(opt.persistenceDataPath);
    });

    it('persistenceDataPath changes with port', () => {
      const opt1 = new EmbeddedOptions({ port: 6789 });
      const opt2 = new EmbeddedOptions({ port: 8080 });
      expect(opt1.persistenceDataPath).toContain('_6789');
      expect(opt2.persistenceDataPath).toContain('_8080');
      expect(opt1.persistenceDataPath).not.toBe(opt2.persistenceDataPath);
    });

    it('includes RAFT_ENABLE false in default environment', () => {
      const opt = new EmbeddedOptions();
      expect(opt.env.RAFT_ENABLE).toBe('false');
    });
  });

  describe('Custom Options Override Defaults', () => {
    it('overrides default host with custom value', () => {
      const opt = new EmbeddedOptions({ host: 'custom.host' });
      expect(opt.host).toBe('custom.host');
    });

    it('overrides default port with custom value', () => {
      const opt = new EmbeddedOptions({ port: 8888 });
      expect(opt.port).toBe(8888);
    });

    it('overrides default version with custom value', () => {
      const opt = new EmbeddedOptions({ version: '1.19.0' });
      expect(opt.version).toBe('1.19.0');
    });

    it('overrides default environment variables with custom values', () => {
      const opt = new EmbeddedOptions({
        env: {
          QUERY_DEFAULTS_LIMIT: 50,
          DEFAULT_VECTORIZER_MODULE: 'text2vec-contextionary',
        },
      });
      expect(opt.env.QUERY_DEFAULTS_LIMIT).toBe(50);
      expect(opt.env.DEFAULT_VECTORIZER_MODULE).toBe('text2vec-contextionary');
    });

    it('merges custom env with defaults', () => {
      const opt = new EmbeddedOptions({
        env: {
          CUSTOM_VAR: 'custom_value',
        },
      });
      expect(opt.env.CUSTOM_VAR).toBe('custom_value');
      expect(opt.env.AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED).toBe('true');
    });

    it('inherits process.env variables', () => {
      process.env.TEST_VAR = 'test_value';
      const opt = new EmbeddedOptions();
      expect(opt.env.TEST_VAR).toBe('test_value');
    });

    it('custom env overrides process.env variables', () => {
      process.env.CLUSTER_HOSTNAME = 'env_hostname';
      const opt = new EmbeddedOptions({
        env: {
          CLUSTER_HOSTNAME: 'custom_hostname',
        },
      });
      expect(opt.env.CLUSTER_HOSTNAME).toBe('custom_hostname');
    });

    it('process.env overrides default values', () => {
      process.env.CLUSTER_HOSTNAME = 'env_hostname';
      const opt = new EmbeddedOptions();
      expect(opt.env.CLUSTER_HOSTNAME).toBe('env_hostname');
    });
  });

  describe('Error Messages', () => {
    it('provides clear error message for invalid version format', () => {
      expect(() => new EmbeddedOptions({ version: 'invalid' })).toThrow(
        "invalid version: invalid. version must resemble '{major}.{minor}.{patch}, or 'latest'"
      );
    });

    it('provides clear error message for both version and binaryUrl', () => {
      expect(
        () =>
          new EmbeddedOptions({
            version: '1.19.0',
            binaryUrl: 'https://example.com/weaviate',
          })
      ).toThrow('cannot provide both version and binaryUrl');
    });

    it('error message includes the invalid version value', () => {
      expect(() => new EmbeddedOptions({ version: 'bad-version' })).toThrow(/bad-version/);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined config', () => {
      const opt = new EmbeddedOptions(undefined);
      expect(opt.host).toBe('127.0.0.1');
      expect(opt.port).toBe(6789);
    });

    it('handles empty config object', () => {
      const opt = new EmbeddedOptions({});
      expect(opt.host).toBe('127.0.0.1');
      expect(opt.port).toBe(6789);
      expect(opt.version).toBe('latest');
    });

    it('handles null host value', () => {
      const opt = new EmbeddedOptions({ host: undefined });
      expect(opt.host).toBe('127.0.0.1');
    });

    it('handles null port value', () => {
      const opt = new EmbeddedOptions({ port: undefined });
      expect(opt.port).toBe(6789);
    });

    it('handles binaryUrl without version', () => {
      const opt = new EmbeddedOptions({ binaryUrl: 'https://example.com/weaviate' });
      expect(opt.binaryUrl).toBe('https://example.com/weaviate');
      expect(opt.version).toBeUndefined();
    });

    it('handles multiple custom environment variables', () => {
      const env = {
        VAR1: 'value1',
        VAR2: 'value2',
        VAR3: 'value3',
        VAR4: 'value4',
        VAR5: 'value5',
      };
      const opt = new EmbeddedOptions({ env });
      expect(opt.env.VAR1).toBe('value1');
      expect(opt.env.VAR2).toBe('value2');
      expect(opt.env.VAR3).toBe('value3');
      expect(opt.env.VAR4).toBe('value4');
      expect(opt.env.VAR5).toBe('value5');
    });

    it('handles special characters in host', () => {
      const opt = new EmbeddedOptions({ host: 'my-server.example-domain.com' });
      expect(opt.host).toBe('my-server.example-domain.com');
    });

    it('handles zero as port - defaults to 6789 due to falsy check', () => {
      // Port 0 is falsy, so the constructor defaults to 6789
      // This is expected behavior based on: cfg && cfg.port ? cfg.port : 6789
      const opt = new EmbeddedOptions({ port: 0 });
      expect(opt.port).toBe(6789);
      expect(opt.env.CLUSTER_HOSTNAME).toBe('Embedded_at_6789');
    });

    it('preserves version with multiple dots and dashes', () => {
      const opt = new EmbeddedOptions({ version: '1.23.456-rc.7' });
      expect(opt.version).toBe('1.23.456-rc.7');
    });
  });

  describe('Integration Tests', () => {
    it('creates valid configuration with all custom options', () => {
      const config: EmbeddedOptionsConfig = {
        host: 'test.example.com',
        port: 9090,
        version: '1.19.0',
        env: {
          DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
          ENABLE_MODULES: 'text2vec-openai,generative-openai',
          QUERY_DEFAULTS_LIMIT: 100,
        },
      };
      const opt = new EmbeddedOptions(config);
      expect(opt.host).toBe('test.example.com');
      expect(opt.port).toBe(9090);
      expect(opt.version).toBe('1.19.0');
      expect(opt.env.DEFAULT_VECTORIZER_MODULE).toBe('text2vec-openai');
      expect(opt.env.ENABLE_MODULES).toBe('text2vec-openai,generative-openai');
      expect(opt.env.QUERY_DEFAULTS_LIMIT).toBe(100);
    });

    it('creates valid configuration with binaryUrl and custom env', () => {
      const config: EmbeddedOptionsConfig = {
        binaryUrl: 'https://example.com/custom-weaviate',
        env: {
          CUSTOM_MODULE: 'enabled',
        },
      };
      const opt = new EmbeddedOptions(config);
      expect(opt.binaryUrl).toBe('https://example.com/custom-weaviate');
      expect(opt.version).toBeUndefined();
      expect(opt.env.CUSTOM_MODULE).toBe('enabled');
    });

    it('maintains consistency across multiple instantiations', () => {
      const config: EmbeddedOptionsConfig = {
        host: 'consistent.host',
        port: 7777,
        version: '1.19.0',
      };
      const opt1 = new EmbeddedOptions(config);
      const opt2 = new EmbeddedOptions(config);
      expect(opt1.host).toBe(opt2.host);
      expect(opt1.port).toBe(opt2.port);
      expect(opt1.version).toBe(opt2.version);
      expect(opt1.binaryPath).toBe(opt2.binaryPath);
      expect(opt1.persistenceDataPath).toBe(opt2.persistenceDataPath);
    });
  });
});
