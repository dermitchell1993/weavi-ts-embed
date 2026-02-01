/**
 * Security Archive Generators for Archive Bomb Protection Tests
 *
 * This module provides utilities to generate malicious archives for security testing.
 * These archives simulate real-world attack vectors including:
 * - Zip bombs (excessive nesting)
 * - Decompression bombs (extreme compression ratios)
 * - Path traversal attacks
 * - Symlink attacks
 *
 * @module tests/helpers/securityArchives
 */

import AdmZip from 'adm-zip';
import { Buffer } from 'buffer';

/**
 * Security test configuration thresholds
 * These values define the recommended limits for archive processing
 */
export const SECURITY_THRESHOLDS = {
  /** Maximum nesting depth allowed in archives (prevents zip bombs) */
  MAX_NESTING_DEPTH: 100,

  /** Maximum compression ratio allowed (compressed:uncompressed) */
  MAX_COMPRESSION_RATIO: 100,

  /** Maximum total uncompressed size in bytes (1GB) */
  MAX_UNCOMPRESSED_SIZE: 1024 * 1024 * 1024,

  /** Maximum path length to prevent filesystem issues */
  MAX_PATH_LENGTH: 4096,
} as const;

/**
 * Creates a zip bomb with excessive nesting depth
 *
 * A zip bomb (also known as a decompression bomb) is a malicious archive that,
 * when extracted, produces an enormous amount of data designed to crash or render
 * useless the system reading it.
 *
 * This implementation creates nested archives: zip1 contains zip2, zip2 contains zip3, etc.
 *
 * @param depth - Number of nested levels to create (e.g., 1000 for severe attack)
 * @returns Buffer containing the malicious zip archive
 *
 * @example
 * ```typescript
 * const zipBomb = createNestedZip(1000);
 * // This will create 1000 levels of nested zips
 * ```
 */
export function createNestedZip(depth: number): Buffer {
  let currentZip = new AdmZip();

  // Create innermost file
  currentZip.addFile('innocent.txt', Buffer.from('This is a harmless file'));

  // Build nested structure from inside out
  for (let i = depth - 1; i >= 0; i--) {
    const parentZip = new AdmZip();
    const zipBuffer = currentZip.toBuffer();
    parentZip.addFile(`level${i}.zip`, zipBuffer);
    currentZip = parentZip;
  }

  return currentZip.toBuffer();
}

/**
 * Creates an archive with an extreme compression ratio
 *
 * Decompression bombs exploit highly compressible data (like repeated zeros)
 * to create a small archive that expands to an enormous size when extracted.
 *
 * Classic example: 42.zip is 42KB but expands to 4.5PB
 *
 * @param compressedSizeKB - Approximate compressed size in KB
 * @param expansionRatio - How many times larger the uncompressed data will be
 * @returns Buffer containing the compressed bomb archive
 *
 * @example
 * ```typescript
 * // Creates ~10KB archive that expands to ~10MB (1000:1 ratio)
 * const bomb = createCompressionBomb(10, 1000);
 * ```
 */
export function createCompressionBomb(compressedSizeKB = 10, expansionRatio = 1000): Buffer {
  const zip = new AdmZip();

  // Create highly compressible data (repeated pattern)
  // This compresses extremely well due to repetition
  const uncompressedSizeKB = compressedSizeKB * expansionRatio;
  const pattern = Buffer.alloc(1024, 0); // 1KB of zeros

  // Add multiple files with repeated data
  const filesCount = 10;
  const bytesPerFile = (uncompressedSizeKB * 1024) / filesCount;

  for (let i = 0; i < filesCount; i++) {
    const chunks: Buffer[] = [];
    let remainingBytes = bytesPerFile;

    while (remainingBytes > 0) {
      const chunkSize = Math.min(remainingBytes, pattern.length);
      chunks.push(pattern.subarray(0, chunkSize));
      remainingBytes -= chunkSize;
    }

    const fileData = Buffer.concat(chunks);
    zip.addFile(`bomb_file_${i}.dat`, fileData);
  }

  return zip.toBuffer();
}

/**
 * Creates an archive with path traversal attempts
 *
 * Path traversal (also known as directory traversal) is a security vulnerability
 * that allows an attacker to access files outside the intended directory by using
 * relative path sequences like `../`
 *
 * @param paths - Array of malicious paths to include in the archive
 * @returns Buffer containing the archive with path traversal attempts
 *
 * @example
 * ```typescript
 * const maliciousArchive = createArchiveWithPathTraversal([
 *   '../../etc/passwd',
 *   '../../../root/.ssh/id_rsa',
 *   '../../../../usr/bin/malicious'
 * ]);
 * ```
 */
export function createArchiveWithPathTraversal(paths: string[]): Buffer {
  const zip = new AdmZip();

  paths.forEach((path, index) => {
    const content = `Malicious content for ${path}`;
    zip.addFile(path, Buffer.from(content));
  });

  return zip.toBuffer();
}

/**
 * Creates a tar.gz archive with path traversal attempts
 *
 * Similar to zip path traversal but for tar archives.
 * Tar archives are particularly vulnerable because they were designed for Unix
 * systems where absolute and relative paths have significant meaning.
 *
 * NOTE: This is a simplified implementation that uses ZIP format for testing.
 * Real tar.gz creation would require more complex stream handling.
 * The security validation logic should work the same for both formats.
 *
 * @param paths - Array of malicious paths
 * @returns Promise resolving to Buffer with malicious archive
 */
export function createTarWithPathTraversal(paths: string[]): Buffer {
  // For testing purposes, we use ZIP format with .tar.gz naming
  // This tests the path validation logic which should be format-agnostic
  return createArchiveWithPathTraversal(paths);
}

