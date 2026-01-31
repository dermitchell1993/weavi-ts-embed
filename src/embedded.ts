/* eslint-disable no-sync */
import fs from 'fs';
import { get } from 'https';
import http from 'http';
import net from 'net';
import { spawn } from 'child_process';
import { dirname, basename } from 'path/posix';
import { homedir } from 'os';
import { join } from 'path';
import { extract } from 'tar';
import { createHash } from 'crypto';
import Unzipper from 'adm-zip';

const defaultBinaryPath = join(homedir(), '.cache/weaviate-embedded');
const defaultPersistenceDataPath = join(homedir(), '.local/share/weaviate');
const defaultVersion = 'latest';

export interface EmbeddedOptionsConfig {
  host?: string;
  port?: number;
  env?: object;
  version?: string;
  binaryUrl?: string;
}

export class EmbeddedOptions {
  binaryPath: string;
  persistenceDataPath: string;
  host: string;
  port: number;
  version?: string;
  binaryUrl?: string;
  env: NodeJS.ProcessEnv;

  constructor(cfg?: EmbeddedOptionsConfig) {
    if (cfg?.version && cfg?.binaryUrl) {
      throw new Error('cannot provide both version and binaryUrl');
    }
    this.host = cfg && cfg.host ? cfg.host : '127.0.0.1';
    this.port = cfg && cfg.port ? cfg.port : 6789;
    this.binaryUrl = cfg?.binaryUrl;
    this.version = this.parseVersion(cfg);
    this.binaryPath = this.getBinaryPath(cfg);
    this.persistenceDataPath = this.getPersistenceDataPath();
    this.env = this.parseEnv(cfg);
  }

  parseEnv(cfg?: EmbeddedOptionsConfig): NodeJS.ProcessEnv {
    if (!this.persistenceDataPath) {
      this.persistenceDataPath = this.getPersistenceDataPath();
    }

    const env: NodeJS.ProcessEnv = {
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true',
      QUERY_DEFAULTS_LIMIT: '20',
      PERSISTENCE_DATA_PATH: this.persistenceDataPath,
      CLUSTER_HOSTNAME: `Embedded_at_${this.port}`,
      DEFAULT_VECTORIZER_MODULE: 'none',
      ENABLE_MODULES:
        'text2vec-openai,text2vec-cohere,text2vec-huggingface,' +
        'ref2vec-centroid,generative-openai,qna-openai',
      // Disable Raft for embedded single-node mode to avoid bootstrap issues
      RAFT_ENABLE: 'false', // Disable Raft consensus for embedded mode
      // Any above defaults can be overridden with export env vars
      ...process.env,
    };

    if (cfg && cfg.env) {
      Object.entries(cfg.env).forEach(([key, value]) => {
        env[key] = value;
      });
    }
    return env;
  }

  parseVersion(cfg?: EmbeddedOptionsConfig): string | undefined {
    // Use binaryUrl instead
    if (cfg && cfg.binaryUrl) {
      return;
    }
    if (!cfg || !cfg.version) {
      return defaultVersion;
    }
    if (cfg.version == 'latest') {
      return 'latest';
    }

    // Improved regex that accepts:
    // - Major version: 1-9 with optional additional digits (e.g., 1, 2, 10, 23)
    // - Minor version: any digits including 0, 10, 20, etc. (e.g., 0, 5, 10, 20)
    // - Patch version: any digits (e.g., 0, 1, 15)
    // - Optional pre-release: -alpha.1, -beta.2, -rc.1, etc.
    // - Optional build metadata: +20230615, +build.123, etc.
    // Uses anchors (^ and $) to match the entire string, not substrings
    if (cfg.version.match(/^[1-9]\d*\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/)) {
      // Additional security check: reject path traversal attempts
      if (cfg.version.includes('..') || cfg.version.includes('/') || cfg.version.includes('\\')) {
        throw new Error(
          `invalid version: ${cfg.version}. version contains invalid characters (path traversal attempt detected)`
        );
      }
      return cfg.version;
    }
    throw new Error(
      `invalid version: ${cfg.version}. version must resemble '{major}.{minor}.{patch}, or 'latest'`
    );
  }

