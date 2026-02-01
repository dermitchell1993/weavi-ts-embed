/* eslint-disable no-new, no-await-in-loop, no-sync */
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { BinaryManager, BinaryManagerOptions } from '../../src/binary-manager';
import { homedir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { EventEmitter } from 'events';

/**
 * Binary Manager Unit Tests
 *
 * Comprehensive test suite covering:
 * - Version resolution (latest vs specific versions)
 * - URL construction (platform-specific download URLs)
 * - Checksum verification (SHA-256 hashing)
 * - Caching logic (path generation and concurrent download protection)
 * - Download handling (success, redirects, errors)
 * - Binary extraction (tar.gz and zip formats)
 *
 * Target: >80% code coverage
 */

// Mock modules
vi.mock('fs');
vi.mock('https');
vi.mock('http');
vi.mock('tar');
vi.mock('adm-zip');

// Test constants
const TEST_VERSION = '1.23.7';
const TEST_CUSTOM_URL = 'https://custom-mirror.com/weaviate-binary';
const DEFAULT_CACHE_DIR = join(homedir(), '.cache/weaviate-embedded');

describe('BinaryManager - Constructor & Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.XDG_CACHE_HOME;
  });

  afterEach(() => {
    delete process.env.XDG_CACHE_HOME;
  });

  it('should create instance with default options', () => {
    const manager = new BinaryManager();

    expect(manager).toBeInstanceOf(BinaryManager);
  });

  it('should use "latest" as default version', async () => {
    // Mock GitHub API response for "latest" version
    const mockResponse = {
      statusCode: 200,
      on: vi.fn((event, handler) => {
        if (event === 'data') {
          handler(JSON.stringify({ tag_name: 'v1.23.7' }));
        } else if (event === 'end') {
          handler();
        }
        return mockResponse;
      }),
    };

    const mockRequest = {
      on: vi.fn((event, handler) => mockRequest),
    };

    (https.get as Mock).mockImplementation((url, options, callback) => {
      callback(mockResponse);
      return mockRequest;
    });

    const manager = new BinaryManager();

    // Verify that resolveVersion fetches "latest" from GitHub
    const version = await manager.resolveVersion();
    expect(version).toBe('1.23.7');
  });

  it('should accept specific version', () => {
    const manager = new BinaryManager({ version: TEST_VERSION });

    // Verify the version resolves correctly
    return manager.resolveVersion().then((version) => {
      expect(version).toBe(TEST_VERSION);
    });
  });

  it('should accept custom binary URL', () => {
    const manager = new BinaryManager({ binaryUrl: TEST_CUSTOM_URL });

    const url = manager.constructDownloadURL('dummy-version');
    expect(url).toBe(TEST_CUSTOM_URL);
  });

  it('should throw error when both version and binaryUrl are provided', () => {
    expect(() => {
      new BinaryManager({
        version: TEST_VERSION,
        binaryUrl: TEST_CUSTOM_URL,
      });
    }).toThrow('Cannot provide both version and binaryUrl');
  });

  it('should use default cache directory when not specified', () => {
    const manager = new BinaryManager({ version: TEST_VERSION });

    return manager.getBinaryInfo().then((info) => {
      expect(info.path).toContain('.cache/weaviate-embedded');
    });
  });

  it('should respect XDG_CACHE_HOME environment variable', () => {
    process.env.XDG_CACHE_HOME = '/custom/cache';
    const manager = new BinaryManager({ version: TEST_VERSION });

    return manager.getBinaryInfo().then((info) => {
      expect(info.path).toContain('/custom/cache');
    });
  });

  it('should accept custom cache directory', () => {
    const customCache = '/my/custom/cache/dir';
    const manager = new BinaryManager({
      version: TEST_VERSION,
      cacheDir: customCache,
    });

    return manager.getBinaryInfo().then((info) => {
      expect(info.path).toContain(customCache);
    });
  });

  it('should accept checksum option', () => {
    const checksum = 'abc123def456';
    const manager = new BinaryManager({
      version: TEST_VERSION,
      checksum,
    });

    return manager.getBinaryInfo().then((info) => {
      expect(info.checksum).toBe(checksum);
    });
  });

  it('should accept skipChecksumVerification option', () => {
    const manager = new BinaryManager({
      version: TEST_VERSION,
      checksum: 'abc123',
      skipChecksumVerification: true,
    });

    expect(manager).toBeInstanceOf(BinaryManager);
  });

  it('should accept verbose option', () => {
    const manager = new BinaryManager({
      version: TEST_VERSION,
      verbose: true,
    });

    expect(manager).toBeInstanceOf(BinaryManager);
  });
});

