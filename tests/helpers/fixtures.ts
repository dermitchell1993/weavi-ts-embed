/**
 * Test data fixtures and configuration templates
 */

import type { EmbeddedOptionsConfig } from '@/types';

/**
 * Configuration fixtures
 */
export const configFixtures = {
  minimal: {
    version: '1.24.0',
  } as EmbeddedOptionsConfig,

  full: {
    version: '1.24.0',
    host: '127.0.0.1',
    port: 8080,
    persistence: {
      dataPath: '/tmp/weaviate-data',
    },
    resources: {
      limits: {
        memory: '1GB',
        cpu: '500m',
      },
    },
  } as EmbeddedOptionsConfig,

  invalid: {
    version: 'invalid-version',
    host: '',
    port: -1,
  } as any,

  withEnvVars: {
    version: '1.24.0',
    host: '0.0.0.0',
    port: 9090,
  } as EmbeddedOptionsConfig,
};

/**
 * Platform fixtures
 */
export const platformFixtures = {
  darwin: {
    platform: 'darwin',
    arch: 'x64',
    expectedUrl:
      'https://github.com/weaviate/weaviate/releases/download/v1.24.0/weaviate-v1.24.0-darwin-amd64.tar.gz',
  },

  darwinArm64: {
    platform: 'darwin',
    arch: 'arm64',
    expectedUrl:
      'https://github.com/weaviate/weaviate/releases/download/v1.24.0/weaviate-v1.24.0-darwin-arm64.tar.gz',
  },

  linux: {
    platform: 'linux',
    arch: 'x64',
    expectedUrl:
      'https://github.com/weaviate/weaviate/releases/download/v1.24.0/weaviate-v1.24.0-linux-amd64.tar.gz',
  },

  unsupported: {
    platform: 'win32',
    arch: 'x64',
    expectedError: 'Unsupported platform: win32',
  },
};

/**
 * Error message fixtures
 */
export const errorFixtures = {
  network: {
    connectionRefused: 'Connection refused',
    timeout: 'Request timeout',
    dns: 'ENOTFOUND',
  },

  filesystem: {
    permissionDenied: 'EACCES',
    diskFull: 'ENOSPC',
    fileNotFound: 'ENOENT',
  },

  archive: {
    corrupted: 'Archive corrupted',
    invalidFormat: 'Invalid archive format',
    extractionFailed: 'Extraction failed',
  },

  validation: {
    missingVersion: 'Version is required',
    invalidVersion: 'Invalid version format',
    unsupportedPlatform: 'Unsupported platform',
  },
};

/**
 * Test data generators
 */
export class TestDataGenerator {
  static randomVersion(): string {
    const major = Math.floor(Math.random() * 2) + 1;
    const minor = Math.floor(Math.random() * 25);
    const patch = Math.floor(Math.random() * 10);
    return `${major}.${minor}.${patch}`;
  }

  static randomPort(): number {
    return Math.floor(Math.random() * 10000) + 8000;
  }

  static randomHost(): string {
    const hosts = ['127.0.0.1', 'localhost', '0.0.0.0'];
    return hosts[Math.floor(Math.random() * hosts.length)];
  }

  static randomDataPath(): string {
    return `/tmp/weaviate-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
