/**
 * Integration Tests for Port Conflict Detection and Resolution
 *
 * These tests verify that the embedded Weaviate client correctly:
 * - Checks port availability before startup
 * - Detects conflicts when multiple instances attempt to use the same ports
 * - Respects custom port configurations (WEAVIATE_PORT, WEAVIATE_GRPC_PORT)
 * - Provides clear error messages for port conflicts
 * - Properly cleans up ports after process termination
 */

import { createServer, Server } from 'net';
import { connectToEmbedded } from '../../src/connectToEmbedded';
import { isPortAvailable, checkPorts } from '../../src/port-utils';

describe('Port Conflict Integration Tests', () => {
  // Test timeout extended for integration tests
  jest.setTimeout(60000);

  let occupiedServers: Server[] = [];

  /**
   * Helper to occupy a port with a TCP server
   */
  const occupyPort = (port: number): Promise<Server> => {
    return new Promise((resolve, reject) => {
      const server = createServer();

      server.on('error', (err) => {
        reject(err);
      });

      server.listen(port, () => {
        occupiedServers.push(server);
        resolve(server);
      });
    });
  };

  /**
   * Helper to close a server and free the port
   */
  const freePort = (server: Server): Promise<void> => {
    return new Promise((resolve) => {
      server.close(() => {
        const index = occupiedServers.indexOf(server);
        if (index > -1) {
          occupiedServers.splice(index, 1);
        }
        resolve();
      });
    });
  };

  afterEach(async () => {
    // Clean up all occupied servers
    await Promise.all(occupiedServers.map(freePort));
    occupiedServers = [];
  });

  describe('Port Availability Checking Before Startup', () => {
    it('should verify port is available before attempting to start Weaviate', async () => {
      const testPort = 18080;
      const testGrpcPort = 15051;

      // Verify ports are available initially
      const httpAvailable = await isPortAvailable(testPort);
      const grpcAvailable = await isPortAvailable(testGrpcPort);

      expect(httpAvailable).toBe(true);
      expect(grpcAvailable).toBe(true);

      // checkPorts should not throw for available ports
      await expect(checkPorts(testPort, testGrpcPort)).resolves.not.toThrow();
    });

    it('should detect when HTTP port is already in use before startup', async () => {
      const testPort = 18081;
      const testGrpcPort = 15052;

      // Occupy the HTTP port
      await occupyPort(testPort);

      // Port availability check should detect the conflict
      const httpAvailable = await isPortAvailable(testPort);
      expect(httpAvailable).toBe(false);

      // checkPorts should throw with descriptive error
      await expect(checkPorts(testPort, testGrpcPort)).rejects.toThrow(/HTTP port .* is already in use/);
    });

    it('should detect when gRPC port is already in use before startup', async () => {
      const testPort = 18082;
      const testGrpcPort = 15053;

      // Occupy the gRPC port
      await occupyPort(testGrpcPort);

      // Port availability check should detect the conflict
      const grpcAvailable = await isPortAvailable(testGrpcPort);
      expect(grpcAvailable).toBe(false);

      // checkPorts should throw with descriptive error
      await expect(checkPorts(testPort, testGrpcPort)).rejects.toThrow(/gRPC port .* is already in use/);
    });

    it('should detect when both HTTP and gRPC ports are in use', async () => {
      const testPort = 18083;
      const testGrpcPort = 15054;

      // Occupy both ports
      await occupyPort(testPort);
      await occupyPort(testGrpcPort);

      // Both should be detected as unavailable
      const httpAvailable = await isPortAvailable(testPort);
      const grpcAvailable = await isPortAvailable(testGrpcPort);

      expect(httpAvailable).toBe(false);
      expect(grpcAvailable).toBe(false);

      // checkPorts should throw with combined error
      await expect(checkPorts(testPort, testGrpcPort)).rejects.toThrow(/Ports already in use/);
    });
  });

  describe('Multiple Instance Port Conflict Detection', () => {
    it('should prevent starting a second instance on the same default ports', async () => {
      const testPort = 18084;
      const testGrpcPort = 15055;

      // Simulate another Weaviate instance occupying default ports
      await occupyPort(testPort);
      await occupyPort(testGrpcPort);

      // Attempting to connect should fail with port conflict error
      await expect(
        connectToEmbedded({
          port: testPort,
          grpcPort: testGrpcPort,
          binaryPath: '/nonexistent/path', // Won't get far enough to matter
        })
      ).rejects.toThrow(/Ports already in use/);
    });

    it('should allow multiple instances with different port configurations', async () => {
      // This test verifies that port isolation works correctly
      const instance1Port = 18085;
      const instance1GrpcPort = 15056;
      const instance2Port = 18086;
      const instance2GrpcPort = 15057;

      // Verify both port sets are available
      await expect(checkPorts(instance1Port, instance1GrpcPort)).resolves.not.toThrow();
      await expect(checkPorts(instance2Port, instance2GrpcPort)).resolves.not.toThrow();

      // Both should be independently available
      expect(await isPortAvailable(instance1Port)).toBe(true);
      expect(await isPortAvailable(instance2Port)).toBe(true);
    });
  });

  describe('Custom Port Configuration (WEAVIATE_PORT)', () => {
    it('should respect custom HTTP port configuration', async () => {
      const customPort = 19090;
      const defaultGrpcPort = 15058;

      // Occupy the custom port
      await occupyPort(customPort);

      // Attempting to use the occupied custom port should fail
      await expect(checkPorts(customPort, defaultGrpcPort)).rejects.toThrow(
        new RegExp(`HTTP port ${customPort} is already in use`)
      );
    });

    it('should provide alternative port suggestion when custom port is occupied', async () => {
      const customPort = 19091;
      const grpcPort = 15059;

      // Occupy the custom port
      await occupyPort(customPort);

      try {
        await checkPorts(customPort, grpcPort);
        fail('Expected checkPorts to throw an error');
      } catch (error: any) {
        // Error message should suggest the next port
        expect(error.message).toContain(`port: ${customPort + 1}`);
        expect(error.message).toContain('connectToEmbedded');
      }
    });
  });

  describe('GRPC Port Conflicts (WEAVIATE_GRPC_PORT)', () => {
    it('should respect custom gRPC port configuration', async () => {
      const httpPort = 18087;
      const customGrpcPort = 55051;

      // Occupy the custom gRPC port
      await occupyPort(customGrpcPort);

      // Attempting to use the occupied custom gRPC port should fail
      await expect(checkPorts(httpPort, customGrpcPort)).rejects.toThrow(
        new RegExp(`gRPC port ${customGrpcPort} is already in use`)
      );
    });

    it('should provide alternative gRPC port suggestion when occupied', async () => {
      const httpPort = 18088;
      const customGrpcPort = 55052;

      // Occupy the custom gRPC port
      await occupyPort(customGrpcPort);

      try {
        await checkPorts(httpPort, customGrpcPort);
        fail('Expected checkPorts to throw an error');
      } catch (error: any) {
        // Error message should suggest the next gRPC port
        expect(error.message).toContain(`grpcPort: ${customGrpcPort + 1}`);
        expect(error.message).toContain('connectToEmbedded');
      }
    });
  });

  describe('Error Message Validation for Port Conflicts', () => {
    it('should provide clear error message with port number for HTTP conflict', async () => {
      const testPort = 18089;
      const grpcPort = 15060;

      await occupyPort(testPort);

      try {
        await checkPorts(testPort, grpcPort);
        fail('Expected checkPorts to throw an error');
      } catch (error: any) {
        expect(error.message).toContain('HTTP port');
        expect(error.message).toContain(testPort.toString());
        expect(error.message).toContain('already in use');
      }
    });

    it('should provide clear error message with port number for gRPC conflict', async () => {
      const httpPort = 18090;
      const testGrpcPort = 15061;

      await occupyPort(testGrpcPort);

      try {
        await checkPorts(httpPort, testGrpcPort);
        fail('Expected checkPorts to throw an error');
      } catch (error: any) {
        expect(error.message).toContain('gRPC port');
        expect(error.message).toContain(testGrpcPort.toString());
        expect(error.message).toContain('already in use');
      }
    });

    it('should suggest checking for running Weaviate instances', async () => {
      const testPort = 18091;
      const grpcPort = 15062;

      await occupyPort(testPort);

      try {
        await checkPorts(testPort, grpcPort);
        fail('Expected checkPorts to throw an error');
      } catch (error: any) {
        expect(error.message).toContain('lsof -i');
        expect(error.message).toContain('Weaviate instance may be running');
      }
    });

    it('should provide actionable suggestions in error message', async () => {
      const testPort = 18092;
      const grpcPort = 15063;

      await occupyPort(testPort);

      try {
        await checkPorts(testPort, grpcPort);
        fail('Expected checkPorts to throw an error');
      } catch (error: any) {
        expect(error.message).toContain('Suggestions:');
        expect(error.message).toContain('connectToEmbedded');
        expect(error.message).toContain('Try using a different');
      }
    });

    it('should list all conflicting ports in error message when both are occupied', async () => {
      const testPort = 18093;
      const testGrpcPort = 15064;

      await occupyPort(testPort);
      await occupyPort(testGrpcPort);

      try {
        await checkPorts(testPort, testGrpcPort);
        fail('Expected checkPorts to throw an error');
      } catch (error: any) {
        expect(error.message).toContain('HTTP port');
        expect(error.message).toContain('gRPC port');
        expect(error.message).toContain(testPort.toString());
        expect(error.message).toContain(testGrpcPort.toString());
      }
    });
  });

  describe('Port Cleanup After Process Termination', () => {
    it('should properly release port after server close', async () => {
      const testPort = 18094;

      // Occupy and then free the port
      const server = await occupyPort(testPort);
      expect(await isPortAvailable(testPort)).toBe(false);

      await freePort(server);

      // Port should be available again after cleanup
      expect(await isPortAvailable(testPort)).toBe(true);
    });

    it('should allow reusing the same port after proper cleanup', async () => {
      const testPort = 18095;
      const grpcPort = 15065;

      // First occupation
      const server1 = await occupyPort(testPort);
      expect(await isPortAvailable(testPort)).toBe(false);
      await freePort(server1);

      // Port should be available for reuse
      await expect(checkPorts(testPort, grpcPort)).resolves.not.toThrow();

      // Second occupation
      const server2 = await occupyPort(testPort);
      expect(await isPortAvailable(testPort)).toBe(false);
      await freePort(server2);

      // Port should be available again
      expect(await isPortAvailable(testPort)).toBe(true);
    });

    it('should not leave hanging connections after multiple port checks', async () => {
      const testPort = 18096;

      // Perform multiple consecutive availability checks
      /* eslint-disable no-await-in-loop */
      for (let i = 0; i < 5; i++) {
        const available = await isPortAvailable(testPort);
        expect(available).toBe(true);
      }
      /* eslint-enable no-await-in-loop */

      // Port should still be available (no hanging connections)
      expect(await isPortAvailable(testPort)).toBe(true);

      // Should be able to actually occupy the port
      const server = await occupyPort(testPort);
      expect(await isPortAvailable(testPort)).toBe(false);
      await freePort(server);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle rapid sequential port availability checks', async () => {
      const testPort = 18097;

      // Perform multiple rapid sequential checks
      const checks: boolean[] = [];
      /* eslint-disable no-await-in-loop */
      for (let i = 0; i < 5; i++) {
        checks.push(await isPortAvailable(testPort));
      }
      /* eslint-enable no-await-in-loop */

      // All checks should return true for an available port
      expect(checks.every((result) => result === true)).toBe(true);

      // Port should still be available after multiple checks
      expect(await isPortAvailable(testPort)).toBe(true);
    });

    it('should handle checking ports near the upper limit of valid range', async () => {
      // Using high port numbers that are likely to be available
      const highPort = 60000;
      const highGrpcPort = 60001;

      await expect(checkPorts(highPort, highGrpcPort)).resolves.not.toThrow();
    });

    it('should correctly identify port conflicts even with rapid start attempts', async () => {
      const testPort = 18098;
      const grpcPort = 15066;

      // Occupy the port
      await occupyPort(testPort);

      // Multiple rapid conflict checks should all fail consistently
      const results = await Promise.allSettled([
        checkPorts(testPort, grpcPort),
        checkPorts(testPort, grpcPort),
        checkPorts(testPort, grpcPort),
      ]);

      // All should be rejected with port conflict error
      expect(results.every((result) => result.status === 'rejected')).toBe(true);
      results.forEach((result) => {
        if (result.status === 'rejected') {
          expect(result.reason.message).toMatch(/already in use/);
        }
      });
    });
  });
});
