/**
 * Configuration Pipeline Tests
 *
 * Tests prepareConfig() full validation pipeline:
 * - Default application
 * - Config merging
 * - Validation
 * - Error handling
 */

import { describe, it, expect } from 'vitest';
import { prepareConfig, ConfigValidationError, DEFAULT_CONFIG } from '../config';
import type { EmbeddedOptionsConfig } from '../embedded';

describe('prepareConfig - Full Pipeline', () => {
  describe('defaults and validation', () => {
    it('applies defaults and validates', () => {
      const config: EmbeddedOptionsConfig = { port: 8080 };
      const result = prepareConfig(config);
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(8080);
      expect(result.version).toBe(DEFAULT_CONFIG.version);
    });

    it('handles undefined user config', () => {
      const result = prepareConfig();
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(DEFAULT_CONFIG.port);
      expect(result.version).toBe(DEFAULT_CONFIG.version);
    });

    it('throws on invalid config after defaults', () => {
      const config: EmbeddedOptionsConfig = { port: 70000 };
      expect(() => prepareConfig(config)).toThrow(ConfigValidationError);
    });
  });

  describe('config merging', () => {
    it('merges with base config', () => {
      const userConfig: EmbeddedOptionsConfig = { port: 8080 };
      const baseConfig: EmbeddedOptionsConfig = { host: 'localhost', env: { DEBUG: 'true' } };
      const result = prepareConfig(userConfig, baseConfig);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(8080);
      expect(result.env).toEqual({ DEBUG: 'true' });
    });
  });

  describe('binaryUrl handling', () => {
    it('handles user config with binaryUrl', () => {
      const config: EmbeddedOptionsConfig = { binaryUrl: 'https://example.com/binary' };
      const result = prepareConfig(config);
      expect(result.binaryUrl).toBe('https://example.com/binary');
      expect(result.version).toBeUndefined();
    });

    it('handles version/binaryUrl conflicts by preferring binaryUrl', () => {
      const userConfig: EmbeddedOptionsConfig = { version: '1.23.7' };
      const baseConfig: EmbeddedOptionsConfig = { binaryUrl: 'https://example.com/binary' };
      const result = prepareConfig(userConfig, baseConfig);
      expect(result.binaryUrl).toBe('https://example.com/binary');
      expect(result.version).toBeUndefined();
    });
  });

  describe('complete pipeline', () => {
    it('completes full pipeline successfully', () => {
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
});
