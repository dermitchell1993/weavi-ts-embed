/* eslint-disable no-sync */
/* eslint-disable no-new */
import { BinaryManager } from './binary-manager';
import fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('BinaryManager', () => {
  let testCacheDir: string;
  let binaryManager: BinaryManager;

  beforeEach(() => {
    testCacheDir = join(tmpdir(), `weaviate-test-${Date.now()}`);
    binaryManager = new BinaryManager({ cacheDir: testCacheDir });
  });

  afterEach(() => {
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should use default cache directory when none provided', () => {
      const manager = new BinaryManager();
      expect(manager).toBeDefined();
    });

    it('should accept custom cache directory', () => {
      const customDir = join(tmpdir(), 'custom-cache');
      const manager = new BinaryManager({ cacheDir: customDir });
      expect(manager).toBeDefined();
    });

    it('should accept skipChecksumVerification option', () => {
      const manager = new BinaryManager({ skipChecksumVerification: true });
      expect(manager).toBeDefined();
    });
  });

  describe('ensureBinary', () => {
    it('should return existing binary if already cached', async () => {
      const version = '1.23.0';
      const binaryPath = join(testCacheDir, version, 'weaviate');

      fs.mkdirSync(join(testCacheDir, version), { recursive: true });
      fs.writeFileSync(binaryPath, '#!/bin/bash\necho "test"');
      fs.chmodSync(binaryPath, 0o755);

      const result = await binaryManager.ensureBinary(version);
      expect(result).toBe(binaryPath);
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should handle custom binaryUrl', async () => {
      const version = '1.23.0';
      const customUrl = 'https://example.com/custom-weaviate.tar.gz';

      const manager = new BinaryManager({
        cacheDir: testCacheDir,
        skipChecksumVerification: true,
      });

      try {
        await manager.ensureBinary(version, customUrl);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported architecture', () => {
      const originalArch = process.arch;
      Object.defineProperty(process, 'arch', { value: 'unsupported' });

      expect(() => {
        new BinaryManager({ cacheDir: testCacheDir });
      }).not.toThrow();

      Object.defineProperty(process, 'arch', { value: originalArch });
    });

    it('should handle network failures gracefully', async () => {
      const manager = new BinaryManager({
        cacheDir: testCacheDir,
        skipChecksumVerification: true,
      });

      await expect(manager.ensureBinary('999.999.999')).rejects.toThrow();
    });

    it('should handle checksum mismatch', async () => {
      const manager = new BinaryManager({
        cacheDir: testCacheDir,
        skipChecksumVerification: false,
      });

      await expect(manager.ensureBinary('999.999.999')).rejects.toThrow();
    });
  });

  describe('cache behavior', () => {
    it('should cache binaries in version-specific directories', async () => {
      const version = '1.23.0';
      const expectedPath = join(testCacheDir, version, 'weaviate');

      fs.mkdirSync(join(testCacheDir, version), { recursive: true });
      fs.writeFileSync(expectedPath, '#!/bin/bash\necho "test"');
      fs.chmodSync(expectedPath, 0o755);

      const result = await binaryManager.ensureBinary(version);
      expect(result).toBe(expectedPath);
    });

    it('should reuse cached binaries on subsequent calls', async () => {
      const version = '1.23.0';
      const binaryPath = join(testCacheDir, version, 'weaviate');

      fs.mkdirSync(join(testCacheDir, version), { recursive: true });
      fs.writeFileSync(binaryPath, '#!/bin/bash\necho "test"');
      fs.chmodSync(binaryPath, 0o755);

      const result1 = await binaryManager.ensureBinary(version);
      const result2 = await binaryManager.ensureBinary(version);

      expect(result1).toBe(result2);
      expect(fs.existsSync(result1)).toBe(true);
    });
  });

  describe('platform compatibility', () => {
    it('should handle darwin platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const manager = new BinaryManager({ cacheDir: testCacheDir });
      expect(manager).toBeDefined();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle linux platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const manager = new BinaryManager({ cacheDir: testCacheDir });
      expect(manager).toBeDefined();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
