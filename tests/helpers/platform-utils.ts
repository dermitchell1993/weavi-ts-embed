/**
 * Platform Test Utilities
 *
 * Reusable utilities for mocking and testing platform-specific functionality.
 * Zero redundancy - single source of truth for all platform mocking.
 */

import type { Platform } from '../../src/platform';

export class PlatformMocker {
  private static originalPlatform = process.platform;
  private static originalArch = process.arch;

  /**
   * Mock process.platform and process.arch
   */
  static mock(platform: Platform) {
    Object.defineProperty(process, 'platform', {
      value: platform.os,
      writable: false,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process, 'arch', {
      value: platform.arch,
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Restore original platform values
   */
  static restore() {
    Object.defineProperty(process, 'platform', {
      value: this.originalPlatform,
      writable: false,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(process, 'arch', {
      value: this.originalArch,
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Common platform mocks for testing
   */
  static mockDarwinArm64() {
    this.mock({ os: 'darwin', arch: 'arm64' });
  }

  static mockDarwinX64() {
    this.mock({ os: 'darwin', arch: 'x64' });
  }

  static mockLinuxArm64() {
    this.mock({ os: 'linux', arch: 'arm64' });
  }

  static mockLinuxX64() {
    this.mock({ os: 'linux', arch: 'x64' });
  }

  static mockWindowsX64() {
    this.mock({ os: 'win32', arch: 'x64' });
  }

  static mockFreeBSD() {
    this.mock({ os: 'freebsd', arch: 'x64' });
  }

  static mockUnsupportedArch() {
    this.mock({ os: 'linux', arch: 'ia32' });
  }

  static mockMipsArch() {
    this.mock({ os: 'darwin', arch: 'mips' });
  }
}

/**
 * Platform test data matrices
 */
export const PLATFORM_TEST_DATA = {
  supported: [
    { os: 'darwin', arch: 'arm64', expected: 'weaviate-1.23.0-darwin-arm64' },
    { os: 'darwin', arch: 'x64', expected: 'weaviate-1.23.0-darwin-x64' },
    { os: 'linux', arch: 'arm64', expected: 'weaviate-1.23.0-linux-arm64' },
    { os: 'linux', arch: 'x64', expected: 'weaviate-1.23.0-linux-x64' },
  ],
  unsupported: {
    os: [
      { os: 'win32', arch: 'x64', error: 'Weaviate Embedded is not supported on Windows' },
      {
        os: 'freebsd',
        arch: 'x64',
        error: 'Unsupported OS: freebsd. Only macOS (darwin) and Linux are supported.',
      },
    ],
    arch: [
      {
        os: 'linux',
        arch: 'ia32',
        error: 'Unsupported architecture: ia32. Only arm64 and x64 are supported.',
      },
      {
        os: 'darwin',
        arch: 'mips',
        error: 'Unsupported architecture: mips. Only arm64 and x64 are supported.',
      },
    ],
  },
} as const;
