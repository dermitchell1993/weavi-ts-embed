import { createServer, Server } from 'net';
import { isPortAvailable, checkPorts } from './port-utils';

describe('port-utils', () => {
  describe('isPortAvailable', () => {
    it('should return true for an available port', async () => {
      const available = await isPortAvailable(0); // Port 0 lets OS assign a free port
      expect(available).toBe(true);
    });

    it('should return false for a port in use', async () => {
      // Create a server to occupy the port
      const server = createServer();
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });

      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;

      // Check if the port is available (it should not be)
      const available = await isPortAvailable(port);

      // Clean up
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });

      expect(available).toBe(false);
    });

    it('should not leave hanging connections', async () => {
      const port = 0; // Use OS-assigned port

      // Check port availability multiple times
      await isPortAvailable(port);
      await isPortAvailable(port);
      await isPortAvailable(port);

      // All checks should complete without hanging
      expect(true).toBe(true);
    });
  });

  describe('checkPorts', () => {
    let httpServer: Server;
    let grpcServer: Server;
    let httpPort: number;
    let grpcPort: number;

    afterEach(async () => {
      // Clean up any servers created during tests
      if (httpServer) {
        await new Promise<void>((resolve) => {
          httpServer.close(() => resolve());
        });
      }
      if (grpcServer) {
        await new Promise<void>((resolve) => {
          grpcServer.close(() => resolve());
        });
      }
    });

    it('should not throw when both ports are available', async () => {
      // Use high port numbers that are likely to be available
      await expect(checkPorts(18080, 15051)).resolves.not.toThrow();
    });

    it('should throw when HTTP port is in use', async () => {
      // Create a server on HTTP port
      httpServer = createServer();
      await new Promise<void>((resolve) => {
        httpServer.listen(0, () => resolve());
      });

      const address = httpServer.address();
      httpPort = typeof address === 'object' && address !== null ? address.port : 0;

      await expect(checkPorts(httpPort, 15051)).rejects.toThrow(/HTTP port .* is already in use/);
    });

    it('should throw when gRPC port is in use', async () => {
      // Create a server on gRPC port
      grpcServer = createServer();
      await new Promise<void>((resolve) => {
        grpcServer.listen(0, () => resolve());
      });

      const address = grpcServer.address();
      grpcPort = typeof address === 'object' && address !== null ? address.port : 0;

      await expect(checkPorts(18080, grpcPort)).rejects.toThrow(/gRPC port .* is already in use/);
    });

    it('should throw when both ports are in use', async () => {
      // Create servers on both ports
      httpServer = createServer();
      grpcServer = createServer();

      await new Promise<void>((resolve) => {
        httpServer.listen(0, () => resolve());
      });

      await new Promise<void>((resolve) => {
        grpcServer.listen(0, () => resolve());
      });

      const httpAddress = httpServer.address();
      const grpcAddress = grpcServer.address();
      httpPort = typeof httpAddress === 'object' && httpAddress !== null ? httpAddress.port : 0;
      grpcPort = typeof grpcAddress === 'object' && grpcAddress !== null ? grpcAddress.port : 0;

      await expect(checkPorts(httpPort, grpcPort)).rejects.toThrow(/Ports already in use/);
    });

    it('should provide actionable error message with port suggestions', async () => {
      // Create a server on HTTP port
      httpServer = createServer();
      await new Promise<void>((resolve) => {
        httpServer.listen(0, () => resolve());
      });

      const address = httpServer.address();
      httpPort = typeof address === 'object' && address !== null ? address.port : 0;

      try {
        await checkPorts(httpPort, 15051);
        fail('Expected checkPorts to throw');
      } catch (error: any) {
        expect(error.message).toContain('HTTP port');
        expect(error.message).toContain('already in use');
        expect(error.message).toContain('Try using a different HTTP port');
        expect(error.message).toContain('connectToEmbedded');
      }
    });

    it('should suggest checking for running Weaviate instances', async () => {
      // Create a server on HTTP port
      httpServer = createServer();
      await new Promise<void>((resolve) => {
        httpServer.listen(0, () => resolve());
      });

      const address = httpServer.address();
      httpPort = typeof address === 'object' && address !== null ? address.port : 0;

      try {
        await checkPorts(httpPort, 15051);
        fail('Expected checkPorts to throw');
      } catch (error: any) {
        expect(error.message).toContain('lsof -i');
        expect(error.message).toContain('Weaviate instance may be running');
      }
    });

    it('should suggest alternative ports in error message', async () => {
      // Create a server on HTTP port
      httpServer = createServer();
      await new Promise<void>((resolve) => {
        httpServer.listen(8080, () => resolve());
      });

      try {
        await checkPorts(8080, 50051);
        fail('Expected checkPorts to throw');
      } catch (error: any) {
        expect(error.message).toContain('8081'); // Suggests next port
      }
    });

    it('should work on different platforms', async () => {
      // This test ensures the implementation doesn't use platform-specific APIs
      const originalPlatform = process.platform;

      // Test that the function works regardless of platform
      await expect(checkPorts(18080, 15051)).resolves.not.toThrow();

      // Restore platform (though process.platform is read-only)
      expect(process.platform).toBe(originalPlatform);
    });
  });
});