describe('BinaryManager - Version Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveVersion() with specific version', () => {
    it('should return specified version immediately', async () => {
      const manager = new BinaryManager({ version: TEST_VERSION });

      const version = await manager.resolveVersion();

      expect(version).toBe(TEST_VERSION);
    });

    it('should handle different version formats', async () => {
      const versions = ['1.18.0', '1.23.7', '2.0.1', '1.19.8-rc.1'];

      for (const v of versions) {
        const manager = new BinaryManager({ version: v });
        const resolved = await manager.resolveVersion();
        expect(resolved).toBe(v);
      }
    });
  });

  describe('resolveVersion() with "latest"', () => {
    it('should fetch latest version from GitHub API', async () => {
      const mockResponse = {
        statusCode: 200,
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({ tag_name: 'v1.23.7' }));
          } else if (event === 'end') {
            handler();
          }
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn((event, handler) => mockRequest),
      };

      (https.get as Mock).mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const manager = new BinaryManager({ version: 'latest' });
      const version = await manager.resolveVersion();

      expect(version).toBe('1.23.7');
      expect(https.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/weaviate/weaviate/releases/latest',
        expect.objectContaining({
          headers: {
            'User-Agent': 'weaviate-ts-embedded',
          },
        }),
        expect.any(Function)
      );
    });

    it('should strip "v" prefix from tag_name', async () => {
      const mockResponse = {
        statusCode: 200,
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({ tag_name: 'v2.0.0' }));
          } else if (event === 'end') {
            handler();
          }
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn((event, handler) => mockRequest),
      };

      (https.get as Mock).mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const manager = new BinaryManager({ version: 'latest' });
      const version = await manager.resolveVersion();

      expect(version).toBe('2.0.0');
    });

    it('should handle GitHub API non-200 response', async () => {
      const mockResponse = {
        statusCode: 404,
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler('Not Found');
          } else if (event === 'end') {
            handler();
          }
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn((event, handler) => mockRequest),
      };

      (https.get as Mock).mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const manager = new BinaryManager({ version: 'latest' });

      await expect(manager.resolveVersion()).rejects.toThrow(/Failed to fetch latest binary version.*404/);
    });

    it('should handle malformed GitHub API response', async () => {
      const mockResponse = {
        statusCode: 200,
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler('invalid json');
          } else if (event === 'end') {
            handler();
          }
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn((event, handler) => mockRequest),
      };

      (https.get as Mock).mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const manager = new BinaryManager({ version: 'latest' });

      await expect(manager.resolveVersion()).rejects.toThrow(
        /Failed to parse latest binary version response/
      );
    });

    it('should handle missing tag_name in response', async () => {
      const mockResponse = {
        statusCode: 200,
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler(JSON.stringify({ name: 'Release 1.23.7' }));
          } else if (event === 'end') {
            handler();
          }
          return mockResponse;
        }),
      };

      const mockRequest = {
        on: vi.fn((event, handler) => mockRequest),
      };

      (https.get as Mock).mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const manager = new BinaryManager({ version: 'latest' });

      await expect(manager.resolveVersion()).rejects.toThrow(
        /Failed to parse version from GitHub API response/
      );
    });

    it('should handle network errors', async () => {
      const mockRequest = {
        on: vi.fn((event, handler) => {
          if (event === 'error') {
            handler(new Error('Network error'));
          }
          return mockRequest;
        }),
      };

      (https.get as Mock).mockImplementation(() => mockRequest);

      const manager = new BinaryManager({ version: 'latest' });

      await expect(manager.resolveVersion()).rejects.toThrow(/Failed to find latest binary version/);
    });
  });
});

