/**
 * Configuration Error and Constants Tests
 *
 * Tests for:
 * - ConfigValidationError class
 * - DEFAULT_CONFIG constants
 */

import { describe, it, expect } from 'vitest';
import { ConfigValidationError, DEFAULT_CONFIG } from '../../../src/config';

describe('ConfigValidationError', () => {
  describe('error properties', () => {
    it('has correct name', () => {
      const error = new ConfigValidationError('test error');
      expect(error.name).toBe('ConfigValidationError');
    });

    it('stores field information', () => {
      const error = new ConfigValidationError('test error', 'testField');
      expect(error.field).toBe('testField');
    });

    it('is instanceof Error', () => {
      const error = new ConfigValidationError('test error');
      expect(error).toBeInstanceOf(Error);
    });

    it('works without field parameter', () => {
      const error = new ConfigValidationError('test error');
      expect(error.field).toBeUndefined();
      expect(error.message).toBe('test error');
    });
  });
});

describe('DEFAULT_CONFIG', () => {
  describe('default values', () => {
    it('has correct default host', () => {
      expect(DEFAULT_CONFIG.host).toBe('127.0.0.1');
    });

    it('has correct default port', () => {
      expect(DEFAULT_CONFIG.port).toBe(6789);
    });

    it('has correct default env', () => {
      expect(DEFAULT_CONFIG.env).toEqual({});
    });

    it('has correct default version', () => {
      expect(DEFAULT_CONFIG.version).toBe('latest');
    });

    it('has undefined binaryUrl', () => {
      expect(DEFAULT_CONFIG.binaryUrl).toBeUndefined();
    });
  });

  describe('immutability', () => {
    it('is not modified during tests', () => {
      const original = { ...DEFAULT_CONFIG };
      expect(DEFAULT_CONFIG).toEqual(original);
    });
  });
});
