import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectPlatform, getBinaryFilename, Platform } from './platform';

describe('Platform Detection', () => {
  // Save original values
  const originalPlatform = process.platform;
  const originalArch = process.arch;

  afterEach(() => {
    // Restore original values with proper configurable flag
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: false,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process, 'arch', {
      value: originalArch,
      writable: false,
      enumerable: true,
      configurable: true,
    });
  });

  describe('detectPlatform()', () => {
    it('should detect macOS arm64', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: false,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(process, 'arch', {
        value: 'arm64',
        writable: false,
        enumerable: true,
        configurable: true,
      });

      const platform = detectPlatform();

      expect(platform).toEqual({ os: 'darwin', arch: 'arm64' });
    });

    it('should detect macOS x64', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: false,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(process, 'arch', {
        value: 'x64',
        writable: false,
        enumerable: true,
        configurable: true,
      });

      const platform = detectPlatform();

      expect(platform).toEqual({ os: 'darwin', arch: 'x64' });
    });

    it('should detect Linux arm64', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: false,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(process, 'arch', {
        value: 'arm64',
        writable: false,
        enumerable: true,
        configurable: true,
      });

      const platform = detectPlatform();

      expect(platform).toEqual({ os: 'linux', arch: 'arm64' });
    });

    it('should detect Linux x64', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: false,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(process, 'arch', {
        value: 'x64',
        writable: false,
        enumerable: true,
        configurable: true,
      });

      const platform = detectPlatform();

      expect(platform).toEqual({ os: 'linux', arch: 'x64' });
    });

    it('should throw error on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: false,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(process, 'arch', {
        value: 'x64',
        writable: false,
        enumerable: true,
        configurable: true,
      });

      expect(() => detectPlatform()).toThrow('Weaviate Embedded is not supported on Windows');
    });

    it('should throw error on unsupported OS', () => {
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        writable: false,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(process, 'arch', {
        value: 'x64',
        writable: false,
        enumerable: true,
        configurable: true,
      });

      expect(() => detectPlatform()).toThrow(
        'Unsupported OS: freebsd. Only macOS (darwin) and Linux are supported.'
      );
    });

    it('should throw error on unsupported architecture (ia32)', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: false,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(process, 'arch', {
        value: 'ia32',
        writable: false,
        enumerable: true,
        configurable: true,
      });

      expect(() => detectPlatform()).toThrow(
        'Unsupported architecture: ia32. Only arm64 and x64 are supported.'
      );
    });

    it('should throw error on unsupported architecture (mips)', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: false,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(process, 'arch', {
        value: 'mips',
        writable: false,
        enumerable: true,
        configurable: true,
      });

      expect(() => detectPlatform()).toThrow(
        'Unsupported architecture: mips. Only arm64 and x64 are supported.'
      );
    });
  });

  describe('getBinaryFilename()', () => {
    it('should generate correct filename for macOS arm64', () => {
      const platform: Platform = { os: 'darwin', arch: 'arm64' };
      const filename = getBinaryFilename('1.23.0', platform);

      expect(filename).toBe('weaviate-1.23.0-darwin-arm64');
    });

    it('should generate correct filename for macOS x64', () => {
      const platform: Platform = { os: 'darwin', arch: 'x64' };
      const filename = getBinaryFilename('1.23.0', platform);

      expect(filename).toBe('weaviate-1.23.0-darwin-x64');
    });

    it('should generate correct filename for Linux arm64', () => {
      const platform: Platform = { os: 'linux', arch: 'arm64' };
      const filename = getBinaryFilename('1.23.0', platform);

      expect(filename).toBe('weaviate-1.23.0-linux-arm64');
    });

    it('should generate correct filename for Linux x64', () => {
      const platform: Platform = { os: 'linux', arch: 'x64' };
      const filename = getBinaryFilename('1.23.0', platform);

      expect(filename).toBe('weaviate-1.23.0-linux-x64');
    });

    it('should handle different version formats', () => {
      const platform: Platform = { os: 'linux', arch: 'x64' };

      expect(getBinaryFilename('1.0.0', platform)).toBe('weaviate-1.0.0-linux-x64');
      expect(getBinaryFilename('2.10.5', platform)).toBe('weaviate-2.10.5-linux-x64');
      expect(getBinaryFilename('latest', platform)).toBe('weaviate-latest-linux-x64');
    });
  });
});
