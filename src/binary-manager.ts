/* eslint-disable no-sync */
import fs from 'fs';
import { get } from 'https';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { extract } from 'tar';
import Unzipper from 'adm-zip';

const DEFAULT_CACHE_DIR = join(homedir(), '.cache/weaviate-embedded');

/**
 * Configuration options for the BinaryManager.
 *
 * @example
 * ```typescript
 * const manager = new BinaryManager({
 *   cacheDir: '/custom/cache/path',
 *   skipChecksumVerification: false
 * });
 * ```
 */
export interface BinaryManagerOptions {
  /**
   * Directory path where Weaviate binaries will be cached.
   *
   * **Default behavior:** Uses `XDG_CACHE_HOME` environment variable if set,
   * otherwise falls back to `~/.cache/weaviate-embedded`
   *
   * @default process.env.XDG_CACHE_HOME || '~/.cache/weaviate-embedded'
   * @example '/usr/local/cache/weaviate'
   */
  cacheDir?: string;

  /**
   * Skip SHA256 checksum verification when downloading binaries.
   *
   * **Security Warning:** Disabling checksum verification removes protection
   * against corrupted downloads and potential security threats. Only disable
   * for trusted custom binary URLs.
   *
   * @default false
   */
  skipChecksumVerification?: boolean;
}

/**
 * Manages downloading, caching, and verification of Weaviate binaries.
 *
 * The BinaryManager handles the complete lifecycle of Weaviate binary management:
 * - Platform and architecture detection
 * - Binary downloading from GitHub releases
 * - SHA256 checksum verification for security
 * - Binary caching to avoid redundant downloads
 * - Archive extraction (tar.gz and zip formats)
 *
 * @example
 * ```typescript
 * const manager = new BinaryManager({
 *   cacheDir: './weaviate-cache',
 *   skipChecksumVerification: false
 * });
 *
 * const binaryPath = await manager.ensureBinary('1.27.0');
 * console.log(`Binary ready at: ${binaryPath}`);
 * ```
 */
export class BinaryManager {
  private readonly cacheDir: string;
  private readonly skipChecksumVerification: boolean;

  /**
   * Create a new BinaryManager instance.
   *
   * @param options Configuration options for binary management
   *
   * @example
   * ```typescript
   * // Use defaults (recommended)
   * const manager = new BinaryManager();
   *
   * // Custom cache directory
   * const manager = new BinaryManager({
   *   cacheDir: '/opt/weaviate-cache'
   * });
   *
   * // Skip checksum verification (not recommended for production)
   * const manager = new BinaryManager({
   *   skipChecksumVerification: true
   * });
   * ```
   */
  constructor(options: BinaryManagerOptions = {}) {
    this.cacheDir = options.cacheDir || process.env.XDG_CACHE_HOME || DEFAULT_CACHE_DIR;
    this.skipChecksumVerification = options.skipChecksumVerification || false;
  }

  /**
   * Ensures the binary exists for the specified version or URL.
   *
   * This method will:
   * 1. Check if the binary already exists in the cache
   * 2. Download the binary if not cached
   * 3. Verify SHA256 checksum (unless disabled or using custom URL)
   * 4. Extract the binary from the archive
   * 5. Make the binary executable
   *
   * @param version Weaviate version (e.g., '1.27.0' or 'latest')
   * @param binaryUrl Optional custom binary URL (overrides version-based URL)
   * @returns Promise resolving to the absolute path of the binary
   * @throws Error if download fails
   * @throws Error if checksum verification fails
   * @throws Error if extraction fails
   *
   * @example
   * ```typescript
   * const manager = new BinaryManager();
   *
   * // Download specific version
   * const path = await manager.ensureBinary('1.27.0');
   * console.log(`Binary at: ${path}`);
   *
   * // Use latest version
   * const latestPath = await manager.ensureBinary('latest');
   *
   * // Use custom binary URL
   * const customPath = await manager.ensureBinary(
   *   '1.27.0',
   *   'https://example.com/custom-weaviate-binary.tar.gz'
   * );
   * ```
   */
  async ensureBinary(version: string, binaryUrl?: string): Promise<string> {
    const binaryPath = this.getBinaryPath(version, binaryUrl);

    if (await this.binaryExists(binaryPath)) {
      console.log(`Binary already exists at ${binaryPath}`);
      return binaryPath;
    }

    console.log(`Binary not found. Downloading version ${version}...`);
    const url = binaryUrl || this.getBinaryUrl(version);
    const downloadPath = await this.downloadBinary(url, binaryPath);

    if (!this.skipChecksumVerification && !binaryUrl) {
      await this.verifyChecksum(downloadPath, version);
    }

    await this.extractBinary(downloadPath, binaryPath);
    await this.makeExecutable(binaryPath);

    console.log(`Binary ready at ${binaryPath}`);
    return binaryPath;
  }

