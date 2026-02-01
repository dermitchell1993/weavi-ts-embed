/**
 * Tests for WeaviateProcess (Process Manager)
 *
 * Tests cover:
 * - Process spawning with correct environment variables
 * - stdout/stderr capture (verbose and non-verbose modes)
 * - Process state tracking (running, PID, config)
 * - Graceful shutdown (SIGTERM + SIGKILL fallback)
 * - Error handling (spawn failures, kill errors)
 * - Cleanup and resource management
 */

/* eslint-disable require-await */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WeaviateProcess } from './process-manager';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process');

const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;

class MockChildProcess extends EventEmitter {
  pid = 12345;
  killed = false;
  stdout = new EventEmitter();
  stderr = new EventEmitter();

  kill(signal?: string): boolean {
    this.killed = true;
    this.emit('exit', 0, signal);
    return true;
  }
}

describe('WeaviateProcess', () => {
  let weaviateProcess: WeaviateProcess;
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    weaviateProcess = new WeaviateProcess();
    mockProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
  });

  afterEach(async () => {
    if (weaviateProcess.isRunning()) {
      await weaviateProcess.stop();
    }
  });

  describe('start', () => {
    const validConfig = {
      binaryPath: '/path/to/weaviate',
      port: 8080,
      grpcPort: 50051,
      persistenceDataPath: './data/weaviate',
      env: {},
      additionalEnvVars: {
        ENABLE_MODULES: 'text2vec-transformers',
      },
      verbose: true,
    };

    it('should spawn process with correct binary path', async () => {
      weaviateProcess.start(validConfig);

      expect(mockSpawn).toHaveBeenCalledWith(
        '/path/to/weaviate',
        [],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
        })
      );
    });

    it('should pass correct environment variables', async () => {
      weaviateProcess.start(validConfig);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2];

      // Path should be resolved to absolute
      const expectedPath = require('path').join(process.cwd(), './data/weaviate');

      expect(spawnOptions?.env).toMatchObject({
        WEAVIATE_PORT: '8080',
        WEAVIATE_GRPC_PORT: '50051',
        PERSISTENCE_DATA_PATH: expectedPath,
        ENABLE_MODULES: 'text2vec-transformers',
      });
    });

    it('should resolve relative data paths to absolute', async () => {
      weaviateProcess.start(validConfig);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2];

      const expectedPath = require('path').join(process.cwd(), './data/weaviate');
      expect(spawnOptions?.env?.PERSISTENCE_DATA_PATH).toBe(expectedPath);
    });

    it('should use absolute data paths as-is', async () => {
      const configWithAbsolutePath = {
        ...validConfig,
        persistenceDataPath: '/absolute/path/to/data',
      };

      weaviateProcess.start(configWithAbsolutePath);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2];

      expect(spawnOptions?.env?.PERSISTENCE_DATA_PATH).toBe('/absolute/path/to/data');
    });

    it('should use default data path if not provided', async () => {
      const configWithoutDataPath = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
      };

      weaviateProcess.start(configWithoutDataPath);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2];

      const expectedPath = require('path').join(process.cwd(), './data/weaviate');
      expect(spawnOptions?.env?.PERSISTENCE_DATA_PATH).toBe(expectedPath);
    });

    it('should merge additional environment variables', async () => {
      weaviateProcess.start(validConfig);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2];

      const expectedPath = require('path').join(process.cwd(), './data/weaviate');

      // Should include both process.env and additional vars
      expect(spawnOptions?.env).toMatchObject({
        ...process.env,
        WEAVIATE_PORT: '8080',
        WEAVIATE_GRPC_PORT: '50051',
        PERSISTENCE_DATA_PATH: expectedPath,
        ENABLE_MODULES: 'text2vec-transformers',
      });
    });

    it('should merge base env with additionalEnvVars', async () => {
      const configWithBaseEnv = {
        ...validConfig,
        env: {
          BASE_VAR: 'base_value',
        },
        additionalEnvVars: {
          ADDITIONAL_VAR: 'additional_value',
        },
      };

      weaviateProcess.start(configWithBaseEnv);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2];

      expect(spawnOptions?.env).toMatchObject({
        BASE_VAR: 'base_value',
        ADDITIONAL_VAR: 'additional_value',
      });
    });

    it('should pass cwd option if provided', async () => {
      const configWithCwd = {
        ...validConfig,
        cwd: '/custom/working/directory',
      };

      weaviateProcess.start(configWithCwd);

      expect(mockSpawn).toHaveBeenCalledWith(
        '/path/to/weaviate',
        [],
        expect.objectContaining({
          cwd: '/custom/working/directory',
        })
      );
    });

    it('should capture stdout output when verbose is true', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      weaviateProcess.start(validConfig);
      mockProcess.stdout.emit('data', Buffer.from('Test stdout output'));

      expect(consoleSpy).toHaveBeenCalledWith('[Weaviate] Test stdout output');

      consoleSpy.mockRestore();
    });

    it('should capture stderr output', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      weaviateProcess.start(validConfig);
      mockProcess.stderr.emit('data', Buffer.from('Test stderr output'));

      expect(consoleSpy).toHaveBeenCalledWith('[Weaviate Error] Test stderr output');

      consoleSpy.mockRestore();
    });

    it('should not log empty stdout lines', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      weaviateProcess.start(validConfig);
      mockProcess.stdout.emit('data', Buffer.from('   \n  '));

      // Should only be called for startup messages, not empty lines
      const weaviateLogCalls = consoleSpy.mock.calls.filter((call) => call[0]?.includes('[Weaviate]'));
      expect(weaviateLogCalls.length).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should throw error if process is already running', async () => {
      weaviateProcess.start(validConfig);

      expect(() => weaviateProcess.start(validConfig)).toThrow(
        'Weaviate process is already running. Call stop() before starting again.'
      );
    });

    it('should handle spawn errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      weaviateProcess.start(validConfig);

      const error = new Error('Spawn failed');
      mockProcess.emit('error', error);

      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] Process error: Spawn failed');
      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] Failed to start Weaviate: Spawn failed');

      consoleSpy.mockRestore();
    });

    it('should set process to null on exit', async () => {
      weaviateProcess.start(validConfig);
      expect(weaviateProcess.isRunning()).toBe(true);

      mockProcess.emit('exit', 0, null);

      expect(weaviateProcess.isRunning()).toBe(false);
    });

    it('should not log startup messages when verbose is false', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const configWithoutVerbose = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
        verbose: false,
      };

      weaviateProcess.start(configWithoutVerbose);

      const startupLogs = consoleSpy.mock.calls.filter((call) =>
        call[0]?.includes('[WeaviateProcess] Starting')
      );
      expect(startupLogs.length).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should not capture stdout when verbose is false', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const configWithoutVerbose = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
        verbose: false,
      };

      weaviateProcess.start(configWithoutVerbose);
      mockProcess.stdout.emit('data', Buffer.from('Test stdout output'));

      const stdoutLogs = consoleSpy.mock.calls.filter((call) => call[0]?.includes('[Weaviate]'));
      expect(stdoutLogs.length).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('isRunning', () => {
    it('should return false when no process is running', () => {
      expect(weaviateProcess.isRunning()).toBe(false);
    });

    it('should return true when process is running', async () => {
      weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
      });

      expect(weaviateProcess.isRunning()).toBe(true);
    });

    it('should return false after process is killed', async () => {
      weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
      });

      mockProcess.killed = true;
      expect(weaviateProcess.isRunning()).toBe(false);
    });
  });

  describe('getPid', () => {
    it('should return undefined when no process is running', () => {
      expect(weaviateProcess.getPid()).toBeUndefined();
    });

    it('should return process PID when running', async () => {
      weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
      });

      expect(weaviateProcess.getPid()).toBe(12345);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
        verbose: true,
      });
    });

    it('should send SIGTERM to stop process', async () => {
      const killSpy = vi.spyOn(mockProcess, 'kill');

      await weaviateProcess.stop();

      expect(killSpy).toHaveBeenCalledWith('SIGTERM');
    });

    it('should wait for process to exit gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await weaviateProcess.stop();

      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] Process stopped successfully');

      consoleSpy.mockRestore();
    });

    it('should force kill after timeout', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Override kill method to not emit exit on SIGTERM, only on SIGKILL
      mockProcess.kill = vi.fn().mockImplementation((signal?: string) => {
        if (signal === 'SIGKILL') {
          mockProcess.killed = true;
          setImmediate(() => mockProcess.emit('exit', 0, signal));
        }
        return true;
      });

      const stopPromise = weaviateProcess.stop(100); // Short timeout

      // Wait for timeout to trigger
      await new Promise((resolve) => setTimeout(resolve, 150));

      await stopPromise;

      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] Graceful shutdown timed out, forcing kill');

      consoleSpy.mockRestore();
    });

    it('should do nothing if no process is running', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await weaviateProcess.stop();

      consoleSpy.mockClear();

      await weaviateProcess.stop();

      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] No process to stop');

      consoleSpy.mockRestore();
    });

    it('should handle kill errors on SIGTERM', async () => {
      const originalKill = mockProcess.kill.bind(mockProcess);
      mockProcess.kill = vi.fn().mockImplementation((signal?: string) => {
        if (signal === 'SIGTERM') {
          throw new Error('Kill failed');
        }
        return originalKill(signal);
      });

      await expect(weaviateProcess.stop()).rejects.toThrow('Failed to stop Weaviate process: Kill failed');

      mockProcess.kill = originalKill;
    });
  });

  describe('kill', () => {
    beforeEach(async () => {
      weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
        verbose: true,
      });
    });

    it('should send SIGKILL to force kill process', async () => {
      const killSpy = vi.spyOn(mockProcess, 'kill');

      weaviateProcess.kill();

      expect(killSpy).toHaveBeenCalledWith('SIGKILL');
    });

    it('should log kill message when verbose is true', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      weaviateProcess.kill();

      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] Force killing process with PID 12345');

      consoleSpy.mockRestore();
    });

    it('should do nothing if no process is running', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await weaviateProcess.stop();

      consoleSpy.mockClear();

      weaviateProcess.kill();

      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] No process to kill');

      consoleSpy.mockRestore();
    });

    it('should handle kill errors', async () => {
      mockProcess.kill = vi.fn().mockImplementation(() => {
        throw new Error('Kill failed');
      });

      await expect(weaviateProcess.kill()).rejects.toThrow('Failed to kill Weaviate process: Kill failed');
    });
  });

  describe('cleanup', () => {
    it('should stop process and clear config', async () => {
      weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
      });

      expect(weaviateProcess.isRunning()).toBe(true);
      expect(weaviateProcess.getConfig()).not.toBeNull();

      await weaviateProcess.cleanup();

      expect(weaviateProcess.isRunning()).toBe(false);
      expect(weaviateProcess.getConfig()).toBeNull();
    });

    it('should not throw if no process is running', async () => {
      await expect(weaviateProcess.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('getConfig', () => {
    it('should return null when no process has been started', () => {
      expect(weaviateProcess.getConfig()).toBeNull();
    });

    it('should return config after process is started', async () => {
      const config = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        persistenceDataPath: './data/weaviate',
        env: {},
        additionalEnvVars: {
          ENABLE_MODULES: 'text2vec-transformers',
        },
      };

      weaviateProcess.start(config);

      expect(weaviateProcess.getConfig()).toEqual(config);
    });

    it('should preserve config after process is stopped', async () => {
      const config = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
      };

      weaviateProcess.start(config);
      await weaviateProcess.stop();

      expect(weaviateProcess.getConfig()).toEqual(config);
    });

    it('should clear config after cleanup', async () => {
      const config = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        env: {},
      };

      weaviateProcess.start(config);
      await weaviateProcess.cleanup();

      expect(weaviateProcess.getConfig()).toBeNull();
    });
  });
});
