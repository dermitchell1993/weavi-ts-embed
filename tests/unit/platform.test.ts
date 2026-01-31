import { describe, it, expect, afterEach } from 'vitest';
import { detectPlatform, getBinaryFilename, Platform } from '../../src/platform';

/**
 * Unit tests for platform detection module
 *
 * Tests cover:
 * - Platform detection for all supported OS/architecture combinations
 * - Error handling for unsupported platforms
 * - Binary filename generation with various version formats
 * - Edge cases and boundary conditions
 *
 * Target: 100% code coverage
 */

// Test constants for maintainability and DRY principle
const SUPPORTED_OS = {
  DARWIN: 'darwin',
  LINUX: 'linux',
} as const;

const SUPPORTED_ARCH = {
  ARM64: 'arm64',
  X64: 'x64',
} as const;

const UNSUPPORTED_OS = {
  WINDOWS: 'win32',
  FREEBSD: 'freebsd',
  SUNOS: 'sunos',
} as const;

const UNSUPPORTED_ARCH = {
  IA32: 'ia32',
  MIPS: 'mips',
  S390: 's390',
} as const;

const ERROR_MESSAGES = {
  WINDOWS: 'Weaviate Embedded is not supported on Windows',
  unsupportedOs: (os: string) => `Unsupported OS: ${os}. Only macOS (darwin) and Linux are supported.`,
  unsupportedArch: (arch: string) => `Unsupported architecture: ${arch}. Only arm64 and x64 are supported.`,
} as const;