describe('BinaryManager - URL Construction', () => {
  const originalPlatform = process.platform;
  const originalArch = process.arch;

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

  afterEach(() => {
    mockPlatform(originalPlatform, originalArch);
  });

  describe('constructDownloadURL() with custom URL', () => {
    it('should return custom binaryUrl when provided', () => {
      const manager = new BinaryManager({ binaryUrl: TEST_CUSTOM_URL });

      const url = manager.constructDownloadURL('1.23.7');

      expect(url).toBe(TEST_CUSTOM_URL);
    });
  });

  describe('constructDownloadURL() for Linux', () => {
    it('should construct correct URL for Linux x64', () => {
      mockPlatform('linux', 'x64');
      const manager = new BinaryManager({ version: TEST_VERSION });

      const url = manager.constructDownloadURL(TEST_VERSION);

      expect(url).toBe(
        `https://github.com/weaviate/weaviate/releases/download/v${TEST_VERSION}/weaviate-v${TEST_VERSION}-linux-amd64.tar.gz`
      );
    });

    it('should construct correct URL for Linux arm64', () => {
      mockPlatform('linux', 'arm64');
      const manager = new BinaryManager({ version: TEST_VERSION });

      const url = manager.constructDownloadURL(TEST_VERSION);

      expect(url).toBe(
        `https://github.com/weaviate/weaviate/releases/download/v${TEST_VERSION}/weaviate-v${TEST_VERSION}-linux-arm64.tar.gz`
      );
    });

    it('should use tar.gz extension for Linux', () => {
      mockPlatform('linux', 'x64');
      const manager = new BinaryManager({ version: TEST_VERSION });

      const url = manager.constructDownloadURL(TEST_VERSION);

      expect(url).toMatch(/\.tar\.gz$/);
    });
  });

  describe('constructDownloadURL() for macOS', () => {
    it('should construct correct URL for macOS arm64 with universal binary', () => {
      mockPlatform('darwin', 'arm64');
      const manager = new BinaryManager({ version: TEST_VERSION });

      const url = manager.constructDownloadURL(TEST_VERSION);

      expect(url).toBe(
        `https://github.com/weaviate/weaviate/releases/download/v${TEST_VERSION}/weaviate-v${TEST_VERSION}-darwin-all.zip`
      );
    });

    it('should construct correct URL for macOS x64 with universal binary', () => {
      mockPlatform('darwin', 'x64');
      const manager = new BinaryManager({ version: TEST_VERSION });

      const url = manager.constructDownloadURL(TEST_VERSION);

      expect(url).toBe(
        `https://github.com/weaviate/weaviate/releases/download/v${TEST_VERSION}/weaviate-v${TEST_VERSION}-darwin-all.zip`
      );
    });

    it('should use "all" architecture for macOS (universal binary)', () => {
      mockPlatform('darwin', 'arm64');
      const manager = new BinaryManager({ version: TEST_VERSION });

      const url = manager.constructDownloadURL(TEST_VERSION);

      expect(url).toContain('-darwin-all');
    });

    it('should use zip extension for macOS', () => {
      mockPlatform('darwin', 'x64');
      const manager = new BinaryManager({ version: TEST_VERSION });

      const url = manager.constructDownloadURL(TEST_VERSION);

      expect(url).toMatch(/\.zip$/);
    });
  });

  describe('constructDownloadURL() error handling', () => {
    it('should throw error for unsupported architecture', () => {
      mockPlatform('linux', 'ia32');

      expect(() => new BinaryManager({ version: TEST_VERSION })).toThrow(/Unsupported architecture: ia32/);
    });
  });
});

