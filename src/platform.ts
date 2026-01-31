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
 *
 * @param version Weaviate version (e.g., "1.23.0", "latest")
 * @param platform Platform object from detectPlatform()
 * @returns Binary filename string (e.g., "weaviate-1.23.0-linux-x64")
 *
 * @remarks
 * **Input Validation:** This function does NOT validate the version parameter.
 * Input validation is the responsibility of the caller (typically EmbeddedOptions.parseVersion()).
 *
 * The function will accept and use any string as the version, including:
 * - Empty strings → produces "weaviate--linux-x64"
 * - Strings with spaces → produces "weaviate-1.0.0 latest-linux-x64"
 * - Path traversal chars → produces "weaviate-../1.0.0-linux-x64"
 *
 * **Validation Location:** The EmbeddedOptions class validates version format using a regex
 * pattern before passing it to this function. This ensures only valid semantic versions
 * or "latest" are used in production code.
 *
 * @example
 * ```typescript
 * // Valid usage (after validation)
 * const platform = detectPlatform();
 * const filename = getBinaryFilename("1.23.0", platform);
 * // Returns: "weaviate-1.23.0-darwin-arm64"
 * ```
 */
export function getBinaryFilename(version: string, platform: Platform): string {
  return `weaviate-${version}-${platform.os}-${platform.arch}`;
}
