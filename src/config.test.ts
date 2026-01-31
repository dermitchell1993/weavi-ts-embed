import { describe, it, expect } from 'vitest';
import { validateVersion, ConfigValidationError } from './config';

describe('validateVersion', () => {
  describe('valid versions', () => {
    it('accepts "latest" keyword', () => {
      expect(() => validateVersion('latest')).not.toThrow();
    });

    it('accepts standard semver versions', () => {
      expect(() => validateVersion('1.0.0')).not.toThrow();
      expect(() => validateVersion('1.18.0')).not.toThrow();
      expect(() => validateVersion('1.23.7')).not.toThrow();
      expect(() => validateVersion('2.0.0')).not.toThrow();
      expect(() => validateVersion('10.5.3')).not.toThrow();
      expect(() => validateVersion('23.18.1')).not.toThrow();
    });

    it('accepts versions with pre-release tags', () => {
      expect(() => validateVersion('1.23.7-rc.1')).not.toThrow();
      expect(() => validateVersion('1.23.7-alpha.0')).not.toThrow();
      expect(() => validateVersion('1.23.7-beta.2')).not.toThrow();
      expect(() => validateVersion('1.18.1-alpha.0')).not.toThrow();
      expect(() => validateVersion('2.0.0-rc.1')).not.toThrow();
    });

    it('accepts versions with build metadata', () => {
      expect(() => validateVersion('1.23.7+20230615')).not.toThrow();
      expect(() => validateVersion('1.23.7+build.123')).not.toThrow();
      expect(() => validateVersion('2.0.0+exp.sha.5114f85')).not.toThrow();
    });

    it('accepts versions with both pre-release and build metadata', () => {
      expect(() => validateVersion('1.23.7-rc.1+20230615')).not.toThrow();
      expect(() => validateVersion('1.23.7-alpha.0+build.123')).not.toThrow();
      expect(() => validateVersion('2.0.0-beta.11+exp.sha.5114f85')).not.toThrow();
    });

    it('accepts major versions with multiple digits', () => {
      expect(() => validateVersion('10.0.0')).not.toThrow();
      expect(() => validateVersion('23.5.1')).not.toThrow();
      expect(() => validateVersion('100.2.3')).not.toThrow();
    });

    it('accepts minor versions with leading zeros', () => {
      expect(() => validateVersion('1.0.5')).not.toThrow();
      expect(() => validateVersion('1.10.0')).not.toThrow();
      expect(() => validateVersion('2.20.3')).not.toThrow();
    });

    it('accepts patch versions with leading zeros', () => {
      expect(() => validateVersion('1.18.0')).not.toThrow();
      expect(() => validateVersion('1.23.01')).not.toThrow();
      expect(() => validateVersion('2.5.100')).not.toThrow();
    });
  });

  describe('invalid versions', () => {
    it('rejects non-string values', () => {
      expect(() => validateVersion(123 as any)).toThrow(ConfigValidationError);
      expect(() => validateVersion(null as any)).toThrow(ConfigValidationError);
      expect(() => validateVersion(undefined as any)).toThrow(ConfigValidationError);
    });

    it('rejects versions with path traversal attempts', () => {
      expect(() => validateVersion('../../../etc/passwd')).toThrow(ConfigValidationError);
      expect(() => validateVersion('1.0.0/../tmp')).toThrow(ConfigValidationError);
      expect(() => validateVersion('1.0.0/etc/passwd')).toThrow(ConfigValidationError);
      expect(() => validateVersion('1.0.0\\windows\\system32')).toThrow(ConfigValidationError);
      expect(() => validateVersion('..')).toThrow(ConfigValidationError);
    });

    it('rejects invalid semver formats', () => {
      expect(() => validateVersion('123')).toThrow(ConfigValidationError);
      expect(() => validateVersion('1.2')).toThrow(ConfigValidationError);
      expect(() => validateVersion('1.2.3.4')).toThrow(ConfigValidationError);
      expect(() => validateVersion('a.b.c')).toThrow(ConfigValidationError);
      expect(() => validateVersion('v1.2.3')).toThrow(ConfigValidationError);
    });

    it('rejects versions with major version starting with 0', () => {
      expect(() => validateVersion('0.1.0')).toThrow(ConfigValidationError);
      expect(() => validateVersion('0.23.7')).toThrow(ConfigValidationError);
    });

    it('rejects empty strings', () => {
      expect(() => validateVersion('')).toThrow(ConfigValidationError);
    });
  });

  describe('error messages', () => {
    it('provides clear error message for path traversal', () => {
      try {
        validateVersion('../../../etc/passwd');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).message).toContain('path traversal');
      }
    });

    it('provides clear error message for invalid format', () => {
      try {
        validateVersion('123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).message).toContain('semantic versioning');
      }
    });

    it('provides field information in error', () => {
      try {
        validateVersion('invalid');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).field).toBe('version');
      }
    });
  });
});