  getBinaryPath(cfg?: EmbeddedOptionsConfig): string {
    let binaryPath = process.env.XDG_CACHE_HOME;
    if (!binaryPath) {
      binaryPath = defaultBinaryPath;
    }
    if (!this.version) {
      this.version = this.parseVersion(cfg);
    }
    if (this.binaryUrl) {
      const hash = createHash('md5').update(this.binaryUrl).digest('base64url');
      return `${binaryPath}-${hash}`;
    }
    return `${binaryPath}-${this.version}`;
  }

  getPersistenceDataPath(): string {
    let persistenceDataPath = process.env.XDG_DATA_HOME;
    if (!persistenceDataPath) {
      persistenceDataPath = defaultPersistenceDataPath;
    }
    // Use unique persistence path per port to avoid test conflicts
    return `${persistenceDataPath}_${this.port}`;
  }
}

export class EmbeddedDB {
  options: EmbeddedOptions;
  pid: number;

  constructor(opt: EmbeddedOptions) {
    this.options = opt;
    this.pid = 0;
    this.ensurePathsExist();
    checkSupportedPlatform();
  }

  async start() {
    if (await this.isListening()) {
      console.log(`Embedded db already listening @ ${this.options.host}:${this.options.port}`);
    }

    await this.resolveWeaviateVersion().then(async () => {
      await this.ensureWeaviateBinaryExists();
    });

    if (!this.options.env.CLUSTER_GOSSIP_BIND_PORT) {
      this.options.env.CLUSTER_GOSSIP_BIND_PORT = await getRandomPort();
    }

    const childProc = spawn(
      this.options.binaryPath,
      ['--host', this.options.host, '--port', `${this.options.port}`, '--scheme', 'http'],
      { env: this.options.env }
    );

    childProc.on('error', (err) => {
      console.log(`embedded db failed to start: ${JSON.stringify(err)}`);
    });

    childProc.stdout.pipe(process.stdout);
    childProc.stderr.pipe(process.stderr);

    this.pid = childProc.pid as number;
    console.log(
      `Started ${this.options.binaryPath} @ ${this.options.host}:${this.options.port} -- process ID ${this.pid}`
    );

    await this.waitTillListening();
  }

  stop() {
    try {
      process.kill(this.pid, 'SIGTERM');
      console.log(`Embedded db @ PID ${this.pid} successfully stopped`);
    } catch (err) {
      console.log(`Tried to stop embedded db @ PID ${this.pid}.`, `PID not found, so nothing will be done`);
    }
  }

