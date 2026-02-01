/**
 * Basic Configuration Validation Tests
 *
 * Tests validateOptions() for:
 * - Valid configuration patterns
 * - Mutual exclusivity (version/binaryUrl)
 * - Host validation (IPv4, IPv6, hostnames)
 * - Port validation (range 1-65535)
 */

import { describe, it } from 'vitest';
import type { EmbeddedOptionsConfig } from '../embedded';
import {
  expectValidConfig,
  expectInvalidConfig,
  expectConfigErrorField,
  validHosts,
  invalidHosts,
  validPorts,
  invalidPorts,
  testValidHosts,
  testInvalidHosts,
  testValidPorts,
  testInvalidPorts,
} from './config-test-helpers';

describe('validateOptions - Basic Validation', () => {
  describe('valid configurations', () => {
    it('accepts minimal valid config', () => {
      expectValidConfig({ host: '127.0.0.1', port: 6789 });
    });

    it('accepts config with version', () => {
      expectValidConfig({ version: '1.23.7' });
    });

    it('accepts config with latest version', () => {
      expectValidConfig({ version: 'latest' });
    });

    it('accepts config with binaryUrl', () => {
      expectValidConfig({
        binaryUrl: 'https://github.com/weaviate/weaviate/releases/download/v1.23.7/weaviate',
      });
    });

    it('accepts config with environment variables', () => {
      expectValidConfig({
        env: { DEBUG: 'true', LOG_LEVEL: 'info', PORT: '8080', ENABLED: true },
      });
    });

    it('accepts complete valid config', () => {
      expectValidConfig({
        host: '127.0.0.1',
        port: 8080,
        version: '1.23.7',
        env: { DEBUG: 'true' },
      });
    });

    it('accepts empty config object', () => {
      expectValidConfig({});
    });
  });

  describe('version and binaryUrl mutual exclusivity', () => {
    it('rejects config with both version and binaryUrl', () => {
      expectInvalidConfig(
        {
          version: '1.23.7',
          binaryUrl: 'https://example.com/weaviate',
        },
        "The 'version' and 'binaryUrl' fields are mutually exclusive"
      );
    });

    it('sets correct error field for mutual exclusivity', () => {
      expectConfigErrorField(
        {
          version: 'latest',
          binaryUrl: 'https://example.com/weaviate',
        },
        'version/binaryUrl'
      );
    });
  });

  describe('host validation', () => {
    describe('valid hosts', () => {
      it('accepts IPv4 addresses', () => {
        testValidHosts(validHosts.ipv4);
      });

      it('accepts IPv6 addresses', () => {
        testValidHosts(validHosts.ipv6);
      });

      it('accepts hostnames', () => {
        testValidHosts(validHosts.hostnames);
      });
    });

    describe('invalid hosts', () => {
      it('rejects non-string host', () => {
        testInvalidHosts(invalidHosts.type, "The 'host' field must be a string");
      });

      it('rejects empty host', () => {
        testInvalidHosts(invalidHosts.empty, "The 'host' field cannot be empty");
      });

      it('rejects invalid host format', () => {
        testInvalidHosts(invalidHosts.format, "The 'host' field must be a valid");
      });

      it('rejects invalid IPv4', () => {
        testInvalidHosts(invalidHosts.ipv4);
      });
    });
  });

  describe('port validation', () => {
    describe('valid ports', () => {
      it('accepts valid port range (1-65535)', () => {
        testValidPorts(validPorts);
      });
    });

    describe('invalid ports', () => {
      it('rejects non-number port', () => {
        testInvalidPorts(invalidPorts.type, "The 'port' field must be a number");
      });

      it('rejects non-integer port', () => {
        testInvalidPorts(invalidPorts.nonInteger, "The 'port' field must be an integer");
      });

      it('rejects out of range ports', () => {
        testInvalidPorts(invalidPorts.outOfRange, "The 'port' field must be between 1 and 65535");
      });
    });
  });
});