  /**
   * Gets the binary path for a specific version or URL
   */
  private getBinaryPath(version: string, binaryUrl?: string): string {
    if (binaryUrl) {
      const hash = createHash('md5').update(binaryUrl).digest('base64url');
      return join(this.cacheDir, `weaviate-${hash}`);
    }
    return join(this.cacheDir, version, 'weaviate');
  }

  /**
   * Checks if binary exists and is executable
   */
  private async binaryExists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Constructs the GitHub release URL for a given version
   */
  private getBinaryUrl(version: string): string {
    const arch = this.getArchitecture();
    const platform = process.platform;
    const ext = platform === 'darwin' ? 'zip' : 'tar.gz';

    return (
      `https://github.com/weaviate/weaviate/releases/download/v${version}` +
      `/weaviate-v${version}-${platform}-${arch}.${ext}`
    );
  }

  /**
   * Gets the checksums URL for a given version
   */
  private getChecksumsUrl(version: string): string {
    return `https://github.com/weaviate/weaviate/releases/download/v${version}/weaviate-v${version}-checksums.txt`;
  }

  /**
   * Determines the architecture string for the binary
   */
  private getArchitecture(): string {
    if (process.platform === 'darwin') {
      return 'all';
    }

    switch (process.arch) {
      case 'arm64':
        return 'arm64';
      case 'x64':
        return 'amd64';
      default:
        throw new Error(`Unsupported architecture: ${process.arch}`);
    }
  }