describe('Platform Detection', () => {
  // Save original process values for restoration
  const originalPlatform = process.platform;
  const originalArch = process.arch;

  /**
   * Helper function to mock process.platform and process.arch
   * Reduces code duplication and makes tests more maintainable
   */
  function mockPlatform(platform: string, arch: string): void {
    Object.defineProperty(process, 'platform', {
      value: platform,
      writable: false,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process, 'arch', {
      value: arch,
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Restore original process values after each test
   * Critical for test isolation and preventing side effects
   */
  afterEach(() => {
    mockPlatform(originalPlatform, originalArch);
  });

  describe('detectPlatform()', () => {
    describe('Supported Platforms', () => {
      describe('macOS (darwin)', () => {
        it('should detect macOS arm64 (Apple Silicon)', () => {
          mockPlatform(SUPPORTED_OS.DARWIN, SUPPORTED_ARCH.ARM64);

          const platform = detectPlatform();

          expect(platform, 'Should return darwin/arm64 platform object').toEqual({
            os: 'darwin',
            arch: 'arm64',
          });
        });

        it('should detect macOS x64 (Intel)', () => {
          mockPlatform(SUPPORTED_OS.DARWIN, SUPPORTED_ARCH.X64);

          const platform = detectPlatform();

          expect(platform, 'Should return darwin/x64 platform object').toEqual({
            os: 'darwin',
            arch: 'x64',
          });
        });
      });

      describe('Linux', () => {
        it('should detect Linux arm64 (ARM architecture)', () => {
          mockPlatform(SUPPORTED_OS.LINUX, SUPPORTED_ARCH.ARM64);

          const platform = detectPlatform();

          expect(platform, 'Should return linux/arm64 platform object').toEqual({
            os: 'linux',
            arch: 'arm64',
          });
        });

        it('should detect Linux x64 (x86_64 architecture)', () => {
          mockPlatform(SUPPORTED_OS.LINUX, SUPPORTED_ARCH.X64);

          const platform = detectPlatform();

          expect(platform, 'Should return linux/x64 platform object').toEqual({
            os: 'linux',
            arch: 'x64',
          });
        });
      });
    });

    describe('Error Cases - Unsupported Platforms', () => {
      /**
       * Windows is explicitly not supported by Weaviate Embedded
       * Should fail fast with clear error message
       */
      it('should throw specific error for Windows (not supported by Weaviate)', () => {
        mockPlatform(UNSUPPORTED_OS.WINDOWS, SUPPORTED_ARCH.X64);

        expect(() => detectPlatform(), 'Windows should be rejected with specific error message').toThrow(
          ERROR_MESSAGES.WINDOWS
        );
      });

      it('should throw error for FreeBSD (unsupported OS)', () => {
        mockPlatform(UNSUPPORTED_OS.FREEBSD, SUPPORTED_ARCH.X64);

        expect(() => detectPlatform(), 'FreeBSD should be rejected as unsupported OS').toThrow(
          ERROR_MESSAGES.unsupportedOs('freebsd')
        );
      });

      it('should throw error for SunOS (unsupported OS)', () => {
        mockPlatform(UNSUPPORTED_OS.SUNOS, SUPPORTED_ARCH.ARM64);

        expect(() => detectPlatform(), 'SunOS should be rejected as unsupported OS').toThrow(
          ERROR_MESSAGES.unsupportedOs('sunos')
        );
      });
    });

    describe('Error Cases - Unsupported Architectures', () => {
      /**
       * Test multiple unsupported architectures to ensure
       * comprehensive validation regardless of OS
       */
      it('should throw error for ia32 architecture on Linux', () => {
        mockPlatform(SUPPORTED_OS.LINUX, UNSUPPORTED_ARCH.IA32);

        expect(() => detectPlatform(), '32-bit (ia32) should be rejected on Linux').toThrow(
          ERROR_MESSAGES.unsupportedArch('ia32')
        );
      });

      it('should throw error for mips architecture on macOS', () => {
        mockPlatform(SUPPORTED_OS.DARWIN, UNSUPPORTED_ARCH.MIPS);

        expect(() => detectPlatform(), 'MIPS architecture should be rejected on macOS').toThrow(
          ERROR_MESSAGES.unsupportedArch('mips')
        );
      });

      it('should throw error for s390 architecture on Linux', () => {
        mockPlatform(SUPPORTED_OS.LINUX, UNSUPPORTED_ARCH.S390);

        expect(() => detectPlatform(), 'IBM s390 architecture should be rejected').toThrow(
          ERROR_MESSAGES.unsupportedArch('s390')
        );
      });
    });
  });

  describe('getBinaryFilename()', () => {
    describe('Standard Binary Naming', () => {
      /**
       * Verify correct filename generation for all supported platform combinations
       * Format: weaviate-{version}-{os}-{arch}
       */
      it('should generate correct filename for macOS arm64', () => {
        const platform: Platform = { os: 'darwin', arch: 'arm64' };
        const filename = getBinaryFilename('1.23.0', platform);

        expect(filename, 'Should follow naming convention: weaviate-{version}-{os}-{arch}').toBe(
          'weaviate-1.23.0-darwin-arm64'
        );
      });

      it('should generate correct filename for macOS x64', () => {
        const platform: Platform = { os: 'darwin', arch: 'x64' };
        const filename = getBinaryFilename('1.23.0', platform);

        expect(filename, 'Should correctly format darwin/x64 binary name').toBe('weaviate-1.23.0-darwin-x64');
      });

      it('should generate correct filename for Linux arm64', () => {
        const platform: Platform = { os: 'linux', arch: 'arm64' };
        const filename = getBinaryFilename('1.23.0', platform);

        expect(filename, 'Should correctly format linux/arm64 binary name').toBe(
          'weaviate-1.23.0-linux-arm64'
        );
      });

      it('should generate correct filename for Linux x64', () => {
        const platform: Platform = { os: 'linux', arch: 'x64' };
        const filename = getBinaryFilename('1.23.0', platform);

        expect(filename, 'Should correctly format linux/x64 binary name').toBe('weaviate-1.23.0-linux-x64');
      });
    });

    describe('Version Format Variations', () => {
      const platform: Platform = { os: 'linux', arch: 'x64' };

      /**
       * Test various valid version formats that might be encountered:
       * - Standard semver (X.Y.Z)
       * - "latest" special keyword
       * - Different version numbers
       */
      it('should handle single-digit version components', () => {
        const filename = getBinaryFilename('1.0.0', platform);

        expect(filename, 'Should handle version 1.0.0 correctly').toBe('weaviate-1.0.0-linux-x64');
      });

      it('should handle multi-digit version components', () => {
        const filename = getBinaryFilename('2.10.5', platform);

        expect(filename, 'Should handle version with multi-digit minor/patch').toBe(
          'weaviate-2.10.5-linux-x64'
        );
      });

      it('should handle "latest" version keyword', () => {
        const filename = getBinaryFilename('latest', platform);

        expect(filename, 'Should accept "latest" as valid version identifier').toBe(
          'weaviate-latest-linux-x64'
        );
      });

      it('should handle pre-release version identifiers', () => {
        const filename = getBinaryFilename('1.23.0-rc.1', platform);

        expect(filename, 'Should preserve pre-release identifier in filename').toBe(
          'weaviate-1.23.0-rc.1-linux-x64'
        );
      });

      it('should handle build metadata in version', () => {
        const filename = getBinaryFilename('1.23.0+20230615', platform);

        expect(filename, 'Should preserve build metadata in filename').toBe(
          'weaviate-1.23.0+20230615-linux-x64'
        );
      });
    });

    describe('Edge Cases', () => {
      const platform: Platform = { os: 'linux', arch: 'x64' };

      /**
       * Test edge cases and boundary conditions
       * Note: Current implementation does NOT validate version input
       * These tests document current behavior - validation should happen at call site
       */
      it('should handle empty version string (documents current behavior)', () => {
        const filename = getBinaryFilename('', platform);

        expect(filename, 'Empty version is currently accepted - produces weaviate--linux-x64').toBe(
          'weaviate--linux-x64'
        );
      });

      it('should handle version with spaces (documents current behavior)', () => {
        const filename = getBinaryFilename('1.0.0 latest', platform);

        expect(filename, 'Version with spaces is currently accepted').toBe('weaviate-1.0.0 latest-linux-x64');
      });

      it('should handle very long version string', () => {
        const longVersion = '1.23.0-alpha.beta.gamma.delta.epsilon.zeta.eta.theta';
        const filename = getBinaryFilename(longVersion, platform);

        expect(filename, 'Should accept long version strings without truncation').toBe(
          `weaviate-${longVersion}-linux-x64`
        );
      });

      /**
       * SECURITY NOTE: The function currently does not sanitize version input.
       * In production, version validation should occur in EmbeddedOptions.parseVersion()
       * before being passed to getBinaryFilename(). These tests document the current
       * behavior but should not be considered endorsement of passing unvalidated input.
       */
      it('should pass through path traversal characters (SECURITY: validation must happen upstream)', () => {
        const filename = getBinaryFilename('../1.0.0', platform);

        expect(filename, 'Path traversal chars are NOT sanitized - validation required upstream').toBe(
          'weaviate-../1.0.0-linux-x64'
        );
      });

      it('should handle version with special characters used in URLs', () => {
        const filename = getBinaryFilename('1.0.0?test=1', platform);

        expect(filename, 'Special URL characters are preserved in filename').toBe(
          'weaviate-1.0.0?test=1-linux-x64'
        );
      });
    });
  });
});
