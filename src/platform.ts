/**
 * Platform detection and binary selection for Weaviate Embedded
 */

export interface Platform {
  os: 'darwin' | 'linux';
  arch: 'arm64' | 'x64';
}

/**
 * Detects the current platform (OS and architecture)
 * @returns Platform object with os and arch
 * @throws Error if platform is unsupported
 */
export function detectPlatform(): Platform {
  const os = process.platform;
  const arch = process.arch;

  // Windows is not supported by Weaviate Embedded
  if (os === 'win32') {
    throw new Error('Weaviate Embedded is not supported on Windows');
  }

  // Only darwin (macOS) and linux are supported
  if (os !== 'darwin' && os !== 'linux') {
    throw new Error(`Unsupported OS: ${os}. Only macOS (darwin) and Linux are supported.`);
  }

  // Only arm64 and x64 architectures are supported
  if (arch !== 'arm64' && arch !== 'x64') {
    throw new Error(`Unsupported architecture: ${arch}. Only arm64 and x64 are supported.`);
  }

  return { os, arch };
}

/**
 * Generates the binary filename for a specific version and platform
 * @param version Weaviate version (e.g., "1.23.0")
 * @param platform Platform object from detectPlatform()
 * @returns Binary filename string
 */
export function getBinaryFilename(version: string, platform: Platform): string {
  return `weaviate-${version}-${platform.os}-${platform.arch}`;
}
