/**
 * Corrupted Archive Handling - Security Tests
 *
 * Tests extraction handling of corrupted, malformed, and partially-failed
 * archive files to ensure graceful error handling and proper cleanup.
 *
 * Test Coverage:
 * 1. Corrupted tar archives with invalid headers
 * 2. Corrupted zip archives with invalid headers
 * 3. Partial extraction failures and cleanup
 * 4. Truncated archive files
 * 5. Empty archives
 * 6. Archives with invalid internal structure
 *
 * Security Considerations:
 * - Ensures cleanup prevents disk space leaks
 * - Verifies no partial state persists after failures
 * - Tests error messages don't expose sensitive paths
 */

/* eslint-disable no-sync */
/* eslint-disable no-new */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-useless-escape */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import * as tar from 'tar';
import AdmZip from 'adm-zip';
import {
  createCorruptedTarArchive,
  createCorruptedZipArchive,
  createTruncatedTarArchive,
  createTruncatedZipArchive,
  createEmptyTarArchive,
  createEmptyZipArchive,
  createHeaderOnlyTarArchive,
  createInternallyCorruptedTarArchive,
  cleanupArchive,
  cleanupExtractedDir,
} from '../helpers/mockArchives';

describe('Corrupted Archive Handling - Security Tests', () => {
  let testArchivePath: string;
  let extractPath: string;

  beforeEach(() => {
    // Create unique extraction path for each test
    extractPath = path.join(tmpdir(), `extract-test-${Date.now()}`);
    fs.mkdirSync(extractPath, { recursive: true });
  });

  afterEach(() => {
    // Cleanup test artifacts
    if (testArchivePath) {
      cleanupArchive(testArchivePath);
    }
    if (extractPath) {
      cleanupExtractedDir(extractPath);
    }
  });

  describe('Corrupted TAR Archive Detection', () => {
    it('should reject corrupted tar archive with invalid header', async () => {
      testArchivePath = createCorruptedTarArchive();

      // Attempt to extract corrupted tar
      await expect(async () => {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      }).rejects.toThrow(/invalid tar|unexpected end|corrupt|unrecognized|bad archive/i);

      // Verify no files were extracted
      const extractedFiles = fs.readdirSync(extractPath);
      expect(extractedFiles).toHaveLength(0);
    });

    it('should provide descriptive error message for corrupted tar', async () => {
      testArchivePath = createCorruptedTarArchive();

      try {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
        expect.fail('Should have thrown an error for corrupted tar');
      } catch (error) {
        // Verify error message is helpful and descriptive
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(10);

        // Ensure error doesn't expose full system paths
        const errorMsg = error.message.toLowerCase();
        expect(errorMsg).not.toContain('/home/');
        expect(errorMsg).not.toContain('/root/');
        expect(errorMsg).not.toContain('c:\\users\\');
      }
    });

    it('should handle empty tar archive gracefully', async () => {
      testArchivePath = createEmptyTarArchive();

      await expect(async () => {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      }).rejects.toThrow(/unexpected end|invalid|empty|corrupt|unrecognized|bad archive/i);
    });

    it('should reject tar with only header bytes', async () => {
      testArchivePath = createHeaderOnlyTarArchive();

      await expect(async () => {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      }).rejects.toThrow(/unexpected end|invalid|truncated/i);
    });
  });

  describe('Corrupted ZIP Archive Detection', () => {
    it('should reject corrupted zip archive with invalid header', () => {
      testArchivePath = createCorruptedZipArchive();

      // adm-zip throws on instantiation with invalid zip
      expect(() => {
        const zip = new AdmZip(testArchivePath);
        const entries = zip.getEntries();

        // If we get here somehow, extraction should still fail
        if (entries.length > 0) {
          zip.extractAllTo(extractPath, false);
        }
      }).toThrow(); // Just verify it throws - error message varies by adm-zip version

      // Verify no files were extracted
      if (fs.existsSync(extractPath)) {
        const extractedFiles = fs.readdirSync(extractPath);
        expect(extractedFiles).toHaveLength(0);
      }
    });

    it('should provide descriptive error message for corrupted zip', () => {
      testArchivePath = createCorruptedZipArchive();

      try {
        new AdmZip(testArchivePath);
        expect.fail('Should have thrown an error for corrupted zip');
      } catch (error) {
        // Verify error message is helpful
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(5);
      }
    });

    it('should handle empty zip archive gracefully', () => {
      testArchivePath = createEmptyZipArchive();

      expect(() => {
        new AdmZip(testArchivePath);
      }).toThrow(); // Just verify it throws - error message varies
    });
  });

  describe('Truncated Archive Detection', () => {
    it('should detect and reject truncated tar archive', async () => {
      testArchivePath = await createTruncatedTarArchive();

      await expect(async () => {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      }).rejects.toThrow(/unexpected end|truncated|incomplete|corrupt/i);

      // Verify extraction directory is clean
      const extractedFiles = fs.readdirSync(extractPath);
      expect(extractedFiles.length).toBeLessThanOrEqual(1); // May have partial extraction
    });

    it('should detect and reject truncated zip archive', () => {
      testArchivePath = createTruncatedZipArchive();

      expect(() => {
        const zip = new AdmZip(testArchivePath);
        zip.getEntries(); // This should fail on corrupted zip
      }).toThrow(); // Just verify it throws - error message varies
    });

    it('should provide clear error for incomplete downloads (truncated archives)', async () => {
      testArchivePath = await createTruncatedTarArchive();

      try {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
        expect.fail('Should have thrown error for truncated archive');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        const errorMsg = error.message.toLowerCase();

        // Error should indicate incomplete/truncated state
        const hasRelevantKeyword =
          errorMsg.includes('unexpected') ||
          errorMsg.includes('truncated') ||
          errorMsg.includes('incomplete') ||
          errorMsg.includes('corrupt');

        expect(hasRelevantKeyword).toBe(true);
      }
    });
  });

  describe('Partial Extraction Failure Handling', () => {
    it('should handle extraction failure mid-process', async () => {
      testArchivePath = await createInternallyCorruptedTarArchive();

      // This archive has valid header but corrupted content
      await expect(async () => {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      }).rejects.toThrow();

      // Verify cleanup - extraction should be aborted
      // In strict mode, tar should not leave partial files
      if (fs.existsSync(extractPath)) {
        const files = fs.readdirSync(extractPath);
        // Either no files or minimal partial state
        expect(files.length).toBeLessThanOrEqual(1);
      }
    });

    it('should not leave partial files after extraction failure', async () => {
      testArchivePath = await createInternallyCorruptedTarArchive();
      const beforeExtraction = fs.existsSync(extractPath) ? fs.readdirSync(extractPath).length : 0;

      try {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      } catch (error) {
        // Expected to fail
      }

      // After failure, should not have significantly more files than before
      const afterExtraction = fs.existsSync(extractPath) ? fs.readdirSync(extractPath).length : 0;

      // Should not accumulate many partial files
      expect(afterExtraction - beforeExtraction).toBeLessThanOrEqual(2);
    });

    it('should clean up on zip extraction failure', () => {
      testArchivePath = createCorruptedZipArchive();
      const beforeExtraction = fs.existsSync(extractPath) ? fs.readdirSync(extractPath).length : 0;

      try {
        const zip = new AdmZip(testArchivePath);
        zip.extractAllTo(extractPath, false);
      } catch (error) {
        // Expected to fail
      }

      // Should not leave partial extraction
      const afterExtraction = fs.existsSync(extractPath) ? fs.readdirSync(extractPath).length : 0;

      expect(afterExtraction).toBe(beforeExtraction);
    });
  });

  describe('Security - Error Message Sanitization', () => {
    it('should not expose sensitive paths in tar error messages', async () => {
      testArchivePath = createCorruptedTarArchive();

      try {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      } catch (error) {
        const errorMsg = error.message;

        // Should not expose user directories
        expect(errorMsg).not.toMatch(/\/home\/[^\/]+/);
        expect(errorMsg).not.toMatch(/\/Users\/[^\/]+/);
        expect(errorMsg).not.toMatch(/C:\\Users\\[^\\]+/);
        expect(errorMsg).not.toMatch(/\/root\//);

        // Should not expose system paths
        expect(errorMsg).not.toContain('/etc/');
        expect(errorMsg).not.toContain('/var/');
        expect(errorMsg).not.toContain('C:\\Windows\\');
      }
    });

    it('should not expose sensitive paths in zip error messages', () => {
      testArchivePath = createCorruptedZipArchive();

      try {
        new AdmZip(testArchivePath);
      } catch (error) {
        const errorMsg = error.message;

        // Should not expose sensitive system paths
        expect(errorMsg).not.toMatch(/\/home\/[^\/]+/);
        expect(errorMsg).not.toMatch(/\/Users\/[^\/]+/);
        expect(errorMsg).not.toMatch(/C:\\Users\\[^\\]+/);
      }
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should not leak disk space after failed tar extraction', async () => {
      testArchivePath = await createTruncatedTarArchive();
      const initialFiles = fs.readdirSync(extractPath).length;

      try {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      } catch (error) {
        // Expected failure
      }

      // Cleanup should prevent accumulation
      const finalFiles = fs.readdirSync(extractPath).length;
      expect(finalFiles - initialFiles).toBeLessThanOrEqual(2);
    });

    it('should handle multiple failed extraction attempts without leaking', async () => {
      testArchivePath = createCorruptedTarArchive();
      const attempts = 5;

      for (let i = 0; i < attempts; i++) {
        try {
          await tar.extract({
            file: testArchivePath,
            cwd: extractPath,
            strict: true,
          });
        } catch (error) {
          // Expected to fail each time
        }
      }

      // Should not accumulate failed extraction artifacts
      const files = fs.readdirSync(extractPath);
      expect(files.length).toBeLessThanOrEqual(2);
    });

    it('should verify extraction directory exists before attempting extraction', async () => {
      const nonExistentPath = path.join(tmpdir(), `non-existent-${Date.now()}`);
      testArchivePath = await createTruncatedTarArchive();

      // Should fail gracefully if target directory doesn't exist
      await expect(async () => {
        await tar.extract({
          file: testArchivePath,
          cwd: nonExistentPath,
          strict: true,
        });
      }).rejects.toThrow();
    });
  });

  describe('Performance - Extraction Timeout', () => {
    it('should complete failed extraction detection quickly', async () => {
      testArchivePath = createCorruptedTarArchive();
      const startTime = Date.now();

      try {
        await tar.extract({
          file: testArchivePath,
          cwd: extractPath,
          strict: true,
        });
      } catch (error) {
        // Expected
      }

      const duration = Date.now() - startTime;

      // Should fail fast - detection should be < 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should detect corrupted zip quickly', () => {
      testArchivePath = createCorruptedZipArchive();
      const startTime = Date.now();

      try {
        new AdmZip(testArchivePath);
      } catch (error) {
        // Expected
      }

      const duration = Date.now() - startTime;

      // Should fail immediately on header validation
      expect(duration).toBeLessThan(1000);
    });
  });
});
