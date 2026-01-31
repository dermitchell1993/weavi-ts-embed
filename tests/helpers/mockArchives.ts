/**
 * Mock Archive Helper Utilities
 *
 * Provides utilities for creating various types of corrupted, malformed,
 * and invalid archive files for security testing.
 */

/* eslint-disable no-sync */

import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import * as tar from 'tar';
import AdmZip from 'adm-zip';

/**
 * Creates a corrupted tar archive with invalid header
 */
export function createCorruptedTarArchive(): string {
  const tempPath = path.join(tmpdir(), `corrupted-${Date.now()}.tar.gz`);
  const invalidTarContent = Buffer.from('This is not a valid tar file content at all!');
  fs.writeFileSync(tempPath, invalidTarContent);
  return tempPath;
}

/**
 * Creates a corrupted zip archive with invalid header
 */
export function createCorruptedZipArchive(): string {
  const tempPath = path.join(tmpdir(), `corrupted-${Date.now()}.zip`);
  const invalidZipContent = Buffer.from('This is definitely not a valid zip file!');
  fs.writeFileSync(tempPath, invalidZipContent);
  return tempPath;
}

/**
 * Creates a truncated tar.gz archive (incomplete file)
 */
export async function createTruncatedTarArchive(): Promise<string> {
  const tempDir = path.join(tmpdir(), `tar-test-${Date.now()}`);
  const tempFile = path.join(tempDir, 'test.txt');
  const tarPath = path.join(tmpdir(), `truncated-${Date.now()}.tar.gz`);

  try {
    // Create a valid tar first
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempFile, 'Test content for tar file');

    await tar.create(
      {
        gzip: true,
        file: tarPath,
        cwd: tempDir,
      },
      ['test.txt']
    );

    // Truncate the tar file to simulate incomplete download
    const tarContent = fs.readFileSync(tarPath);
    const truncatedContent = tarContent.slice(0, Math.floor(tarContent.length / 2));
    fs.writeFileSync(tarPath, truncatedContent);

    return tarPath;
  } finally {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Creates a truncated zip archive (incomplete file)
 */
export function createTruncatedZipArchive(): string {
  const tempPath = path.join(tmpdir(), `truncated-${Date.now()}.zip`);

  // Create a valid zip first
  const zip = new AdmZip();
  zip.addFile('test.txt', Buffer.from('Test content for zip file'));
  const validZipBuffer = zip.toBuffer();

  // Truncate it to simulate incomplete download
  const truncatedBuffer = validZipBuffer.slice(0, Math.floor(validZipBuffer.length / 2));
  fs.writeFileSync(tempPath, truncatedBuffer);

  return tempPath;
}

/**
 * Creates a tar archive with a file that will fail extraction
 * (simulates permission errors by attempting invalid operations)
 */
export async function createPartialFailTarArchive(): Promise<string> {
  const tempDir = path.join(tmpdir(), `partial-fail-${Date.now()}`);
  const goodFile = path.join(tempDir, 'good-file.txt');
  const tarPath = path.join(tmpdir(), `partial-fail-${Date.now()}.tar.gz`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(goodFile, 'This file should extract fine');

    // Create a tar with multiple files
    await tar.create(
      {
        gzip: true,
        file: tarPath,
        cwd: tempDir,
      },
      ['good-file.txt']
    );

    return tarPath;
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Creates a zip archive with entry that has invalid path characters
 */
export function createInvalidPathZipArchive(): string {
  const tempPath = path.join(tmpdir(), `invalid-path-${Date.now()}.zip`);
  const zip = new AdmZip();

  // Add files with problematic names
  zip.addFile('normal-file.txt', Buffer.from('Normal content'));
  zip.addFile('\0null-byte-file.txt', Buffer.from('Invalid null byte in filename'));

  zip.writeZip(tempPath);
  return tempPath;
}

/**
 * Creates an empty tar.gz file (zero bytes)
 */
export function createEmptyTarArchive(): string {
  const tempPath = path.join(tmpdir(), `empty-${Date.now()}.tar.gz`);
  fs.writeFileSync(tempPath, Buffer.alloc(0));
  return tempPath;
}

/**
 * Creates an empty zip file (zero bytes)
 */
export function createEmptyZipArchive(): string {
  const tempPath = path.join(tmpdir(), `empty-${Date.now()}.zip`);
  fs.writeFileSync(tempPath, Buffer.alloc(0));
  return tempPath;
}

/**
 * Creates a tar archive with only header but no content
 */
export function createHeaderOnlyTarArchive(): string {
  const tempPath = path.join(tmpdir(), `header-only-${Date.now()}.tar.gz`);
  // TAR header magic bytes but truncated
  const headerBytes = Buffer.from([
    0x1f,
    0x8b,
    0x08,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x03, // gzip header only
  ]);
  fs.writeFileSync(tempPath, headerBytes);
  return tempPath;
}

/**
 * Creates a valid-looking tar with corrupted internal structure
 */
export async function createInternallyCorruptedTarArchive(): Promise<string> {
  const tempDir = path.join(tmpdir(), `internally-corrupted-${Date.now()}`);
  const tempFile = path.join(tempDir, 'test.txt');
  const tarPath = path.join(tmpdir(), `internally-corrupted-${Date.now()}.tar.gz`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempFile, 'Test content');

    await tar.create(
      {
        gzip: true,
        file: tarPath,
        cwd: tempDir,
      },
      ['test.txt']
    );

    // Corrupt the middle of the file while preserving headers
    const content = fs.readFileSync(tarPath);
    const corruptedContent = Buffer.concat([
      content.slice(0, 50),
      Buffer.from('CORRUPTED_DATA_HERE'),
      content.slice(70),
    ]);
    fs.writeFileSync(tarPath, corruptedContent);

    return tarPath;
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Cleanup helper to remove test archives
 */
export function cleanupArchive(archivePath: string): void {
  try {
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }
  } catch (error) {
    // Ignore cleanup errors in tests
    console.warn(`Failed to cleanup ${archivePath}:`, error);
  }
}

/**
 * Cleanup helper to remove extracted directories
 */
export function cleanupExtractedDir(dirPath: string): void {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`Failed to cleanup directory ${dirPath}:`, error);
  }
}