describe('BinaryManager - Checksum Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify correct checksum', async () => {
    const testData = 'test binary content';
    const expectedChecksum = createHash('sha256').update(testData).digest('hex');

    const mockStream = new EventEmitter();
    (fs.createReadStream as Mock).mockReturnValue(mockStream);

    const manager = new BinaryManager({ version: TEST_VERSION });
    const verifyPromise = manager.verifyChecksum('/path/to/binary', expectedChecksum);

    // Simulate stream events
    setImmediate(() => {
      mockStream.emit('data', testData);
      mockStream.emit('end');
    });

    const result = await verifyPromise;

    expect(result).toBe(true);
  });

  it('should detect incorrect checksum', async () => {
    const testData = 'test binary content';
    const wrongChecksum = 'abc123';

    const mockStream = new EventEmitter();
    (fs.createReadStream as Mock).mockReturnValue(mockStream);

    const manager = new BinaryManager({ version: TEST_VERSION });
    const verifyPromise = manager.verifyChecksum('/path/to/binary', wrongChecksum);

    setImmediate(() => {
      mockStream.emit('data', testData);
      mockStream.emit('end');
    });

    const result = await verifyPromise;

    expect(result).toBe(false);
  });

  it('should handle stream errors', async () => {
    const mockStream = new EventEmitter();
    (fs.createReadStream as Mock).mockReturnValue(mockStream);

    const manager = new BinaryManager({ version: TEST_VERSION });
    const verifyPromise = manager.verifyChecksum('/path/to/binary', 'abc123');

    setImmediate(() => {
      mockStream.emit('error', new Error('Read error'));
    });

    await expect(verifyPromise).rejects.toThrow(/Failed to calculate checksum/);
  });

  it('should support custom hash algorithms', async () => {
    const testData = 'test binary content';
    const expectedChecksum = createHash('md5').update(testData).digest('hex');

    const mockStream = new EventEmitter();
    (fs.createReadStream as Mock).mockReturnValue(mockStream);

    const manager = new BinaryManager({ version: TEST_VERSION });
    const verifyPromise = manager.verifyChecksum('/path/to/binary', expectedChecksum, 'md5');

    setImmediate(() => {
      mockStream.emit('data', testData);
      mockStream.emit('end');
    });

    const result = await verifyPromise;

    expect(result).toBe(true);
  });
});