  /**
   * Downloads a binary from the given URL
   */
  private downloadBinary(url: string, binaryPath: string): Promise<string> {
    const downloadDir = dirname(binaryPath);
    fs.mkdirSync(downloadDir, { recursive: true });

    const ext = url.endsWith('.zip') ? '.zip' : '.tgz';
    const downloadPath = `${binaryPath}${ext}`;
    const file = fs.createWriteStream(downloadPath);

    return new Promise((resolve, reject) => {
      console.log(`Downloading from ${url}...`);

      get(url, (resp) => {
        if (resp.statusCode === 200) {
          resp.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(downloadPath);
          });
        } else if (resp.statusCode === 302 && resp.headers.location) {
          // Handle redirect
          get(resp.headers.location, (resp) => {
            resp.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve(downloadPath);
            });
          }).on('error', (err) => {
            fs.unlinkSync(downloadPath);
            reject(new Error(`Failed to download binary (redirect): ${err.message}`));
          });
        } else if (resp.statusCode === 404) {
          file.close();
          fs.unlinkSync(downloadPath);
          reject(
            new Error(
              `Binary not found (404). Please verify the version exists. ` +
                `Note: Linux support requires version >= 1.18.0, macOS requires >= 1.19.8`
            )
          );
        } else {
          file.close();
          fs.unlinkSync(downloadPath);
          reject(new Error(`Failed to download binary: HTTP ${resp.statusCode}`));
        }
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(downloadPath)) {
          fs.unlinkSync(downloadPath);
        }
        reject(new Error(`Network error: ${err.message}`));
      });
    });
  }

  /**
   * Verifies the SHA256 checksum of the downloaded binary
   */
  private async verifyChecksum(downloadPath: string, version: string): Promise<void> {
    const checksumsUrl = this.getChecksumsUrl(version);
    const checksums = await this.downloadChecksums(checksumsUrl);

    const filename = basename(downloadPath);
    const expectedChecksum = this.extractChecksum(checksums, filename);

    if (!expectedChecksum) {
      throw new Error(`No checksum found for ${filename} in checksums file`);
    }

    const actualChecksum = await this.calculateSHA256(downloadPath);

    if (actualChecksum !== expectedChecksum) {
      fs.unlinkSync(downloadPath);
      throw new Error(
        `Checksum verification failed!\n` +
          `Expected: ${expectedChecksum}\n` +
          `Actual: ${actualChecksum}\n` +
          `This may indicate a corrupted download or potential security issue.`
      );
    }

    console.log(`✓ Checksum verified successfully`);
  }

  /**
   * Downloads the checksums file
   */
  private downloadChecksums(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      get(url, (resp) => {
        if (resp.statusCode === 200) {
          let body = '';
          resp.on('data', (chunk: string) => {
            body += chunk;
          });
          resp.on('end', () => {
            resolve(body);
          });
        } else if (resp.statusCode === 302 && resp.headers.location) {
          // Handle redirect
          get(resp.headers.location, (resp) => {
            let body = '';
            resp.on('data', (chunk: string) => {
              body += chunk;
            });
            resp.on('end', () => {
              resolve(body);
            });
          }).on('error', (err) => {
            reject(new Error(`Failed to download checksums (redirect): ${err.message}`));
          });
        } else {
          reject(new Error(`Failed to download checksums: HTTP ${resp.statusCode}`));
        }
      }).on('error', (err) => {
        reject(new Error(`Failed to download checksums: ${err.message}`));
      });
    });
  }

  /**
   * Extracts the checksum for a specific file from the checksums text
   */
  private extractChecksum(checksumsText: string, filename: string): string | null {
    const lines = checksumsText.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[1] === filename) {
        return parts[0];
      }
    }
    return null;
  }

  /**
   * Calculates the SHA256 hash of a file
   */
  private calculateSHA256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => {
        hash.update(data);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (err) => {
        reject(new Error(`Failed to calculate checksum: ${err.message}`));
      });
    });
  }

  /**
   * Extracts the binary from the downloaded archive
   */
  private async extractBinary(downloadPath: string, binaryPath: string): Promise<void> {
    if (downloadPath.endsWith('.zip')) {
      await this.unzipBinary(downloadPath, binaryPath);
    } else {
      await this.untarBinary(downloadPath, binaryPath);
    }
  }

  /**
   * Extracts binary from tarball
   */
  private untarBinary(tarballPath: string, binaryPath: string): Promise<void> {
    const tarball = fs.createReadStream(tarballPath);
    const extractDir = dirname(tarballPath);

    return new Promise((resolve, reject) => {
      tarball.pipe(
        extract({
          cwd: extractDir,
          strict: true,
        })
          .on('finish', () => {
            tarball.close();
            fs.unlinkSync(tarballPath);

            const extractedPath = join(extractDir, 'weaviate');
            if (fs.existsSync(extractedPath)) {
              fs.renameSync(extractedPath, binaryPath);
              resolve();
            } else {
              reject(new Error('Binary not found in tarball'));
            }
          })
          .on('error', (err) => {
            tarball.close();
            reject(new Error(`Failed to extract tarball: ${err.message}`));
          })
      );
    });
  }

  /**
   * Extracts binary from zip file
   */
  private unzipBinary(zipPath: string, binaryPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const zip = new Unzipper(zipPath);
        const entries = zip.getEntries();

        let found = false;
        entries.forEach((entry: Unzipper.IZipEntry) => {
          if (entry.entryName === 'weaviate') {
            zip.extractEntryTo(
              entry.entryName,
              dirname(binaryPath),
              false,
              true,
              false,
              basename(binaryPath)
            );
            found = true;
          }
        });

        fs.unlinkSync(zipPath);

        if (found) {
          resolve();
        } else {
          reject(new Error('Binary not found in zip file'));
        }
      } catch (err) {
        reject(new Error(`Failed to extract zip: ${err}`));
      }
    });
  }

  /**
   * Makes the binary executable (chmod 755)
   */
  private async makeExecutable(binaryPath: string): Promise<void> {
    await fs.promises.chmod(binaryPath, 0o755);
    console.log(`✓ Binary made executable`);
  }
}
