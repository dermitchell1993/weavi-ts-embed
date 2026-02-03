/**
 * Test mocking utilities for network, filesystem, and process operations
 */

import { vi } from 'vitest';
import { promises as fs } from 'fs';
import { Readable } from 'stream';

/**
 * Network mocking utilities
 */
export class NetworkMocks {
  static mockHttpResponse(status = 200, data: any = {}, headers: Record<string, string> = {}) {
    return {
      status,
      data,
      headers: { 'content-type': 'application/json', ...headers },
      config: { url: 'https://mock.url' },
    };
  }

  static mockHttpError(code: string, message: string) {
    return {
      code,
      message,
      errno: -1,
      syscall: 'connect',
      hostname: 'mock.host',
    };
  }

  static mockFetchResponse(data: any, status = 200) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    } as Response);
  }
}

/**
 * Filesystem mocking utilities
 */
export class FilesystemMocks {
  static mockFileExists(exists: boolean) {
    return vi.fn().mockResolvedValue(exists);
  }

  static mockFileRead(content: string | Buffer) {
    return vi.fn().mockResolvedValue(content);
  }

  static mockFileWrite() {
    return vi.fn().mockResolvedValue(undefined);
  }

  static mockDirectoryCreate() {
    return vi.fn().mockResolvedValue(undefined);
  }

  static mockPermissions(allowed: boolean) {
    return vi.fn().mockResolvedValue(allowed);
  }

  static mockDiskSpace(bytes: number) {
    return vi.fn().mockResolvedValue({ available: bytes });
  }
}

/**
 * Process mocking utilities
 */
export class ProcessMocks {
  static mockChildProcess(pid = 12345, exitCode = 0) {
    const mockProcess = {
      pid,
      exitCode,
      killed: false,
      signalCode: null,
      spawnargs: ['mock', 'command'],
      kill: vi.fn().mockReturnValue(true),
      on: vi.fn(),
      stdout: new Readable(),
      stderr: new Readable(),
    };

    mockProcess.stdout.push(null);
    mockProcess.stderr.push(null);

    return mockProcess;
  }

  static mockSpawn(exitCode = 0, stdout = '', stderr = '') {
    return vi.fn().mockReturnValue({
      pid: 12345,
      exitCode,
      stdout: Readable.from(stdout),
      stderr: Readable.from(stderr),
      on: vi.fn((event, callback) => {
        if (event === 'close') setTimeout(() => callback(exitCode), 10);
      }),
      kill: vi.fn(),
    });
  }
}

/**
 * Archive mocking utilities
 */
export class ArchiveMocks {
  static mockTarExtraction(success = true) {
    return vi.fn().mockResolvedValue(success);
  }

  static mockZipExtraction(success = true) {
    return vi.fn().mockResolvedValue(success);
  }

  static mockCorruptedArchive() {
    return vi.fn().mockRejectedValue(new Error('Archive corrupted'));
  }

  static mockLargeArchive(size: number) {
    return vi.fn().mockResolvedValue({ size, extracted: true });
  }
}