/**
 * Creates an archive containing malicious symlinks
 *
 * Symlink attacks exploit symbolic links in archives to:
 * 1. Overwrite system files by linking to sensitive locations
 * 2. Create infinite loops through circular symlinks
 * 3. Escape extraction directory by linking outside it
 *
 * @param links - Array of symlink definitions {link: name, target: destination}
 * @returns Buffer containing archive with malicious symlinks
 *
 * @example
 * ```typescript
 * const symlinkArchive = createArchiveWithSymlinks([
 *   { link: 'innocent.txt', target: '/etc/passwd' },
 *   { link: 'backup.txt', target: '/etc/shadow' }
 * ]);
 * ```
 */
export function createArchiveWithSymlinks(links: Array<{ link: string; target: string }>): Buffer {
  const zip = new AdmZip();

  links.forEach(({ link, target }) => {
    // In ZIP format, symlinks are represented as files with special attributes
    // For testing purposes, we create files that would be interpreted as symlinks
    const symlinkData = Buffer.from(target);
    zip.addFile(link, symlinkData);

    // Note: Real symlink support in ZIP requires specific entry attributes
    // This is a simplified version for testing path validation logic
  });

  return zip.toBuffer();
}

/**
 * Creates an archive with extremely long file paths
 *
 * Tests handling of edge cases where path lengths exceed filesystem limits.
 * Most filesystems have limits (e.g., 255 chars for filenames, 4096 for full paths)
 *
 * @param pathLength - Length of the path to generate
 * @returns Buffer containing archive with long paths
 */
export function createArchiveWithLongPaths(pathLength = 5000): Buffer {
  const zip = new AdmZip();

  // Create deeply nested directory structure
  const dirDepth = Math.floor(pathLength / 50); // 50 chars per directory level
  const pathComponents: string[] = [];

  for (let i = 0; i < dirDepth; i++) {
    pathComponents.push(`very_long_directory_name_number_${i}_`.padEnd(45, 'x'));
  }

  const longPath = pathComponents.join('/') + '/final_file.txt';
  zip.addFile(longPath, Buffer.from('Content in deeply nested file'));

  return zip.toBuffer();
}

/**
 * Creates a corrupted archive with invalid header/structure
 *
 * Tests resilience against malformed archives that could:
 * - Cause parser crashes
 * - Trigger infinite loops
 * - Exploit buffer overflows
 *
 * @param type - Type of corruption ('header' | 'crc' | 'truncated')
 * @returns Buffer containing corrupted archive
 */
export function createCorruptedArchive(type: 'header' | 'crc' | 'truncated' = 'header'): Buffer {
  const zip = new AdmZip();
  zip.addFile('normal.txt', Buffer.from('Normal content'));

  let buffer = zip.toBuffer();

  switch (type) {
    case 'header':
      // Corrupt the ZIP header magic bytes
      buffer[0] = 0xff;
      buffer[1] = 0xff;
      break;

    case 'crc':
      // Corrupt CRC checksum (bytes 14-17 in local file header)
      if (buffer.length > 20) {
        buffer[14] = 0xff;
        buffer[15] = 0xff;
      }
      break;

    case 'truncated':
      // Truncate the archive mid-stream
      buffer = buffer.subarray(0, Math.floor(buffer.length / 2));
      break;
  }

  return buffer;
}

/**
 * Creates an archive with null bytes in filenames
 *
 * Tests handling of filenames containing null bytes which could:
 * - Cause string truncation vulnerabilities
 * - Bypass security checks that use C-style strings
 *
 * @returns Buffer containing archive with null-byte filenames
 */
export function createArchiveWithNullBytes(): Buffer {
  const zip = new AdmZip();

  // Filename with null byte (would terminate early in C-style string handling)
  const maliciousName = 'innocent.txt\x00../../etc/passwd';
  zip.addFile(maliciousName, Buffer.from('Malicious content'));

  return zip.toBuffer();
}

/**
 * Creates an archive that combines multiple attack vectors
 *
 * Real-world attacks often combine multiple techniques to evade detection.
 * This creates an archive with multiple simultaneous vulnerabilities.
 *
 * @returns Buffer containing archive with combined attacks
 */
export function createCombinedAttackArchive(): Buffer {
  const zip = new AdmZip();

  // Attack 1: Path traversal
  zip.addFile('../../etc/malicious', Buffer.from('Path traversal'));

  // Attack 2: Extremely long path
  const longPath = 'a/'.repeat(1000) + 'deep.txt';
  zip.addFile(longPath, Buffer.from('Deep nesting'));

  // Attack 3: Null byte injection
  zip.addFile('safe.txt\x00../../../danger', Buffer.from('Null byte'));

  // Attack 4: Large decompression (smaller version)
  const largeData = Buffer.alloc(1024 * 1024, 0); // 1MB of zeros (compresses well)
  zip.addFile('bomb.dat', largeData);

  return zip.toBuffer();
}

/**
 * Creates a legitimate archive for baseline testing
 *
 * Used as a control to ensure security checks don't produce false positives
 * on normal, safe archives.
 *
 * @returns Buffer containing safe, legitimate archive
 */
export function createLegitimateArchive(): Buffer {
  const zip = new AdmZip();

  zip.addFile('README.md', Buffer.from('# Welcome\nThis is a safe file'));
  zip.addFile('src/main.ts', Buffer.from('console.log("Hello World");'));
  zip.addFile('package.json', Buffer.from('{"name": "safe-package", "version": "1.0.0"}'));

  return zip.toBuffer();
}
