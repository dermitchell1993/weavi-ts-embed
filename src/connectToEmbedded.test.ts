import { connectToEmbedded } from './connectToEmbedded';
import { WeaviateProcess } from './weaviate-process';
import { BinaryManager } from './binary-manager';
import { connectToLocal } from 'weaviate-client';
import { waitForReady } from './health-check';

// Mock dependencies
jest.mock('./weaviate-process');
jest.mock('./binary-manager');
jest.mock('weaviate-client');
jest.mock('./health-check');

const mockConnectToLocal = connectToLocal as jest.MockedFunction<typeof connectToLocal>;
const mockWaitForReady = waitForReady as jest.MockedFunction<typeof waitForReady>;
const MockWeaviateProcess = WeaviateProcess as jest.MockedClass<typeof WeaviateProcess>;
const MockBinaryManager = BinaryManager as jest.MockedClass<typeof BinaryManager>;

describe('connectToEmbedded', () => {
  let mockWeaviateProcess: jest.Mocked<WeaviateProcess>;
  let mockBinaryManager: jest.Mocked<BinaryManager>;
  let mockClient: any;
  let originalClose: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WeaviateProcess
    mockWeaviateProcess = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isRunning: jest.fn().mockReturnValue(true),
      getPid: jest.fn().mockReturnValue(12345),
      getConfig: jest.fn().mockReturnValue(null),
    } as any;

    MockWeaviateProcess.mockImplementation(() => mockWeaviateProcess);

    // Mock BinaryManager
    mockBinaryManager = {
      ensureBinary: jest.fn().mockResolvedValue('/path/to/weaviate'),
    } as any;

    MockBinaryManager.mockImplementation(() => mockBinaryManager);

    // Mock waitForReady to resolve immediately
    mockWaitForReady.mockResolvedValue(undefined);

    // Mock client with close method
    originalClose = jest.fn().mockResolvedValue(undefined);
    mockClient = {
      close: originalClose,
      collections: { list: jest.fn() },
    };

    mockConnectToLocal.mockResolvedValue(mockClient as any);
  });

  describe('client.close() override', () => {
    it('should override client.close() to stop the Weaviate process', async () => {
      const client = await connectToEmbedded();

      expect(client.close).toBeDefined();
      expect(client.close).not.toBe(originalClose);
    });

    it('should call original close before stopping process', async () => {
      const client = await connectToEmbedded();

      await client.close();

      // Verify original close was called
      expect(originalClose).toHaveBeenCalledTimes(1);

      // Verify process stop was called after original close
      expect(mockWeaviateProcess.stop).toHaveBeenCalledTimes(1);
    });

    it('should stop the Weaviate process when client.close() is called', async () => {
      const client = await connectToEmbedded();

      await client.close();

      expect(mockWeaviateProcess.stop).toHaveBeenCalledTimes(1);
    });

    it('should stop process even if client close fails (try-finally pattern)', async () => {
      originalClose.mockRejectedValue(new Error('Client close failed'));

      const client = await connectToEmbedded();

      await expect(client.close()).rejects.toThrow('Client close failed');

      // Process stop SHOULD be called even if client close fails (critical cleanup)
      expect(mockWeaviateProcess.stop).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during process stop gracefully', async () => {
      mockWeaviateProcess.stop.mockRejectedValue(new Error('Process stop failed'));

      const client = await connectToEmbedded();

      await expect(client.close()).rejects.toThrow('Process stop failed');

      // Original close should have been called
      expect(originalClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('process lifecycle integration', () => {
    it('should start Weaviate process with correct configuration', async () => {
      await connectToEmbedded({
        port: 8080,
        grpcPort: 50051,
        version: '1.23.0',
        persistenceDataPath: '/custom/path',
        additionalEnvVars: {
          ENABLE_MODULES: 'text2vec-transformers',
        },
      });

      expect(mockWeaviateProcess.start).toHaveBeenCalledWith({
        binaryPath: '/path/to/weaviate',
        port: 8080,
        grpcPort: 50051,
        persistenceDataPath: '/custom/path',
        additionalEnvVars: {
          ENABLE_MODULES: 'text2vec-transformers',
        },
      });
    });

    it('should use default ports if not provided', async () => {
      await connectToEmbedded();

      expect(mockWeaviateProcess.start).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 8080,
          grpcPort: 50051,
        })
      );
    });

    it('should download binary if not provided', async () => {
      await connectToEmbedded({ version: '1.23.0' });

      expect(mockBinaryManager.ensureBinary).toHaveBeenCalledWith('1.23.0');
    });

    it('should use provided binary path instead of downloading', async () => {
      const customPath = '/custom/weaviate/binary';

      await connectToEmbedded({ binaryPath: customPath });

      expect(mockBinaryManager.ensureBinary).not.toHaveBeenCalled();
      expect(mockWeaviateProcess.start).toHaveBeenCalledWith(
        expect.objectContaining({
          binaryPath: customPath,
        })
      );
    });
  });

  describe('process instance attachment', () => {
    it('should attach WeaviateProcess instance to client for debugging', async () => {
      const client = await connectToEmbedded();

      expect((client as any).__weaviateProcess).toBe(mockWeaviateProcess);
    });

    it('should allow checking if process is running via attached instance', async () => {
      const client = await connectToEmbedded();

      const isRunning = (client as any).__weaviateProcess.isRunning();

      expect(isRunning).toBe(true);
      expect(mockWeaviateProcess.isRunning).toHaveBeenCalled();
    });

    it('should allow getting process PID via attached instance', async () => {
      const client = await connectToEmbedded();

      const pid = (client as any).__weaviateProcess.getPid();

      expect(pid).toBe(12345);
      expect(mockWeaviateProcess.getPid).toHaveBeenCalled();
    });
  });

  describe('client connection', () => {
    it('should connect to local instance with correct parameters', async () => {
      await connectToEmbedded({
        port: 9090,
        grpcPort: 60051,
        headers: { 'X-Custom': 'header' },
        authCredentials: { apiKey: 'test-key' } as any,
      });

      expect(mockConnectToLocal).toHaveBeenCalledWith({
        host: 'localhost',
        port: 9090,
        grpcPort: 60051,
        headers: { 'X-Custom': 'header' },
        authCredentials: { apiKey: 'test-key' },
      });
    });

    it('should return connected client', async () => {
      const client = await connectToEmbedded();

      expect(client).toBe(mockClient);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from process start', async () => {
      mockWeaviateProcess.start.mockRejectedValue(new Error('Failed to start process'));

      await expect(connectToEmbedded()).rejects.toThrow('Failed to start process');
    });

    it('should propagate errors from binary download', async () => {
      mockBinaryManager.ensureBinary.mockRejectedValue(new Error('Download failed'));

      await expect(connectToEmbedded()).rejects.toThrow('Download failed');
    });

    it('should propagate errors from client connection', async () => {
      mockConnectToLocal.mockRejectedValue(new Error('Connection failed'));

      await expect(connectToEmbedded()).rejects.toThrow('Connection failed');
    });
  });
});
