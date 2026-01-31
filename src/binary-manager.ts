/* eslint-disable no-sync */
/**
 * Binary Manager for Weaviate Embedded
 *
 * Handles downloading, caching, and verifying Weaviate binaries.
 * Extracted from embedded.ts as part of v3 migration Wave 1.
 *
 * @module binary-manager
 */

import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { createHash } from 'crypto';
import { dirname, join, basename } from 'path';
import { homedir } from 'os';
import Unzipper from 'adm-zip';
import { extract } from 'tar';
import { detectPlatform, getBinaryFilename, Platform } from './platform';
import { BinaryInfo } from './types';

/**
 * Configuration options for the BinaryManager
 */
export interface BinaryManagerOptions {
  /**
   * Weaviate version to download (e.g., '1.23.7', 'latest')
   */
  version?: string;

  /**
   * Custom binary URL (overrides version-based URL construction)
   */
  binaryUrl?: string;

  /**
   * Base cache directory for storing binaries
   * @default ~/.cache/weaviate-embedded or $XDG_CACHE_HOME/weaviate-embedded
   */
  cacheDir?: string;

  /**
   * Optional checksum for binary verification
   */
  checksum?: string;

  /**
   * Whether to skip checksum verification (use with caution)
   * @default false
   */
  skipChecksumVerification?: boolean;
}

/**
 * Manages Weaviate binary downloads, caching, and verification
 */
export class BinaryManager {
  private readonly options: Required<
    Pick<BinaryManagerOptions, 'version' | 'cacheDir' | 'skipChecksumVerification'>
  > &
    Pick<BinaryManagerOptions, 'binaryUrl' | 'checksum'>;
  private readonly platform: Platform;

  /**
   * Creates a new BinaryManager instance
   * @param options Configuration options
   * @throws Error if both version and binaryUrl are provided
   */
  constructor(options: BinaryManagerOptions = {}) {
    if (options.version && options.binaryUrl) {
      throw new Error('Cannot provide both version and binaryUrl');
    }

    this.platform = detectPlatform();

    // Set defaults
    const defaultCacheDir = process.env.XDG_CACHE_HOME || join(homedir(), '.cache/weaviate-embedded');

    this.options = {
      version: options.version || 'latest',
      binaryUrl: options.binaryUrl,
      cacheDir: options.cacheDir || defaultCacheDir,
      checksum: options.checksum,
      skipChecksumVerification: options.skipChecksumVerification || false,
    };
  }

  /**
   * Resolves the version to download, fetching 'latest' from GitHub if needed
   * @returns Promise that resolves to the version string
   */
  resolveVersion(): Promise<string> {
    if (this.options.version !== 'latest') {
      return Promise.resolve(this.options.version);
    }

    return new Promise<string>((resolve, reject) => {
      const url = 'https://api.github.com/repos/weaviate/weaviate/releases/latest';

      https
        .get(
          url,
          {
            headers: {
              'User-Agent': 'weaviate-ts-embedded',
            },
          },
          (resp) => {
            let body = '';
            resp.on('data', (chunk) => {
              body += chunk;
            });
            resp.on('end', () => {
              if (resp.statusCode !== 200) {
                reject(
                  new Error(
                    `Failed to fetch latest binary version, unexpected status code ${resp.statusCode}: ${body}`
                  )
                );
                return;
              }

              try {
                const parsed = JSON.parse(body);
                const version = parsed.tag_name?.replace(/^v/, '');
                if (!version) {
                  reject(new Error('Failed to parse version from GitHub API response'));
                  return;
                }
                resolve(version);
              } catch (err) {
                reject(new Error(`Failed to parse latest binary version response: ${JSON.stringify(err)}`));
              }
            });
          }
        )
        .on('error', (err) => {
          reject(new Error(`Failed to find latest binary version: ${JSON.stringify(err)}`));
        });
    });
  }

