export interface Platform {
  os: 'darwin' | 'linux';
  arch: 'arm64' | 'x64';
}

export function detectPlatform(): Platform {
  const os = process.platform;
  const arch = process.arch;

  if (os === 'win32') {
    throw new Error('Weaviate Embedded is not supported on Windows');
  }

  if (os !== 'darwin' && os !== 'linux') {
    throw new Error(`Unsupported OS: ${os}`);
  }

  if (arch !== 'arm64' && arch !== 'x64') {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  return { os, arch };
}

export function getBinaryFilename(version: string, platform: Platform): string {
  return `weaviate-${version}-${platform.os}-${platform.arch}`;
}
