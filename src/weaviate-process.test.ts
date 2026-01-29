import { WeaviateProcess } from './weaviate-process';
import { checkPorts } from './port-utils';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('./port-utils');
jest.mock('child_process');

const mockCheckPorts = checkPorts as jest.MockedFunction<typeof checkPorts>;
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

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
    jest.clearAllMocks();
    weaviateProcess = new WeaviateProcess();
    mockProcess = new MockChildProcess();
    mockCheckPorts.mockResolvedValue(undefined);
    mockSpawn.mockReturnValue(mockProcess as any);
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
      additionalEnvVars: {
        ENABLE_MODULES: 'text2vec-transformers',
      },
      verbose: true, // Enable verbose for testing
    };

    it('should check ports before spawning process', async () => {
      await weaviateProcess.start(validConfig);

      expect(mockCheckPorts).toHaveBeenCalledWith(8080, 50051);
    });

    it('should throw error if ports are not available', async () => {
      mockCheckPorts.mockRejectedValue(new Error('Port 8080 is already in use'));

      await expect(weaviateProcess.start(validConfig)).rejects.toThrow('Port 8080 is already in use');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should spawn process with correct binary path', async () => {
      await weaviateProcess.start(validConfig);

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
      await weaviateProcess.start(validConfig);

      const spawnCall = mockSpawn.mock.calls[0];
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

    it('should use default data path if not provided', async () => {
      const configWithoutDataPath = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
      };

      await weaviateProcess.start(configWithoutDataPath);

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnOptions = spawnCall[2];

      // Should resolve to absolute path from cwd
      const expectedPath = require('path').join(process.cwd(), './data/weaviate');
      expect(spawnOptions?.env?.PERSISTENCE_DATA_PATH).toBe(expectedPath);
    });

    it('should merge additional environment variables', async () => {
      await weaviateProcess.start(validConfig);

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnOptions = spawnCall[2];

      // Path should be resolved to absolute
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

    it('should pass ENABLE_MODULES environment variable', async () => {
      const configWithModules = {
        ...validConfig,
        additionalEnvVars: {
          ENABLE_MODULES: 'text2vec-openai,text2vec-cohere',
        },
      };

      await weaviateProcess.start(configWithModules);

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnOptions = spawnCall[2];

      expect(spawnOptions?.env?.ENABLE_MODULES).toBe('text2vec-openai,text2vec-cohere');
    });

    it('should pass LOG_LEVEL environment variable', async () => {
      const configWithLogLevel = {
        ...validConfig,
        additionalEnvVars: {
          LOG_LEVEL: 'debug',
        },
      };

      await weaviateProcess.start(configWithLogLevel);

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnOptions = spawnCall[2];

      expect(spawnOptions?.env?.LOG_LEVEL).toBe('debug');
    });

    it('should pass multiple environment variables simultaneously', async () => {
      const configWithMultipleVars = {
        ...validConfig,
        additionalEnvVars: {
          ENABLE_MODULES: 'text2vec-openai',
          LOG_LEVEL: 'info',
          DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
          AUTHENTICATION_APIKEY_ENABLED: 'true',
        },
      };

      await weaviateProcess.start(configWithMultipleVars);

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnOptions = spawnCall[2];

      expect(spawnOptions?.env).toMatchObject({
        ENABLE_MODULES: 'text2vec-openai',
        LOG_LEVEL: 'info',
        DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
        AUTHENTICATION_APIKEY_ENABLED: 'true',
      });
    });

    it('should capture stdout output', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await weaviateProcess.start(validConfig);
      mockProcess.stdout.emit('data', Buffer.from('Test stdout output'));

      expect(consoleSpy).toHaveBeenCalledWith('[Weaviate] Test stdout output');

      consoleSpy.mockRestore();
    });

    it('should capture stderr output', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await weaviateProcess.start(validConfig);
      mockProcess.stderr.emit('data', Buffer.from('Test stderr output'));

      expect(consoleSpy).toHaveBeenCalledWith('[Weaviate Error] Test stderr output');

      consoleSpy.mockRestore();
    });

    it('should not log empty stdout lines', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await weaviateProcess.start(validConfig);
      mockProcess.stdout.emit('data', Buffer.from('   \n  '));

      // Should only be called for startup messages, not empty lines
      const weaviateLogCalls = consoleSpy.mock.calls.filter((call) => call[0]?.includes('[Weaviate]'));
      expect(weaviateLogCalls.length).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should throw error if process is already running', async () => {
      await weaviateProcess.start(validConfig);

      await expect(weaviateProcess.start(validConfig)).rejects.toThrow(
        'Weaviate process is already running. Call stop() before starting again.'
      );
    });

    it('should handle spawn errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await weaviateProcess.start(validConfig);

      // Simulate spawn error
      const error = new Error('Spawn failed');
      mockProcess.emit('error', error);

      // The error should be logged
      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] Process error: Spawn failed');
      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] Failed to start Weaviate: Spawn failed');

      consoleSpy.mockRestore();
    });

    it('should set process to null on exit', async () => {
      await weaviateProcess.start(validConfig);
      expect(weaviateProcess.isRunning()).toBe(true);

      mockProcess.emit('exit', 0, null);

      expect(weaviateProcess.isRunning()).toBe(false);
    });

    it('should not log startup messages when verbose is false', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const configWithoutVerbose = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        verbose: false,
      };

      await weaviateProcess.start(configWithoutVerbose);

      // Should not log any startup messages
      const startupLogs = consoleSpy.mock.calls.filter((call) =>
        call[0]?.includes('[WeaviateProcess] Starting')
      );
      expect(startupLogs.length).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should not capture stdout when verbose is false', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const configWithoutVerbose = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        verbose: false,
      };

      await weaviateProcess.start(configWithoutVerbose);
      mockProcess.stdout.emit('data', Buffer.from('Test stdout output'));

      // Should not log stdout
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
      await weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
      });

      expect(weaviateProcess.isRunning()).toBe(true);
    });

    it('should return false after process is killed', async () => {
      await weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
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
      await weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
      });

      expect(weaviateProcess.getPid()).toBe(12345);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await weaviateProcess.start({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        verbose: true, // Enable verbose for testing
      });
    });

    it('should send SIGTERM to stop process', async () => {
      const killSpy = jest.spyOn(mockProcess, 'kill');

      await weaviateProcess.stop();

      expect(killSpy).toHaveBeenCalledWith('SIGTERM');
    });

    it('should wait for process to exit gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await weaviateProcess.stop();

      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] Process stopped successfully');

      consoleSpy.mockRestore();
    });

    it('should force kill after timeout', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Override kill method to not emit exit on SIGTERM, only on SIGKILL
      mockProcess.kill = jest.fn().mockImplementation((signal?: string) => {
        if (signal === 'SIGKILL') {
          mockProcess.killed = true;
          // Emit exit asynchronously to allow cleanup to set the flag
          setImmediate(() => mockProcess.emit('exit', 0, signal));
        }
        // Don't emit exit for SIGTERM to trigger timeout
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Stop the already running process
      await weaviateProcess.stop();

      // Clear previous logs
      consoleSpy.mockClear();

      // Try to stop again
      await weaviateProcess.stop();

      expect(consoleSpy).toHaveBeenCalledWith('[WeaviateProcess] No process to stop');

      consoleSpy.mockRestore();
    });

    it('should handle kill errors on SIGTERM', async () => {
      // Override the kill method to throw an error when called with SIGTERM
      const originalKill = mockProcess.kill.bind(mockProcess);
      mockProcess.kill = jest.fn().mockImplementation((signal?: string) => {
        if (signal === 'SIGTERM') {
          throw new Error('Kill failed');
        }
        return originalKill(signal);
      });

      // Stop should reject with an error when SIGTERM fails
      await expect(weaviateProcess.stop()).rejects.toThrow('Failed to stop Weaviate process: Kill failed');

      // Restore for cleanup
      mockProcess.kill = originalKill;
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
        additionalEnvVars: {
          ENABLE_MODULES: 'text2vec-transformers',
        },
      };

      await weaviateProcess.start(config);

      expect(weaviateProcess.getConfig()).toEqual(config);
    });

    it('should preserve config after process is stopped', async () => {
      const config = {
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
      };

      await weaviateProcess.start(config);
      await weaviateProcess.stop();

      expect(weaviateProcess.getConfig()).toEqual(config);
    });
  });
});