  /**
   * Constructs the download URL for the Weaviate binary
   * @param version The resolved version string
   * @returns Download URL string
   */
  constructDownloadURL(version: string): string {
    // If custom binary URL provided, use it
    if (this.options.binaryUrl) {
      return this.options.binaryUrl;
    }

    // Determine architecture string for URL
    let arch: string;
    switch (this.platform.arch) {
      case 'arm64':
        arch = 'arm64';
        break;
      case 'x64':
        arch = 'amd64';
        break;
      default:
        throw new Error(`Unsupported architecture: ${this.platform.arch}`);
    }

    // Determine file extension and architecture override for macOS
    let ext = 'tar.gz';
    if (this.platform.os === 'darwin') {
      ext = 'zip';
      arch = 'all'; // macOS uses universal binary
    }

    return (
      `https://github.com/weaviate/weaviate/releases/download/v${version}` +
      `/weaviate-v${version}-${this.platform.os}-${arch}.${ext}`
    );
  }

  /**
   * Downloads the binary from the specified URL
   * @param url Download URL
   * @param targetPath Path where the binary archive should be saved
   * @returns Promise that resolves to the download path
   */
  private downloadFromURL(url: string, targetPath: string): Promise<string> {
    const file = fs.createWriteStream(targetPath);

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;

      const handleResponse = (resp: http.IncomingMessage) => {
        if (resp.statusCode === 200) {
          resp.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(targetPath);
          });
        } else if (resp.statusCode === 302 && resp.headers.location) {
          // Handle redirects
          const redirectProtocol = resp.headers.location.startsWith('https:') ? https : http;
          redirectProtocol.get(resp.headers.location, (redirectResp) => {
            redirectResp.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve(targetPath);
            });
          });
        } else if (resp.statusCode === 404) {
          fs.unlinkSync(targetPath);
          reject(
            new Error(
              `Failed to download binary: not found. ` +
                `Are you sure Weaviate version ${this.options.version} exists? ` +
                `Note that embedded DB for Linux is only supported for versions >= 1.18.0, ` +
                `and embedded DB for macOS is only supported for versions >= 1.19.8`
            )
          );
        } else {
          fs.unlinkSync(targetPath);
          reject(new Error(`Failed to download binary: unexpected status code: ${resp.statusCode}`));
        }
      };

      protocol.get(url, handleResponse).on('error', (err) => {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
        reject(new Error(`Failed to download binary: ${err}`));
      });
    });
  }

  /**
   * Extracts a .tar.gz archive
   * @param tarballPath Path to the tarball
   * @param targetBinaryPath Final path where the binary should be placed
   */
  private untarBinary(tarballPath: string, targetBinaryPath: string): Promise<void> {
    const tarball = fs.createReadStream(tarballPath);

    return new Promise((resolve, reject) => {
      tarball
        .pipe(
          extract({
            cwd: dirname(tarballPath),
            strict: true,
          })
        )
        .on('finish', () => {
          tarball.close();
          fs.unlinkSync(tarballPath);

          // Rename extracted binary to target path
          const extractedPath = join(dirname(targetBinaryPath), 'weaviate');
          fs.renameSync(extractedPath, targetBinaryPath);
          fs.chmodSync(targetBinaryPath, 0o755);
          resolve();
        })
        .on('error', (err) => {
          if (this.options.binaryUrl) {
            reject(new Error(`Failed to untar binary: ${err}, are you sure binaryUrl points to a tar file?`));
          } else {
            reject(new Error(`Failed to untar binary: ${JSON.stringify(err)}`));
          }
        });
    });
  }

  /**
   * Extracts a .zip archive
   * @param zipPath Path to the zip file
   * @param targetBinaryPath Final path where the binary should be placed
   */
  private unzipBinary(zipPath: string, targetBinaryPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const zip = new Unzipper(zipPath);
        const entries = zip.getEntries();

        let found = false;
        entries.forEach((entry: Unzipper.IZipEntry) => {
          if (entry.entryName === 'weaviate') {
            zip.extractEntryTo(
              entry.entryName,
              dirname(targetBinaryPath),
              false,
              true,
              false,
              basename(targetBinaryPath)
            );
            found = true;
          }
        });

        fs.unlinkSync(zipPath);

        if (!found) {
          reject(new Error('Failed to find binary in zip'));
          return;
        }

        fs.chmodSync(targetBinaryPath, 0o755);
        resolve();
      } catch (err) {
        reject(new Error(`Failed to unzip binary: ${err}`));
      }
    });
  }

  /**
   * Downloads and extracts the binary
   * @param url Download URL
   * @param targetBinaryPath Final path for the binary
   */
  async downloadBinary(url: string, targetBinaryPath: string): Promise<void> {
    // Determine archive extension
    const archivePath = url.endsWith('.zip') ? `${targetBinaryPath}.zip` : `${targetBinaryPath}.tgz`;

    console.log(`Downloading Weaviate binary from: ${url}`);

    // Download the archive
    await this.downloadFromURL(url, archivePath);

    console.log(`Extracting binary to: ${targetBinaryPath}`);

    // Extract based on file type
    if (archivePath.endsWith('.zip')) {
      await this.unzipBinary(archivePath, targetBinaryPath);
    } else {
      await this.untarBinary(archivePath, targetBinaryPath);
    }
  }

  /**
   * Verifies the checksum of a downloaded binary
   * @param binaryPath Path to the binary file
   * @param expectedChecksum Expected checksum value
   * @param algorithm Hash algorithm to use (default: 'sha256')
   * @returns Promise that resolves to true if checksum matches
   */
  verifyChecksum(binaryPath: string, expectedChecksum: string, algorithm = 'sha256'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const hash = createHash(algorithm);
      const stream = fs.createReadStream(binaryPath);

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        const actualChecksum = hash.digest('hex');
        resolve(actualChecksum === expectedChecksum);
      });

      stream.on('error', (err) => {
        reject(new Error(`Failed to calculate checksum: ${err}`));
      });
    });
  }

  /**
   * Gets the path to the cached binary, downloading it if necessary
   * @returns Promise that resolves to BinaryInfo with the binary path and metadata
   */
  async getCachedBinary(): Promise<BinaryInfo> {
    // Resolve version
    const version = await this.resolveVersion();

    // Construct download URL
    const url = this.constructDownloadURL(version);

    // Determine cache path
    let binaryPath: string;
    if (this.options.binaryUrl) {
      // Use hash of custom URL for cache path
      const hash = createHash('md5').update(this.options.binaryUrl).digest('base64url');
      binaryPath = `${this.options.cacheDir}-${hash}`;
    } else {
      // Use version for cache path
      binaryPath = `${this.options.cacheDir}-${version}`;
    }

    // Check if binary already exists
    const exists = fs.existsSync(binaryPath);

    if (!exists) {
      // Ensure cache directory exists
      const cacheDir = dirname(binaryPath);
      fs.mkdirSync(cacheDir, { recursive: true });

      // Download and extract binary
      await this.downloadBinary(url, binaryPath);

      // Verify checksum if provided
      if (this.options.checksum && !this.options.skipChecksumVerification) {
        const isValid = await this.verifyChecksum(binaryPath, this.options.checksum);
        if (!isValid) {
          // Clean up invalid binary
          fs.unlinkSync(binaryPath);
          throw new Error('Binary checksum verification failed');
        }
      }
    }

    // Return binary info
    return {
      version,
      url,
      path: binaryPath,
      platform: this.platform.os,
      arch: this.platform.arch,
      checksum: this.options.checksum,
      exists: true, // Now it definitely exists
    };
  }

  /**
   * Gets the binary info without downloading (useful for checking cache)
   * @returns Promise that resolves to BinaryInfo
   */
  async getBinaryInfo(): Promise<BinaryInfo> {
    const version = await this.resolveVersion();
    const url = this.constructDownloadURL(version);

    let binaryPath: string;
    if (this.options.binaryUrl) {
      const hash = createHash('md5').update(this.options.binaryUrl).digest('base64url');
      binaryPath = `${this.options.cacheDir}-${hash}`;
    } else {
      binaryPath = `${this.options.cacheDir}-${version}`;
    }

    const exists = fs.existsSync(binaryPath);

    return {
      version,
      url,
      path: binaryPath,
      platform: this.platform.os,
      arch: this.platform.arch,
      checksum: this.options.checksum,
      exists,
    };
  }

  /**
   * Clears the binary cache for the current version/URL
   * @returns Promise that resolves when cache is cleared
   */
  async clearCache(): Promise<void> {
    const info = await this.getBinaryInfo();
    if (info.exists) {
      fs.unlinkSync(info.path);
    }
  }
}
