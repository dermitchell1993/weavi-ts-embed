/**
 * Field-Specific Validation Tests
 *
 * Tests validateOptions() for:
 * - BinaryUrl validation (URL format)
 * - Environment variable validation
 */

import { describe, it } from 'vitest';
import type { EmbeddedOptionsConfig } from '../embedded';
import { expectValidConfig, expectInvalidConfig } from './config-test-helpers';

describe('validateOptions - Field-Specific Validation', () => {
  describe('binaryUrl validation', () => {
    it('accepts valid HTTPS URLs', () => {
      expectValidConfig({
        binaryUrl: 'https://github.com/weaviate/weaviate/releases/download/v1.23.7/weaviate',
      });
      expectValidConfig({
        binaryUrl: 'https://example.com/path/to/weaviate-binary',
      });
    });

    it('accepts valid HTTP URLs', () => {
      expectValidConfig({
        binaryUrl: 'http://localhost:8000/weaviate',
      });
    });

    it('accepts file:// URLs', () => {
      expectValidConfig({
        binaryUrl: 'file:///path/to/local/weaviate',
      });
    });

    it('rejects non-string binaryUrl', () => {
      expectInvalidConfig(
        { binaryUrl: 12345 } as unknown as EmbeddedOptionsConfig,
        "The 'binaryUrl' field must be a string"
      );
    });

    it('rejects empty binaryUrl', () => {
      expectInvalidConfig({ binaryUrl: '' }, "The 'binaryUrl' field cannot be empty");
    });

    it('rejects invalid URL format', () => {
      expectInvalidConfig({ binaryUrl: 'not-a-valid-url' }, "The 'binaryUrl' field must be a valid URL");
    });

    it('rejects URLs without protocol', () => {
      expectInvalidConfig({ binaryUrl: 'example.com/weaviate' }, "The 'binaryUrl' field must be a valid URL");
    });
  });

  describe('env validation', () => {
    it('accepts valid env object with string values', () => {
      expectValidConfig({
        env: {
          DEBUG: 'true',
          LOG_LEVEL: 'info',
          PORT: '8080',
        },
      });
    });

    it('accepts env with boolean values', () => {
      expectValidConfig({
        env: {
          ENABLED: true,
          DISABLED: false,
        },
      });
    });

    it('accepts env with number values', () => {
      expectValidConfig({
        env: {
          TIMEOUT: 5000,
          MAX_RETRIES: 3,
        },
      });
    });

    it('accepts env with mixed value types', () => {
      expectValidConfig({
        env: {
          DEBUG: 'true',
          ENABLED: true,
          PORT: 8080,
          TIMEOUT: 5000,
        },
      });
    });

    it('accepts empty env object', () => {
      expectValidConfig({ env: {} });
    });

    it('rejects non-object env', () => {
      expectInvalidConfig(
        { env: 'not-an-object' } as unknown as EmbeddedOptionsConfig,
        "The 'env' field must be an object"
      );
    });

    it('rejects null env', () => {
      expectInvalidConfig(
        { env: null } as unknown as EmbeddedOptionsConfig,
        "The 'env' field must be an object"
      );
    });

    it('rejects array env', () => {
      expectInvalidConfig(
        { env: [] } as unknown as EmbeddedOptionsConfig,
        "The 'env' field must be an object"
      );
    });

    it('accepts env with complex key names', () => {
      expectValidConfig({
        env: {
          SOME_VAR_NAME: 'value',
          VAR_WITH_123: 'value',
          'VAR-WITH-DASHES': 'value',
        },
      });
    });
  });
});
