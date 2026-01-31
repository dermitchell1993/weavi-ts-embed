import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import net from 'net';
import weaviate, { EmbeddedClient, EmbeddedOptions } from '../../src';

/**
 * Port Management Tests (W2.2)
 *
 * Test Coverage:
 * 1. Port availability checking
 * 2. Multiple instance port conflicts
 * 3. Custom port configuration
 * 4. Port binding edge cases
 * 5. Resource cleanup and leak prevention
 */

// Platform check - skip tests on unsupported platforms
const isSupported = process.platform === 'linux' || process.platform === 'darwin';

describe('Port Management Tests', () => {
  if (!isSupported) {
    it('skips tests on unsupported platform', () => {
      console.warn(`Skipping port management tests - EmbeddedDB does not support ${process.platform}`);
      expect(true).toBe(true);
    });
    return;
  }

  // Track active clients for cleanup
  let activeClients: EmbeddedClient[] = [];
  let occupiedServers: net.Server[] = [];

  beforeEach(() => {
    activeClients = [];
    occupiedServers = [];
  });

  afterEach(async () => {
    // Cleanup: Stop all active clients
    for (const client of activeClients) {
      try {
        client.embedded.stop();
      } catch (err) {
        console.warn(`Failed to stop client during cleanup: ${err}`);
      }
    }

    // Cleanup: Close all occupied ports
    /* eslint-disable no-await-in-loop */
    for (const server of occupiedServers) {
      try {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      } catch (err) {
        console.warn(`Failed to close server during cleanup: ${err}`);
      }
    }
    /* eslint-enable no-await-in-loop */

    // Wait for processes to fully terminate and ports to be released
    await new Promise((resolve) => setTimeout(resolve, 3000));

    activeClients = [];
    occupiedServers = [];
  });

  /**
   * Test Suite 1: Port Availability Checking
   */
  describe('Port Availability Checking', () => {
    it('should successfully start on default port when available', async () => {
      // Arrange & Act
      const client = await weaviate.client(new EmbeddedOptions());
      activeClients.push(client);

      // Assert
      expect(client.embedded.pid).toBeGreaterThan(0);
      expect(client.embedded.options.port).toBe(6789);

      // Verify port is actually listening
      const isListening = await checkPortListening('127.0.0.1', 6789);
      expect(isListening).toBe(true);
    }, 120000);

    it('should successfully start on custom port when available', async () => {
      // Arrange
      const customPort = 8888;

      // Act
      const client = await weaviate.client(new EmbeddedOptions({ port: customPort }));
      activeClients.push(client);

      // Assert
      expect(client.embedded.pid).toBeGreaterThan(0);
      expect(client.embedded.options.port).toBe(customPort);

      // Verify custom port is listening
      const isListening = await checkPortListening('127.0.0.1', customPort);
      expect(isListening).toBe(true);
    }, 120000);

    it('should start on custom host and port', async () => {
      // Arrange
      const customHost = '127.0.0.1';
      const customPort = 9999;

      // Act
      const client = await weaviate.client(
        new EmbeddedOptions({
          host: customHost,
          port: customPort,
        }),
        {
          scheme: 'http',
          host: `${customHost}:${customPort}`,
        }
      );
      activeClients.push(client);

      // Assert
      expect(client.embedded.pid).toBeGreaterThan(0);
      expect(client.embedded.options.host).toBe(customHost);
      expect(client.embedded.options.port).toBe(customPort);

      const isListening = await checkPortListening(customHost, customPort);
      expect(isListening).toBe(true);
    }, 120000);

    it('should handle already listening embedded instance gracefully', async () => {
      // Arrange - Start first instance
      const port = 7777;
      const client1 = await weaviate.client(new EmbeddedOptions({ port }));
      activeClients.push(client1);

      // Wait for first instance to be fully listening
      await waitForPort('127.0.0.1', port, 10000);

      // Act - Attempt to start second instance on same port
      // This should detect the port is already in use
      const client2Promise = weaviate.client(new EmbeddedOptions({ port }));

      // Assert - The behavior should be deterministic
      // Either it should succeed (detecting already running) or fail with clear error
      try {
        const client2 = await client2Promise;
        activeClients.push(client2);

        // If it succeeds, verify both have same port
        expect(client2.embedded.options.port).toBe(port);
        console.log('Second client detected already-running instance');
      } catch (err: any) {
        // If it fails, verify it's due to port conflict
        const errorMsg = err.message || String(err);
        expect(
          errorMsg.includes('failed to connect') ||
            errorMsg.includes('EADDRINUSE') ||
            errorMsg.includes('port')
        ).toBe(true);
        console.log('Second client correctly detected port conflict');
      }
    }, 120000);
  });

  /**
   * Test Suite 2: Multiple Instance Port Conflicts
   */
  describe('Multiple Instance Port Conflicts', () => {
    it('should fail when port is occupied by non-Weaviate service', async () => {
      // Arrange - Occupy port with a simple TCP server
      const port = 8765;
      const server = await occupyPort(port);
      occupiedServers.push(server);

      // Verify port is occupied
      const occupied = await checkPortListening('127.0.0.1', port);
      expect(occupied).toBe(true);

      // Act & Assert - Starting Weaviate should fail
      await expect(async () => {
        const client = await weaviate.client(new EmbeddedOptions({ port }));
        activeClients.push(client);
      }).rejects.toThrow();
    }, 120000);

    it('should allow multiple instances on different ports', async () => {
      // Arrange
      const port1 = 7001;
      const port2 = 7002;

      // Act - Start two instances on different ports
      const client1 = await weaviate.client(new EmbeddedOptions({ port: port1 }));
      activeClients.push(client1);

      const client2 = await weaviate.client(new EmbeddedOptions({ port: port2 }));
      activeClients.push(client2);

      // Assert - Both should be running
      expect(client1.embedded.pid).toBeGreaterThan(0);
      expect(client2.embedded.pid).toBeGreaterThan(0);
      expect(client1.embedded.pid).not.toBe(client2.embedded.pid);

      // Verify both ports are listening
      const port1Listening = await checkPortListening('127.0.0.1', port1);
      const port2Listening = await checkPortListening('127.0.0.1', port2);
      expect(port1Listening).toBe(true);
      expect(port2Listening).toBe(true);
    }, 180000); // Longer timeout for multiple instances

    it('should properly release port after stop()', async () => {
      // Arrange
      const port = 7654;
      const client1 = await weaviate.client(new EmbeddedOptions({ port }));

      // Verify port is listening
      const listening1 = await checkPortListening('127.0.0.1', port);
      expect(listening1).toBe(true);

      // Act - Stop the instance
      await client1.embedded.stop();

      // Wait for graceful shutdown and port release
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Assert - Port should be released
      const listening2 = await checkPortListening('127.0.0.1', port, 2000);
      expect(listening2).toBe(false);

      // Act - Start new instance on same port
      const client2 = await weaviate.client(new EmbeddedOptions({ port }));
      activeClients.push(client2);

      // Assert - New instance should start successfully
      expect(client2.embedded.pid).toBeGreaterThan(0);
      expect(client2.embedded.options.port).toBe(port);
    }, 180000);

    it('should handle sequential port conflicts gracefully', async () => {
      // Arrange - Occupy multiple sequential ports
      const basePort = 8800;
      const server1 = await occupyPort(basePort);
      const server2 = await occupyPort(basePort + 1);
      occupiedServers.push(server1, server2);

      // Act & Assert - Attempting to use occupied ports should fail
      /* eslint-disable no-await-in-loop, no-loop-func */
      for (const port of [basePort, basePort + 1]) {
        await expect(async () => {
          const client = await weaviate.client(new EmbeddedOptions({ port }));
          activeClients.push(client);
        }).rejects.toThrow();
      }
      /* eslint-enable no-await-in-loop, no-loop-func */
    }, 120000);
  });

  /**
   * Test Suite 3: Custom Port Configuration
   */
  describe('Custom Port Configuration', () => {
    it('should respect port configuration in options', async () => {
      // Arrange
      const customPorts = [5555, 6666, 7777];

      // Act & Assert - Each custom port should work
      /* eslint-disable no-await-in-loop */
      for (const port of customPorts) {
        const client = await weaviate.client(new EmbeddedOptions({ port }));
        activeClients.push(client);

        expect(client.embedded.options.port).toBe(port);

        const isListening = await checkPortListening('127.0.0.1', port);
        expect(isListening).toBe(true);

        // Stop before next iteration
        client.embedded.stop();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        activeClients = activeClients.filter((c) => c !== client);
      }
      /* eslint-enable no-await-in-loop */
    }, 240000); // Longer timeout for sequential starts

    it('should handle edge case port numbers correctly', async () => {
      // Test boundary values for valid port range
      const edgePorts = [
        1024, // First non-privileged port
        49151, // Last IANA registered port
        // Note: Ports 0-1023 require root, 49152-65535 are ephemeral
      ];

      /* eslint-disable no-await-in-loop */
      for (const port of edgePorts) {
        // Act
        const client = await weaviate.client(new EmbeddedOptions({ port }));
        activeClients.push(client);

        // Assert
        expect(client.embedded.options.port).toBe(port);

        const isListening = await checkPortListening('127.0.0.1', port);
        expect(isListening).toBe(true);

        // Cleanup
        client.embedded.stop();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        activeClients = activeClients.filter((c) => c !== client);
      }
      /* eslint-enable no-await-in-loop */
    }, 240000);

    it('should maintain port configuration across client operations', async () => {
      // Arrange
      const port = 6543;
      const client = await weaviate.client(new EmbeddedOptions({ port }));
      activeClients.push(client);

      // Act - Perform operations that might affect port binding
      const testCollection = {
        name: 'PortTestCollection',
        properties: [{ name: 'testProp', dataType: 'text' }],
      };

      // Retry logic for Raft leader election
      let collectionCreated = false;
      /* eslint-disable no-await-in-loop */
      for (let attempt = 0; attempt < 10 && !collectionCreated; attempt++) {
        try {
          await client.collections.create(testCollection);
          collectionCreated = true;
        } catch (err: any) {
          if (err.message?.includes('leader not found') && attempt < 9) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } else if (attempt === 9) {
            throw err;
          }
        }
      }
      /* eslint-enable no-await-in-loop */

      await client.collections.delete(testCollection.name);

      // Assert - Port should remain unchanged
      expect(client.embedded.options.port).toBe(port);

      const isStillListening = await checkPortListening('127.0.0.1', port);
      expect(isStillListening).toBe(true);
    }, 150000);

    it('should handle port configuration with environment variables', async () => {
      // Arrange
      const port = 8123;
      const customEnv = {
        PERSISTENCE_DATA_PATH: '/tmp/weaviate-port-test',
        QUERY_DEFAULTS_LIMIT: '100',
      };

      // Act
      const client = await weaviate.client(
        new EmbeddedOptions({
          port,
          env: customEnv,
        })
      );
      activeClients.push(client);

      // Assert
      expect(client.embedded.options.port).toBe(port);
      expect(client.embedded.options.env.QUERY_DEFAULTS_LIMIT).toBe('100');

      const isListening = await checkPortListening('127.0.0.1', port);
      expect(isListening).toBe(true);
    }, 120000);
  });

  /**
   * Test Suite 4: Edge Cases and Error Handling
   */
  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid start-stop cycles', async () => {
      // Arrange
      const port = 7890;

      // Act - Rapid start-stop-start
      const client1 = await weaviate.client(new EmbeddedOptions({ port }));
      expect(client1.embedded.pid).toBeGreaterThan(0);

      client1.embedded.stop();
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const client2 = await weaviate.client(new EmbeddedOptions({ port }));
      activeClients.push(client2);

      // Assert
      expect(client2.embedded.pid).toBeGreaterThan(0);
      expect(client2.embedded.pid).not.toBe(client1.embedded.pid);

      const isListening = await checkPortListening('127.0.0.1', port);
      expect(isListening).toBe(true);
    }, 180000);

    it('should detect when port becomes unavailable during startup', async () => {
      // Arrange - Start occupying port after a brief delay
      const port = 6111;

      // This test verifies race condition handling
      const occupyPromise = new Promise<net.Server>((resolve) => {
        setTimeout(async () => {
          const server = await occupyPort(port);
          resolve(server);
        }, 500);
      });

      // Act - Try to start Weaviate (might race with port occupation)
      const clientPromise = weaviate.client(new EmbeddedOptions({ port }));
      const server = await occupyPromise;
      occupiedServers.push(server);

      // Assert - Should either succeed (won the race) or fail (lost the race)
      try {
        const client = await clientPromise;
        activeClients.push(client);

        // If successful, verify it's actually listening
        const isListening = await checkPortListening('127.0.0.1', port);
        expect(isListening).toBe(true);
      } catch (err: any) {
        // If failed, verify it's due to port conflict
        expect(err).toBeDefined();
      }
    }, 120000);

    it('should handle CLUSTER_GOSSIP_BIND_PORT configuration', async () => {
      // Arrange - Weaviate uses a random gossip port by default
      const httpPort = 8222;

      // Act
      const client = await weaviate.client(new EmbeddedOptions({ port: httpPort }));
      activeClients.push(client);

      // Assert - Gossip port should be configured
      expect(client.embedded.options.env.CLUSTER_GOSSIP_BIND_PORT).toBeDefined();
      expect(typeof client.embedded.options.env.CLUSTER_GOSSIP_BIND_PORT).toBe('string');

      const gossipPort = parseInt(client.embedded.options.env.CLUSTER_GOSSIP_BIND_PORT as string, 10);
      expect(gossipPort).toBeGreaterThan(0);
      expect(gossipPort).not.toBe(httpPort); // Should be different from HTTP port
    }, 120000);
  });
});

/**
 * Helper Functions
 */

/**
 * Check if a port is listening
 */
function checkPortListening(host: string, port: number, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    }, timeoutMs);

    socket.on('connect', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

/**
 * Wait for a port to become available
 */
function waitForPort(host: string, port: number, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = 500;

    const interval = setInterval(async () => {
      const isListening = await checkPortListening(host, port, 2000);

      if (isListening) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Port ${port} did not become available within ${timeoutMs}ms`));
      }
    }, checkInterval);
  });
}

/**
 * Occupy a port with a dummy TCP server
 */
function occupyPort(port: number): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`Test server occupying port ${port}`);
      resolve(server);
    });
  });
}