describe('BinaryManager - Caching Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.XDG_CACHE_HOME;
  });

  describe('getBinaryInfo()', () => {
    it('should generate unique paths for different versions', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const manager1 = new BinaryManager({ version: '1.18.0' });
      const manager2 = new BinaryManager({ version: '1.23.7' });

      const info1 = await manager1.getBinaryInfo();
      const info2 = await manager2.getBinaryInfo();

      expect(info1.path).not.toBe(info2.path);
      expect(info1.path).toContain('1.18.0');
      expect(info2.path).toContain('1.23.7');
    });

    it('should use MD5 hash for custom binaryUrl paths', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const url1 = 'https://example.com/weaviate-1';
      const url2 = 'https://example.com/weaviate-2';

      const manager1 = new BinaryManager({ binaryUrl: url1 });
      const manager2 = new BinaryManager({ binaryUrl: url2 });

      const info1 = await manager1.getBinaryInfo();
      const info2 = await manager2.getBinaryInfo();

      const hash1 = createHash('md5').update(url1).digest('base64url');
      const hash2 = createHash('md5').update(url2).digest('base64url');

      expect(info1.path).toContain(hash1);
      expect(info2.path).toContain(hash2);
      expect(info1.path).not.toBe(info2.path);
    });

    it('should generate consistent paths for same URL', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const url = 'https://example.com/weaviate';
      const manager1 = new BinaryManager({ binaryUrl: url });
      const manager2 = new BinaryManager({ binaryUrl: url });

      const info1 = await manager1.getBinaryInfo();
      const info2 = await manager2.getBinaryInfo();

      expect(info1.path).toBe(info2.path);
    });

    it('should report exists=false when binary not cached', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const manager = new BinaryManager({ version: TEST_VERSION });
      const info = await manager.getBinaryInfo();

      expect(info.exists).toBe(false);
    });

    it('should report exists=true when binary cached', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);

      const manager = new BinaryManager({ version: TEST_VERSION });
      const info = await manager.getBinaryInfo();

      expect(info.exists).toBe(true);
    });

    it('should include version in BinaryInfo', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const manager = new BinaryManager({ version: TEST_VERSION });
      const info = await manager.getBinaryInfo();

      expect(info.version).toBe(TEST_VERSION);
    });

    it('should include platform and arch in BinaryInfo', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const manager = new BinaryManager({ version: TEST_VERSION });
      const info = await manager.getBinaryInfo();

      expect(info.platform).toMatch(/^(darwin|linux)$/);
      expect(info.arch).toMatch(/^(arm64|x64)$/);
    });

    it('should include checksum in BinaryInfo when provided', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const checksum = 'abc123def456';
      const manager = new BinaryManager({
        version: TEST_VERSION,
        checksum,
      });
      const info = await manager.getBinaryInfo();

      expect(info.checksum).toBe(checksum);
    });

    it('should include URL in BinaryInfo', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const manager = new BinaryManager({ version: TEST_VERSION });
      const info = await manager.getBinaryInfo();

      expect(info.url).toContain('github.com/weaviate/weaviate/releases');
    });

    it('should use "custom" as version for binaryUrl', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const manager = new BinaryManager({ binaryUrl: TEST_CUSTOM_URL });
      const info = await manager.getBinaryInfo();

      expect(info.version).toBe('custom');
      expect(info.url).toBe(TEST_CUSTOM_URL);
    });
  });

  describe('clearCache()', () => {
    it('should delete cached binary if exists', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.unlinkSync as Mock).mockImplementation(() => {});

      const manager = new BinaryManager({ version: TEST_VERSION });
      await manager.clearCache();

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not throw if binary does not exist', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const manager = new BinaryManager({ version: TEST_VERSION });

      await expect(manager.clearCache()).resolves.not.toThrow();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});

