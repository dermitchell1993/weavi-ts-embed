/**
 * Configuration Defaults Tests
 *
 * Tests applyDefaults() function for:
 * - Default value application
 * - User value preservation
 * - Immutability
 */

import { describe, it, expect } from 'vitest';
import { applyDefaults, DEFAULT_CONFIG } from '../../../src/config';
import type { EmbeddedOptionsConfig } from '../../../src/embedded';

describe('applyDefaults', () => {
  describe('default application', () => {
    it('returns defaults for undefined config', () => {
      const result = applyDefaults();
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(DEFAULT_CONFIG.port);
      expect(result.env).toEqual(DEFAULT_CONFIG.env);
      expect(result.version).toBe(DEFAULT_CONFIG.version);
      expect(result.binaryUrl).toBeUndefined();
    });

    it('returns defaults for empty config', () => {
      const result = applyDefaults({});
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(DEFAULT_CONFIG.port);
      expect(result.env).toEqual(DEFAULT_CONFIG.env);
      expect(result.version).toBe(DEFAULT_CONFIG.version);
    });

    it('applies all defaults for minimal config', () => {
      const result = applyDefaults({});
      expect(result).toEqual({
        host: DEFAULT_CONFIG.host,
        port: DEFAULT_CONFIG.port,
        env: DEFAULT_CONFIG.env,
        version: DEFAULT_CONFIG.version,
        binaryUrl: undefined,
      });
    });
  });

  describe('user value preservation', () => {
    it('preserves user-provided host', () => {
      const config: EmbeddedOptionsConfig = { host: 'localhost' };
      const result = applyDefaults(config);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(DEFAULT_CONFIG.port);
    });

    it('preserves user-provided port', () => {
      const config: EmbeddedOptionsConfig = { port: 8080 };
      const result = applyDefaults(config);
      expect(result.host).toBe(DEFAULT_CONFIG.host);
      expect(result.port).toBe(8080);
    });

    it('preserves user-provided version', () => {
      const config: EmbeddedOptionsConfig = { version: '1.23.7' };
      const result = applyDefaults(config);
      expect(result.version).toBe('1.23.7');
    });

    it('preserves user-provided env', () => {
      const config: EmbeddedOptionsConfig = { env: { DEBUG: 'true' } };
      const result = applyDefaults(config);
      expect(result.env).toEqual({ DEBUG: 'true' });
    });
  });

  describe('binaryUrl handling', () => {
    it('does not set version when binaryUrl is provided', () => {
      const config: EmbeddedOptionsConfig = { binaryUrl: 'https://example.com/binary' };
      const result = applyDefaults(config);
      expect(result.version).toBeUndefined();
      expect(result.binaryUrl).toBe('https://example.com/binary');
    });
  });

  describe('immutability', () => {
    it('does not modify original config object', () => {
      const config: EmbeddedOptionsConfig = { port: 8080 };
      const result = applyDefaults(config);
      expect(config).toEqual({ port: 8080 });
      expect(result).not.toBe(config);
    });
  });
});
