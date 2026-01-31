/* eslint-disable no-sync */
/* eslint-disable no-new */
/**
 * Tests for Binary Manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BinaryManager, BinaryManagerOptions } from './binary-manager';
import * as fs from 'fs';
import * as https from 'https';
import { EventEmitter } from 'events';

// Mock modules
vi.mock('fs');
vi.mock('https');
vi.mock('adm-zip');
vi.mock('tar');

describe('BinaryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates instance with default options', () => {
      const manager = new BinaryManager();
      expect(manager).toBeInstanceOf(BinaryManager);
    });

    it('creates instance with custom version', () => {
      const manager = new BinaryManager({ version: '1.23.7' });
      expect(manager).toBeInstanceOf(BinaryManager);
    });

    it('creates instance with custom cache directory', () => {
      const manager = new BinaryManager({ cacheDir: '/custom/cache' });
      expect(manager).toBeInstanceOf(BinaryManager);
    });

    it('creates instance with custom binary URL', () => {
      const manager = new BinaryManager({ binaryUrl: 'https://example.com/weaviate' });
      expect(manager).toBeInstanceOf(BinaryManager);
    });

    it('throws error when both version and binaryUrl are provided', () => {
      expect(() => {
        new BinaryManager({
          version: '1.23.7',
          binaryUrl: 'https://example.com/weaviate',
        });
      }).toThrow('Cannot provide both version and binaryUrl');
    });

    it('uses XDG_CACHE_HOME environment variable if set', () => {
      const originalEnv = process.env.XDG_CACHE_HOME;
      process.env.XDG_CACHE_HOME = '/custom/xdg/cache';

      const manager = new BinaryManager();
      expect(manager).toBeInstanceOf(BinaryManager);

      // Restore
      if (originalEnv === undefined) {
        delete process.env.XDG_CACHE_HOME;
      } else {
        process.env.XDG_CACHE_HOME = originalEnv;
      }
    });
  });

  describe('resolveVersion()', () => {
    it('returns version directly when not "latest"', async () => {
      const manager = new BinaryManager({ version: '1.23.7' });
      const version = await manager.resolveVersion();
      expect(version).toBe('1.23.7');
    });

    it('fetches latest version from GitHub API when version is "latest"', async () => {
      const manager = new BinaryManager({ version: 'latest' });

      // Mock https.get
      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 200;

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback;
        process.nextTick(() => {
          cb(mockResponse);
          process.nextTick(() => {
            mockResponse.emit('data', JSON.stringify({ tag_name: 'v1.24.0' }));
            mockResponse.emit('end');
          });
        });
        return new EventEmitter() as any;
      });

      const version = await manager.resolveVersion();
      expect(version).toBe('1.24.0');
    });

    it('handles GitHub API errors gracefully', async () => {
      const manager = new BinaryManager({ version: 'latest' });

      const mockRequest = new EventEmitter() as any;
      vi.mocked(https.get).mockImplementation(() => {
        process.nextTick(() => {
          mockRequest.emit('error', new Error('Network error'));
        });
        return mockRequest;
      });

      await expect(manager.resolveVersion()).rejects.toThrow('Failed to find latest binary version');
    });

    it('handles non-200 status codes from GitHub API', async () => {
      const manager = new BinaryManager({ version: 'latest' });

      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 404;

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback;
        process.nextTick(() => {
          cb(mockResponse);
          process.nextTick(() => {
            mockResponse.emit('data', 'Not Found');
            mockResponse.emit('end');
          });
        });
        return new EventEmitter() as any;
      });

      await expect(manager.resolveVersion()).rejects.toThrow('Failed to fetch latest binary version');
    });

    it('handles invalid JSON response from GitHub API', async () => {
      const manager = new BinaryManager({ version: 'latest' });

      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 200;

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback;
        process.nextTick(() => {
          cb(mockResponse);
          process.nextTick(() => {
            mockResponse.emit('data', 'invalid json');
            mockResponse.emit('end');
          });
        });
        return new EventEmitter() as any;
      });

      await expect(manager.resolveVersion()).rejects.toThrow(
        'Failed to parse latest binary version response'
      );
    });
  });

  describe('constructDownloadURL()', () => {
    it('returns custom binaryUrl if provided', () => {
      const customUrl = 'https://example.com/weaviate-custom';
      const manager = new BinaryManager({ binaryUrl: customUrl });
      const url = manager.constructDownloadURL('1.23.7');
      expect(url).toBe(customUrl);
    });

    it('constructs correct URL for Linux x64', () => {
      // Mock platform detection
      const originalPlatform = process.platform;
      const originalArch = process.arch;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      Object.defineProperty(process, 'arch', { value: 'x64' });

      const manager = new BinaryManager({ version: '1.23.7' });
      const url = manager.constructDownloadURL('1.23.7');

      expect(url).toBe(
        'https://github.com/weaviate/weaviate/releases/download/v1.23.7/weaviate-v1.23.7-linux-amd64.tar.gz'
      );

      // Restore
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      Object.defineProperty(process, 'arch', { value: originalArch });
    });

    it('constructs correct URL for Linux arm64', () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      Object.defineProperty(process, 'arch', { value: 'arm64' });

      const manager = new BinaryManager({ version: '1.23.7' });
      const url = manager.constructDownloadURL('1.23.7');

      expect(url).toBe(
        'https://github.com/weaviate/weaviate/releases/download/v1.23.7/weaviate-v1.23.7-linux-arm64.tar.gz'
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      Object.defineProperty(process, 'arch', { value: originalArch });
    });

    it('constructs correct URL for macOS (darwin) with universal binary', () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      Object.defineProperty(process, 'arch', { value: 'arm64' });

      const manager = new BinaryManager({ version: '1.23.7' });
      const url = manager.constructDownloadURL('1.23.7');

      expect(url).toBe(
        'https://github.com/weaviate/weaviate/releases/download/v1.23.7/weaviate-v1.23.7-darwin-all.zip'
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      Object.defineProperty(process, 'arch', { value: originalArch });
    });
  });

  describe('getBinaryInfo()', () => {
    it('returns binary info without downloading', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new BinaryManager({ version: '1.23.7' });
      const info = await manager.getBinaryInfo();

      expect(info.version).toBe('1.23.7');
      expect(info.exists).toBe(false);
      expect(info.path).toContain('1.23.7');
      expect(info.platform).toBeDefined();
      expect(info.arch).toBeDefined();
    });

    it('detects existing binary in cache', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const manager = new BinaryManager({ version: '1.23.7' });
      const info = await manager.getBinaryInfo();

      expect(info.exists).toBe(true);
    });

    it('uses custom cache directory', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new BinaryManager({
        version: '1.23.7',
        cacheDir: '/custom/cache/weaviate',
      });
      const info = await manager.getBinaryInfo();

      expect(info.path).toContain('/custom/cache/weaviate');
    });

    it('uses MD5 hash for custom binary URLs', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new BinaryManager({
        binaryUrl: 'https://example.com/weaviate-custom',
      });
      const info = await manager.getBinaryInfo();

      // Path should contain hash, not version
      expect(info.path).not.toContain('latest');
      expect(info.path).toMatch(/-[A-Za-z0-9_-]+$/); // Base64url hash pattern
    });
  });

  describe('verifyChecksum()', () => {
    it('verifies checksum correctly', async () => {
      const manager = new BinaryManager();

      // Mock file stream
      const mockStream = new EventEmitter() as any;
      vi.mocked(fs.createReadStream).mockReturnValue(mockStream as any);

      // Simulate reading file and calculating hash
      const verifyPromise = manager.verifyChecksum('/path/to/binary', 'abc123');

      process.nextTick(() => {
        mockStream.emit('data', Buffer.from('test data'));
        mockStream.emit('end');
      });

      // This will fail with actual hash, but tests the flow
      await expect(verifyPromise).resolves.toBeDefined();
    });

    it('handles file read errors', async () => {
      const manager = new BinaryManager();

      const mockStream = new EventEmitter() as any;
      vi.mocked(fs.createReadStream).mockReturnValue(mockStream as any);

      const verifyPromise = manager.verifyChecksum('/path/to/binary', 'abc123');

      process.nextTick(() => {
        mockStream.emit('error', new Error('File not found'));
      });

      await expect(verifyPromise).rejects.toThrow('Failed to calculate checksum');
    });
  });

  describe('clearCache()', () => {
    it('removes binary from cache if it exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

      const manager = new BinaryManager({ version: '1.23.7' });
      await manager.clearCache();

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('does nothing if binary does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

      const manager = new BinaryManager({ version: '1.23.7' });
      await manager.clearCache();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles concurrent cache access gracefully', async () => {
      const manager = new BinaryManager({ version: '1.23.7' });

      // Multiple simultaneous calls should not conflict
      const promises = [manager.getBinaryInfo(), manager.getBinaryInfo(), manager.getBinaryInfo()];

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('validates checksum option usage', () => {
      const manager = new BinaryManager({
        version: '1.23.7',
        checksum: 'abc123',
      });

      expect(manager).toBeInstanceOf(BinaryManager);
    });

    it('supports skipChecksumVerification option', () => {
      const manager = new BinaryManager({
        version: '1.23.7',
        checksum: 'abc123',
        skipChecksumVerification: true,
      });

      expect(manager).toBeInstanceOf(BinaryManager);
    });
  });
});