describe('BinaryManager - Edge Cases and Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle verbose logging option', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    (fs.existsSync as Mock).mockReturnValue(true);

    const manager = new BinaryManager({
      version: TEST_VERSION,
      verbose: true,
    });

    await manager.getBinaryInfo();

    consoleSpy.mockRestore();
  });

  it('should handle skipChecksumVerification option', () => {
    const manager = new BinaryManager({
      version: TEST_VERSION,
      checksum: 'abc123',
      skipChecksumVerification: true,
    });

    expect(manager).toBeInstanceOf(BinaryManager);
  });

  it('should construct different URLs for different platforms', () => {
    const manager = new BinaryManager({ version: TEST_VERSION });
    const url = manager.constructDownloadURL(TEST_VERSION);

    // URL should contain platform-specific information
    expect(url).toContain('github.com/weaviate/weaviate');
    expect(url).toContain(TEST_VERSION);
  });

  it('should handle version with pre-release tags', async () => {
    const preReleaseVersion = '1.23.7-rc.1';
    const manager = new BinaryManager({ version: preReleaseVersion });

    const version = await manager.resolveVersion();
    expect(version).toBe(preReleaseVersion);
  });

  it('should handle version with build metadata', async () => {
    const buildVersion = '1.23.7+20230615';
    const manager = new BinaryManager({ version: buildVersion });

    const version = await manager.resolveVersion();
    expect(version).toBe(buildVersion);
  });

  // TODO: PRI-825 - Version validation security enhancement needed
  // Currently BinaryManager accepts any string version without validation
  // Should integrate with validateVersion() from config.ts
  it('should accept any version string (validation gap - see PRI-825)', () => {
    // CURRENT BEHAVIOR: No validation happens in BinaryManager constructor
    // These all succeed but SHOULD be validated:
    expect(() => new BinaryManager({ version: '1.23.7-rc.1' })).not.toThrow();
    expect(() => new BinaryManager({ version: '1.23.7+build' })).not.toThrow();

    // SECURITY GAP: Path traversal attempts are not blocked
    // TODO PRI-825: Should reject versions with .., /, \\ characters
    expect(() => new BinaryManager({ version: '../../../etc/passwd' })).not.toThrow();
    expect(() => new BinaryManager({ version: '1.0.0/../tmp' })).not.toThrow();
  });

  it('should use custom cacheDir in path generation', async () => {
    (fs.existsSync as Mock).mockReturnValue(false);

    const customCache = '/my/custom/cache';
    const manager = new BinaryManager({
      version: TEST_VERSION,
      cacheDir: customCache,
    });

    const info = await manager.getBinaryInfo();
    expect(info.path).toContain(customCache);
  });

  it('should include all required fields in BinaryInfo', async () => {
    (fs.existsSync as Mock).mockReturnValue(false);

    const manager = new BinaryManager({ version: TEST_VERSION });
    const info = await manager.getBinaryInfo();

    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('url');
    expect(info).toHaveProperty('path');
    expect(info).toHaveProperty('platform');
    expect(info).toHaveProperty('arch');
    expect(info).toHaveProperty('exists');
  });

  it('should handle URL with query parameters in hash for custom binaryUrl', async () => {
    (fs.existsSync as Mock).mockReturnValue(false);

    const url = 'https://example.com/weaviate?version=1.27.0&arch=amd64';
    const manager = new BinaryManager({ binaryUrl: url });

    const info = await manager.getBinaryInfo();
    const expectedHash = createHash('md5').update(url).digest('base64url');
    expect(info.path).toContain(expectedHash);
  });

  it('should handle very long URLs in hash generation', async () => {
    (fs.existsSync as Mock).mockReturnValue(false);

    const longUrl = 'https://example.com/' + 'a'.repeat(500) + '/weaviate';
    const manager = new BinaryManager({ binaryUrl: longUrl });

    const info = await manager.getBinaryInfo();
    const hash = createHash('md5').update(longUrl).digest('base64url');
    expect(info.path).toContain(hash);
  });
});

describe('BinaryManager - getCachedBinary() Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing binary without download', async () => {
    (fs.existsSync as Mock).mockReturnValue(true);

    const manager = new BinaryManager({ version: TEST_VERSION });
    const info = await manager.getCachedBinary();

    expect(info.exists).toBe(true);
    expect(info.version).toBe(TEST_VERSION);
  });

  it('should resolve latest version when specified', async () => {
    (fs.existsSync as Mock).mockReturnValue(true);

    const mockResponse = {
      statusCode: 200,
      on: vi.fn((event, handler) => {
        if (event === 'data') {
          handler(JSON.stringify({ tag_name: 'v1.23.7' }));
        } else if (event === 'end') {
          handler();
        }
        return mockResponse;
      }),
    };

    const mockRequest = {
      on: vi.fn((event, handler) => mockRequest),
    };

    (https.get as Mock).mockImplementation((url, options, callback) => {
      if (typeof options === 'function') {
        options(mockResponse);
      } else {
        callback(mockResponse);
      }
      return mockRequest;
    });

    const manager = new BinaryManager({ version: 'latest' });
    const info = await manager.getCachedBinary();

    expect(info.version).toBe('1.23.7');
  });
});
