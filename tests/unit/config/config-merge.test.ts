/**
 * Configuration Merging Tests
 *
 * Tests mergeConfig() function for:
 * - Override precedence
 * - Environment variable merging
 * - Immutability
 */

import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../../../src/config';
import type { EmbeddedOptionsConfig } from '../../../src/embedded';

describe('mergeConfig', () => {
  describe('basic merging', () => {
    it('merges two configs with override taking precedence', () => {
      const base: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789 };
      const override: EmbeddedOptionsConfig = { port: 8080 };
      const result = mergeConfig(base, override);
      expect(result.host).toBe('127.0.0.1');
      expect(result.port).toBe(8080);
    });

    it('overrides version', () => {
      const base: EmbeddedOptionsConfig = { version: '1.0.0' };
      const override: EmbeddedOptionsConfig = { version: '2.0.0' };
      const result = mergeConfig(base, override);
      expect(result.version).toBe('2.0.0');
    });

    it('overrides binaryUrl', () => {
      const base: EmbeddedOptionsConfig = { binaryUrl: 'https://old.com/binary' };
      const override: EmbeddedOptionsConfig = { binaryUrl: 'https://new.com/binary' };
      const result = mergeConfig(base, override);
      expect(result.binaryUrl).toBe('https://new.com/binary');
    });
  });

  describe('environment variable merging', () => {
    it('merges environment variables', () => {
      const base: EmbeddedOptionsConfig = { env: { DEBUG: 'true', LOG_LEVEL: 'info' } };
      const override: EmbeddedOptionsConfig = { env: { LOG_LEVEL: 'debug', NEW_VAR: 'value' } };
      const result = mergeConfig(base, override);
      expect(result.env).toEqual({
        DEBUG: 'true',
        LOG_LEVEL: 'debug',
        NEW_VAR: 'value',
      });
    });

    it('merges when only base has env', () => {
      const base: EmbeddedOptionsConfig = { env: { DEBUG: 'true' } };
      const override: EmbeddedOptionsConfig = { port: 8080 };
      const result = mergeConfig(base, override);
      expect(result.env).toEqual({ DEBUG: 'true' });
      expect(result.port).toBe(8080);
    });

    it('merges when only override has env', () => {
      const base: EmbeddedOptionsConfig = { port: 6789 };
      const override: EmbeddedOptionsConfig = { env: { DEBUG: 'true' } };
      const result = mergeConfig(base, override);
      expect(result.env).toEqual({ DEBUG: 'true' });
      expect(result.port).toBe(6789);
    });
  });

  describe('edge cases', () => {
    it('handles empty override', () => {
      const base: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789 };
      const override: EmbeddedOptionsConfig = {};
      const result = mergeConfig(base, override);
      expect(result).toEqual(base);
    });

    it('handles empty base', () => {
      const base: EmbeddedOptionsConfig = {};
      const override: EmbeddedOptionsConfig = { host: 'localhost', port: 8080 };
      const result = mergeConfig(base, override);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(8080);
    });

    it('does not override with undefined values', () => {
      const base: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789, version: '1.0.0' };
      const override: EmbeddedOptionsConfig = { port: 8080 };
      const result = mergeConfig(base, override);
      expect(result.host).toBe('127.0.0.1');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('immutability', () => {
    it('does not modify input configs', () => {
      const base: EmbeddedOptionsConfig = { host: '127.0.0.1', port: 6789 };
      const override: EmbeddedOptionsConfig = { port: 8080 };
      const baseCopy = { ...base };
      const overrideCopy = { ...override };
      mergeConfig(base, override);
      expect(base).toEqual(baseCopy);
      expect(override).toEqual(overrideCopy);
    });
  });
});