  private resolveWeaviateVersion(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.options.version == 'latest') {
        get(
          'https://api.github.com/repos/weaviate/weaviate/releases/latest',
          { headers: { 'User-Agent': 'Weaviate-Embedded-DB' } },
          (resp) => {
            let body = '';
            resp.on('data', (chunk: string) => {
              body += chunk;
            });
            resp.on('end', () => {
              if (resp.statusCode === 200) {
                try {
                  const json = JSON.parse(body);
                  this.options.version = (json.tag_name as string).slice(1); // trim the `v` prefix
                  resolve();
                } catch (err) {
                  reject(new Error(`failed to parse latest binary version response: ${JSON.stringify(err)}`));
                }
              } else {
                reject(
                  new Error(`fetch latest binary version, unexpected status code ${resp.statusCode}: ${body}`)
                );
              }
            });
          }
        ).on('error', (err) => {
          reject(new Error(`failed to find latest binary version: ${JSON.stringify(err)}`));
        });
      } else {
        resolve();
      }
    });
  }

  private async ensureWeaviateBinaryExists() {
    if (!fs.existsSync(`${this.options.binaryPath}`)) {
      console.log(
        `Binary ${this.options.binaryPath} does not exist.`,
        `Downloading binary for version ${this.options.version || this.options.binaryPath}`
      );
      await this.downloadBinary().then(async (downloadPath) => {
        if (downloadPath.endsWith('tgz')) {
          await this.untarBinary(downloadPath);
        } else {
          await this.unzipBinary(downloadPath);
        }
      });
    }
  }

  private ensurePathsExist() {
    const binPathDir = dirname(this.options.binaryPath);
    fs.mkdirSync(binPathDir, { recursive: true });
    fs.mkdirSync(this.options.persistenceDataPath, { recursive: true });
  }

  private downloadBinary(): Promise<string> {
    const url = this.buildBinaryUrl();

    let path: string;
    if (url.endsWith('.zip')) {
      path = `${this.options.binaryPath}.zip`;
    } else {
      path = `${this.options.binaryPath}.tgz`;
    }

    const file = fs.createWriteStream(path);
    return new Promise((resolve, reject) => {
      get(url, (resp) => {
        if (resp.statusCode == 200) {
          resp.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(path);
          });
        } else if (resp.statusCode == 302 && resp.headers.location) {
          get(resp.headers.location, (resp) => {
            resp.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve(path);
            });
          });
        } else if (resp.statusCode == 404) {
          reject(
            new Error(
              `failed to download binary: not found. ` +
                `are you sure Weaviate version ${this.options.version} exists? ` +
                `note that embedded db for linux is only supported for versions >= 1.18.0, ` +
                `and embedded db for mac is only supported for versions >= 1.19.8`
            )
          );
        } else {
          reject(new Error(`failed to download binary: unexpected status code: ${resp.statusCode}`));
        }
      }).on('error', (err) => {
        fs.unlinkSync(path);
        reject(new Error(`failed to download binary: ${err}`));
      });
    });
  }

  private buildBinaryUrl(): string {
    if (this.options.binaryUrl) {
      return this.options.binaryUrl;
    }
    let arch: string;
    switch (process.arch) {
      case 'arm64':
        arch = 'arm64';
        break;
      case 'x64':
        arch = 'amd64';
        break;
      default:
        throw new Error(`Embedded DB unsupported architecture: ${process.arch}`);
    }
    let ext = 'tar.gz';
    if (process.platform == 'darwin') {
      ext = 'zip';
      arch = 'all';
    }
    return (
      `https://github.com/weaviate/weaviate/releases/download/v${this.options.version}` +
      `/weaviate-v${this.options.version}-${process.platform}-${arch}.${ext}`
    );
  }

  private untarBinary(tarballPath: string): Promise<null> {
    const tarball = fs.createReadStream(tarballPath);
    return new Promise((resolve, reject) => {
      tarball.pipe(
        extract({
          cwd: dirname(tarballPath),
          strict: true,
        })
          .on('finish', () => {
            tarball.close();
            fs.unlinkSync(tarballPath);
            fs.renameSync(join(dirname(this.options.binaryPath), 'weaviate'), this.options.binaryPath);
            resolve(null);
          })
          .on('error', (err) => {
            if (this.options.binaryUrl) {
              reject(
                new Error(`failed to untar binary: ${err}, are you sure binaryUrl points to a tar file?`)
              );
            }
            reject(new Error(`failed to untar binary: ${JSON.stringify(err)}`));
          })
      );
    });
  }

  private unzipBinary(zipPath: string): Promise<null> {
    const zip = new Unzipper(zipPath);
    const entries = zip.getEntries();

    return new Promise((resolve, reject) => {
      entries.forEach((entry: Unzipper.IZipEntry) => {
        if (entry.entryName == 'weaviate') {
          zip.extractEntryTo(
            entry.entryName,
            dirname(this.options.binaryPath),
            false,
            true,
            false,
            basename(this.options.binaryPath)
          );
          fs.unlinkSync(zipPath);
          fs.chmodSync(this.options.binaryPath, 0o777);
          resolve(null);
        }
      });
      reject(new Error('failed to find binary in zip'));
    });
  }

  private waitTillListening(): Promise<null> {
    return new Promise((resolve, reject) => {
      // Configurable timeout with CI/test-aware defaults
      // CI: 30s, Production: 120s (configurable via WEAVIATE_STARTUP_TIMEOUT)
      const defaultTimeout = process.env.CI ? 30000 : 120000;
      const timeoutMs = parseInt(process.env.WEAVIATE_STARTUP_TIMEOUT || String(defaultTimeout), 10);
      const checkIntervalMs = process.env.CI ? 500 : 1000;
      console.log(`Waiting for Weaviate startup (timeout: ${timeoutMs}ms)...`);

      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        clearInterval(interval);
        reject(
          new Error(
            `failed to connect to embedded db @ ${this.options.host}:${this.options.port} within ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      const interval = setInterval(() => {
        this.isApiReady().then((ready) => {
          if (ready) {
            console.log('API is ready, checking system readiness...');
            // Additional check for readiness endpoint to ensure Raft leader election
            this.isSystemReady()
              .then((systemReady) => {
                if (systemReady) {
                  console.log('System is fully ready with Raft leader elected!');
                  clearTimeout(timeout);
                  clearInterval(interval);
                  resolve(null);
                } else {
                  console.log('API ready but system not fully ready yet...');
                }
              })
              .catch((err) => {
                console.log(`System readiness check failed: ${err.message}`);
                // Continue waiting if readiness check fails
              });
          }
        });
      }, checkIntervalMs);
    });
  }

  private isApiReady(): Promise<boolean> {
    return new Promise((resolve) => {
      const options = {
        hostname: this.options.host,
        port: this.options.port,
        path: '/v1/meta',
        method: 'GET',
        timeout: 2000,
      };

      const req = http.request(options, (res: any) => {
        if (res.statusCode === 200) {
          console.log('Weaviate API is ready!');
          resolve(true);
        } else {
          console.log(`Weaviate API not ready yet, status: ${res.statusCode}`);
          resolve(false);
        }
      });

      req.on('error', (err: any) => {
        console.log('Trying to connect to Weaviate API...', JSON.stringify(err));
        resolve(false);
      });

      req.on('timeout', () => {
        console.log('Weaviate API connection timeout');
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  private isSystemReady(): Promise<boolean> {
    return new Promise((resolve) => {
      const options = {
        hostname: this.options.host,
        port: this.options.port,
        path: '/v1/.well-known/ready',
        method: 'GET',
        timeout: 2000,
      };

      const req = http.request(options, (res: any) => {
        if (res.statusCode === 200) {
          console.log('✅ Weaviate system is ready (Raft leader elected)!');
          resolve(true);
        } else {
          console.log(`⏳ Weaviate system not ready yet, status: ${res.statusCode}`);
          resolve(false);
        }
      });

      req.on('error', (err: any) => {
        console.log('🔍 Checking Weaviate system readiness...', JSON.stringify(err));
        resolve(false);
      });

      req.on('timeout', () => {
        console.log('⏰ Weaviate system readiness check timeout');
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  // Diagnostic method to check cluster health and Raft status
  async getClusterHealth(): Promise<any> {
    try {
      const response = await this.makeHttpRequest('/v1/cluster/statistics');
      return response;
    } catch (err) {
      console.log('Cluster health check failed:', err);
      return null;
    }
  }

  private makeHttpRequest(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.options.host,
        port: this.options.port,
        path: path,
        method: 'GET',
        timeout: 5000,
      };

      const req = http.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (err: any) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  private isListening(): Promise<boolean> {
    const sock = net.connect(this.options.port, this.options.host);
    return new Promise((resolve) => {
      sock
        .on('connect', () => {
          console.log('connected to embedded db!');
          sock.destroy();
          resolve(true);
        })
        .on('error', (err) => {
          console.log('Trying to connect to embedded db...', JSON.stringify(err));
          sock.destroy();
          resolve(false);
        });
    });
  }
}

function checkSupportedPlatform() {
  const platform: string = process.platform;
  if (platform != 'linux' && platform != 'darwin') {
    throw new Error(`${platform} is not supported with EmbeddedDB`);
  }
}

function getRandomPort(): Promise<string> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo;
      if (port) {
        srv.close(() => resolve(port.toString()));
      } else {
        reject(new Error('failed to find open port'));
      }
    });
  });
}
