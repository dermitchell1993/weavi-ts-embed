/**
 * Integration Tests: Filesystem Extraction
 *
 * Tests real archive extraction operations with actual tar.gz and zip files.
 * Part A of Agent 7: Filesystem Extraction & Performance Tests
 *
 * NOTE: These tests access private methods (untarBinary, unzipBinary) using `as any`.
 * This is acceptable for integration testing as we need to test the internal extraction
 * logic in isolation. The public API (getCachedBinary) is tested in other test suites.
 *
 * @group integration
 */

/* eslint-disable no-sync */
/* eslint-disable @typescript-eslint/naming-convention */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BinaryManager } from '../../src/binary-manager';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to create unique temp directories
const createTempDir = (): string => {
  const tempBase = path.join(__dirname, '..', '..', 'tmp-test-extraction');
  if (!fs.existsSync(tempBase)) {
    fs.mkdirSync(tempBase, { recursive: true });
  }
  const uniqueDir = path.join(tempBase, `test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  fs.mkdirSync(uniqueDir, { recursive: true });
  return uniqueDir;
};

// Cleanup helper
const cleanupDir = (dirPath: string): void => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
};

describe('Archive Extraction Integration', () => {
  let tempDir: string;
  let manager: BinaryManager;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupDir(tempDir);
  });

  describe('Real Tar.gz Extraction', () => {
    it('should extract real tar.gz archive', async () => {
      // Arrange: Read the fixture tar.gz file
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.tar.gz');
      const tarBuffer = fs.readFileSync(fixturePath);
      expect(tarBuffer.length).toBeGreaterThan(0);

      // Create a temporary location for extraction
      const archivePath = path.join(tempDir, 'weaviate.tar.gz');
      const targetBinaryPath = path.join(tempDir, 'weaviate-extracted');

      fs.writeFileSync(archivePath, tarBuffer);

      // Act: Extract using BinaryManager's private method (via getCachedBinary workflow)
      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      // Use the untarBinary method indirectly by testing the full extraction workflow
      await (manager as any).untarBinary(archivePath, targetBinaryPath);

      // Assert: Verify extraction succeeded
      expect(fs.existsSync(targetBinaryPath)).toBe(true);
      const stats = fs.statSync(targetBinaryPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should extract tar.gz with correct file structure', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.tar.gz');
      const archivePath = path.join(tempDir, 'weaviate.tar.gz');
      const targetBinaryPath = path.join(tempDir, 'weaviate-binary');

      fs.copyFileSync(fixturePath, archivePath);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).untarBinary(archivePath, targetBinaryPath);

      // Verify the binary was extracted and renamed correctly
      expect(fs.existsSync(targetBinaryPath)).toBe(true);

      // Verify original archive was cleaned up
      expect(fs.existsSync(archivePath)).toBe(false);
    });
  });

  describe('Real Zip Archive Extraction', () => {
    it('should extract real zip archive', async () => {
      // Arrange: Read the fixture zip file
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.zip');
      const zipBuffer = fs.readFileSync(fixturePath);
      expect(zipBuffer.length).toBeGreaterThan(0);

      const archivePath = path.join(tempDir, 'weaviate.zip');
      const targetBinaryPath = path.join(tempDir, 'weaviate-extracted');

      fs.writeFileSync(archivePath, zipBuffer);

      // Act: Extract using BinaryManager
      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).unzipBinary(archivePath, targetBinaryPath);

      // Assert: Verify extraction succeeded
      expect(fs.existsSync(targetBinaryPath)).toBe(true);
      const stats = fs.statSync(targetBinaryPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should extract zip with correct file structure', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.zip');
      const archivePath = path.join(tempDir, 'weaviate.zip');
      const targetBinaryPath = path.join(tempDir, 'weaviate-binary');

      fs.copyFileSync(fixturePath, archivePath);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).unzipBinary(archivePath, targetBinaryPath);

      // Verify the binary was extracted
      expect(fs.existsSync(targetBinaryPath)).toBe(true);

      // Verify original archive was cleaned up
      expect(fs.existsSync(archivePath)).toBe(false);
    });
  });

  describe('File Permission Preservation', () => {
    it('should preserve executable permissions from tar.gz', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.tar.gz');
      const archivePath = path.join(tempDir, 'weaviate.tar.gz');
      const targetBinaryPath = path.join(tempDir, 'weaviate-binary');

      fs.copyFileSync(fixturePath, archivePath);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).untarBinary(archivePath, targetBinaryPath);

      const stats = fs.statSync(targetBinaryPath);

      // Verify executable bit is set (0o755 or 0o700)
      // Check if owner has execute permission (bit 6)
      const hasOwnerExecute = (stats.mode & 0o100) !== 0;
      expect(hasOwnerExecute).toBe(true);

      // Verify it's the expected permission (0o755)
      const permissions = stats.mode & 0o777;
      expect(permissions).toBe(0o755);
    });

    it('should preserve executable permissions from zip', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.zip');
      const archivePath = path.join(tempDir, 'weaviate.zip');
      const targetBinaryPath = path.join(tempDir, 'weaviate-binary');

      fs.copyFileSync(fixturePath, archivePath);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).unzipBinary(archivePath, targetBinaryPath);

      const stats = fs.statSync(targetBinaryPath);

      // Verify executable bit is set
      const hasOwnerExecute = (stats.mode & 0o100) !== 0;
      expect(hasOwnerExecute).toBe(true);

      // Verify it's the expected permission (0o755)
      const permissions = stats.mode & 0o777;
      expect(permissions).toBe(0o755);
    });
  });

  describe('Large Archive Handling', () => {
    it('should handle large archives (>10MB)', async () => {
      // Create a larger test file (10MB+)
      const largeBinaryPath = path.join(tempDir, 'large-weaviate');
      const largeSize = 10 * 1024 * 1024; // 10MB
      const buffer = Buffer.alloc(largeSize, 'x');
      fs.writeFileSync(largeBinaryPath, buffer);
      fs.chmodSync(largeBinaryPath, 0o755);

      // Create tar.gz archive
      const archivePath = path.join(tempDir, 'large-weaviate.tar.gz');
      const { execSync } = await import('child_process');
      execSync(`tar -czf "${archivePath}" -C "${tempDir}" "large-weaviate"`, {
        cwd: tempDir,
      });

      // Clean up the original file
      fs.unlinkSync(largeBinaryPath);

      // Extract
      const targetPath = path.join(tempDir, 'extracted-large-weaviate');
      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      // Rename the archive to have 'weaviate' inside for proper extraction
      const renamedOriginal = path.join(tempDir, 'weaviate');
      fs.writeFileSync(renamedOriginal, buffer);
      fs.chmodSync(renamedOriginal, 0o755);

      const newArchivePath = path.join(tempDir, 'weaviate-large.tar.gz');
      execSync(`tar -czf "${newArchivePath}" -C "${tempDir}" "weaviate"`, {
        cwd: tempDir,
      });

      fs.unlinkSync(renamedOriginal);

      // Test extraction
      await (manager as any).untarBinary(newArchivePath, targetPath);

      // Verify: No memory issues during extraction
      expect(fs.existsSync(targetPath)).toBe(true);
      const stats = fs.statSync(targetPath);
      expect(stats.size).toBe(largeSize);
    }, 30000); // Increase timeout for large file handling
  });

  describe('Extraction to Custom Path', () => {
    it('should extract to specified directory', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.tar.gz');
      const customExtractPath = path.join(tempDir, 'custom', 'nested', 'path');

      // Create custom directory structure
      fs.mkdirSync(customExtractPath, { recursive: true });

      const archivePath = path.join(customExtractPath, 'weaviate.tar.gz');
      const targetBinaryPath = path.join(customExtractPath, 'weaviate-custom');

      fs.copyFileSync(fixturePath, archivePath);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).untarBinary(archivePath, targetBinaryPath);

      // Verify extraction to custom path
      expect(fs.existsSync(targetBinaryPath)).toBe(true);
      expect(targetBinaryPath).toContain('custom/nested/path');

      const stats = fs.statSync(targetBinaryPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should work with extraction to nested directory structure', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.tar.gz');
      const deepPath = path.join(tempDir, 'very', 'deep', 'nested', 'structure', 'here');

      // Create the directory structure first
      fs.mkdirSync(deepPath, { recursive: true });

      const archivePath = path.join(deepPath, 'weaviate.tar.gz');
      const targetBinaryPath = path.join(deepPath, 'weaviate-deep');

      fs.copyFileSync(fixturePath, archivePath);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).untarBinary(archivePath, targetBinaryPath);

      // Verify extraction succeeded in nested directory structure
      expect(fs.existsSync(targetBinaryPath)).toBe(true);
      expect(fs.existsSync(deepPath)).toBe(true);

      // Verify it's a proper file with content
      const stats = fs.statSync(targetBinaryPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Extraction Cleanup', () => {
    it('should clean up archive file after successful tar extraction', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.tar.gz');
      const archivePath = path.join(tempDir, 'weaviate-cleanup.tar.gz');
      const targetBinaryPath = path.join(tempDir, 'weaviate-binary');

      fs.copyFileSync(fixturePath, archivePath);

      // Verify archive exists before extraction
      expect(fs.existsSync(archivePath)).toBe(true);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).untarBinary(archivePath, targetBinaryPath);

      // Verify archive was deleted after extraction
      expect(fs.existsSync(archivePath)).toBe(false);
      // But binary should exist
      expect(fs.existsSync(targetBinaryPath)).toBe(true);
    });

    it('should clean up archive file after successful zip extraction', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.zip');
      const archivePath = path.join(tempDir, 'weaviate-cleanup.zip');
      const targetBinaryPath = path.join(tempDir, 'weaviate-binary');

      fs.copyFileSync(fixturePath, archivePath);

      // Verify archive exists before extraction
      expect(fs.existsSync(archivePath)).toBe(true);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      await (manager as any).unzipBinary(archivePath, targetBinaryPath);

      // Verify archive was deleted after extraction
      expect(fs.existsSync(archivePath)).toBe(false);
      // But binary should exist
      expect(fs.existsSync(targetBinaryPath)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw on corrupted zip archive', async () => {
      const corruptedArchive = path.join(tempDir, 'corrupt.zip');
      const targetPath = path.join(tempDir, 'extracted-corrupt');

      // Write invalid zip content
      fs.writeFileSync(corruptedArchive, 'not a valid zip archive');

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      // Should reject with error - adm-zip will error on invalid format
      try {
        await (manager as any).unzipBinary(corruptedArchive, targetPath);
        expect.fail('Expected unzipBinary to throw an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle missing weaviate binary in zip', async () => {
      const { execSync } = await import('child_process');

      // Create a zip with different content (no 'weaviate' file)
      const wrongFile = path.join(tempDir, 'wrong-file.txt');
      fs.writeFileSync(wrongFile, 'wrong content');

      const wrongZip = path.join(tempDir, 'wrong.zip');
      execSync(`zip "${wrongZip}" wrong-file.txt`, { cwd: tempDir });

      fs.unlinkSync(wrongFile);

      const targetPath = path.join(tempDir, 'extracted-wrong');

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      // Should reject because 'weaviate' binary not found
      try {
        await (manager as any).unzipBinary(wrongZip, targetPath);
        expect.fail('Expected unzipBinary to throw an error for missing weaviate binary');
      } catch (error: any) {
        expect(error.message).toContain('Failed to find binary in zip');
      }
    });
  });

  describe('Test Fixtures Validation', () => {
    it('should have valid tar.gz fixture', () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.tar.gz');
      const buffer = fs.readFileSync(fixturePath);

      // Verify tar.gz magic bytes: 1f 8b (gzip header)
      expect(buffer[0]).toBe(0x1f);
      expect(buffer[1]).toBe(0x8b);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should have valid zip fixture', () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.zip');
      const buffer = fs.readFileSync(fixturePath);

      // Verify zip magic bytes: 50 4b (PK - zip header)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should extract valid content from tar.gz fixture', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.tar.gz');
      const archivePath = path.join(tempDir, 'test-fixture.tar.gz');
      const targetPath = path.join(tempDir, 'test-fixture-binary');

      fs.copyFileSync(fixturePath, archivePath);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      // Should extract without errors
      await expect((manager as any).untarBinary(archivePath, targetPath)).resolves.not.toThrow();

      // Verify extracted binary exists and has content
      expect(fs.existsSync(targetPath)).toBe(true);
      const content = fs.readFileSync(targetPath, 'utf8');
      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('Mock Weaviate');
    });

    it('should extract valid content from zip fixture', async () => {
      const fixturePath = path.join(__dirname, '..', 'fixtures', 'weaviate.zip');
      const archivePath = path.join(tempDir, 'test-fixture.zip');
      const targetPath = path.join(tempDir, 'test-fixture-binary');

      fs.copyFileSync(fixturePath, archivePath);

      manager = new BinaryManager({
        cacheDir: tempDir,
        version: '1.27.0',
      });

      // Should extract without errors
      await expect((manager as any).unzipBinary(archivePath, targetPath)).resolves.not.toThrow();

      // Verify extracted binary exists and has content
      expect(fs.existsSync(targetPath)).toBe(true);
      const content = fs.readFileSync(targetPath, 'utf8');
      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('Mock Weaviate');
    });
  });
});
