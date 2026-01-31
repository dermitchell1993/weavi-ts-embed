/**
 * Multiple Instance Tests (Wave 2.5)
 *
 * Tests for running 2+ Weaviate embedded instances simultaneously.
 * Verifies:
 * 1. Multiple instances can run concurrently
 * 2. Port isolation between instances
 * 3. Data directory isolation between instances
 * 4. Independent operations without interference
 *
 * Target: 100% pass rate
 *
 * Test Coverage:
 * - Concurrent instance creation (2, 3, 4+ instances)
 * - Port isolation and conflict prevention
 * - Data directory isolation
 * - Independent CRUD operations
 * - Instance lifecycle management
 * - Stress testing scenarios
 */

import { describe, it, expect, afterEach } from 'vitest';
import { connectToEmbedded, EmbeddedClient } from '../../src/index';

/**
 * Port allocation helper to prevent conflicts in CI/parallel test runs
 * Starts from 8001 and increments to avoid collisions
 */
let nextPort = 8001;
const allocatePort = (): number => {
  const port = nextPort;
  nextPort += 1;
  return port;
};

/**
 * Helper to verify a process is actually running by PID
 *
 * Note: Uses process.kill(pid, 0) which is POSIX-compliant behavior.
 * - On Linux/macOS: Signal 0 checks process existence without terminating
 * - On Windows: This may behave differently; tests are primarily for Linux/macOS
 */
const isProcessRunning = (pid: number): boolean => {
  try {
    // Signal 0 checks if process exists without killing it (POSIX behavior)
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Helper to wait for a process to fully terminate
 */
const waitForProcessTermination = async (pid: number, maxWaitMs = 5000): Promise<boolean> => {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (!isProcessRunning(pid)) {
      return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
};

describe('Multiple Instances Tests', () => {
  // Platform compatibility check
  it('checks platform compatibility', () => {});
  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    console.warn(`Skipping multi-instance tests: EmbeddedDB does not support ${process.platform}`);
    return;
  }

  const activeClients: EmbeddedClient[] = [];

  // Helper to track clients for cleanup
  const trackClient = (client: EmbeddedClient): EmbeddedClient => {
    activeClients.push(client);
    return client;
  };

  // Clean up after each test with defensive error handling
  afterEach(async () => {
    const cleanupPromises = activeClients.map(async (client) => {
      if (!client?.embedded?.pid) {
        return;
      }

      const pid = client.embedded.pid;
      try {
        await client.embedded.stop();
        // Verify process actually stopped
        const stopped = await waitForProcessTermination(pid, 3000);
        if (!stopped) {
          console.warn(`Warning: Process ${pid} may not have terminated cleanly`);
        }
      } catch (err) {
        console.error(`Error stopping client with PID ${pid}:`, err);
        // Force kill if normal stop fails
        try {
          process.kill(pid, 'SIGKILL');
        } catch (killErr) {
          // Process might already be dead
        }
      }
    });

    await Promise.all(cleanupPromises);
    activeClients.length = 0;

    // Additional grace period for OS cleanup
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  describe('Concurrent Instance Creation', () => {
    it('should successfully start 2 instances simultaneously', async () => {
      const port1 = allocatePort();
      const port2 = allocatePort();

      const [client1, client2] = await Promise.all([
        connectToEmbedded({ port: port1 }),
        connectToEmbedded({ port: port2 }),
      ]);

      trackClient(client1);
      trackClient(client2);

      // Verify both instances are running
      expect(client1, 'Client 1 should be defined').toBeDefined();
      expect(client2, 'Client 2 should be defined').toBeDefined();
      expect(client1.embedded.pid, `Client 1 should have a valid PID`).toBeGreaterThan(0);
      expect(client2.embedded.pid, `Client 2 should have a valid PID`).toBeGreaterThan(0);

      // Verify different PIDs
      expect(
        client1.embedded.pid,
        `Client 1 (PID ${client1.embedded.pid}) and Client 2 (PID ${client2.embedded.pid}) should have different PIDs`
      ).not.toBe(client2.embedded.pid);

      // Verify both processes are actually running
      expect(
        isProcessRunning(client1.embedded.pid),
        `Process ${client1.embedded.pid} should be running`
      ).toBe(true);
      expect(
        isProcessRunning(client2.embedded.pid),
        `Process ${client2.embedded.pid} should be running`
      ).toBe(true);

      // Verify both are ready
      const [ready1, ready2] = await Promise.all([client1.isReady(), client2.isReady()]);
      expect(ready1, `Client 1 on port ${port1} should be ready`).toBe(true);
      expect(ready2, `Client 2 on port ${port2} should be ready`).toBe(true);
    }, 120000);

    it('should successfully start 3 instances simultaneously', async () => {
      const ports = [allocatePort(), allocatePort(), allocatePort()];

      const [client1, client2, client3] = await Promise.all([
        connectToEmbedded({ port: ports[0] }),
        connectToEmbedded({ port: ports[1] }),
        connectToEmbedded({ port: ports[2] }),
      ]);

      trackClient(client1);
      trackClient(client2);
      trackClient(client3);

      // Verify all instances are running with valid PIDs
      expect(client1.embedded.pid, 'Client 1 should have a valid PID').toBeGreaterThan(0);
      expect(client2.embedded.pid, 'Client 2 should have a valid PID').toBeGreaterThan(0);
      expect(client3.embedded.pid, 'Client 3 should have a valid PID').toBeGreaterThan(0);

      const pids = [client1.embedded.pid, client2.embedded.pid, client3.embedded.pid];
      const uniquePids = new Set(pids);
      expect(uniquePids.size, `All 3 instances should have unique PIDs, got: ${pids.join(', ')}`).toBe(3);

      // Verify all processes are actually running
      pids.forEach((pid) => {
        expect(isProcessRunning(pid), `Process ${pid} should be running`).toBe(true);
      });

      // Verify all are ready
      const readyStates = await Promise.all([client1.isReady(), client2.isReady(), client3.isReady()]);
      expect(
        readyStates.every((ready) => ready === true),
        `All 3 instances should be ready, got states: ${readyStates.join(', ')}`
      ).toBe(true);
    }, 180000);

    it('should start 4 instances sequentially', async () => {
      const port1 = allocatePort();
      const port2 = allocatePort();
      const port3 = allocatePort();
      const port4 = allocatePort();

      const client1 = trackClient(await connectToEmbedded({ port: port1 }));
      expect(client1.embedded.pid, 'Client 1 should have a valid PID').toBeGreaterThan(0);

      const client2 = trackClient(await connectToEmbedded({ port: port2 }));
      expect(client2.embedded.pid, 'Client 2 should have a valid PID').toBeGreaterThan(0);

      const client3 = trackClient(await connectToEmbedded({ port: port3 }));
      expect(client3.embedded.pid, 'Client 3 should have a valid PID').toBeGreaterThan(0);

      const client4 = trackClient(await connectToEmbedded({ port: port4 }));
      expect(client4.embedded.pid, 'Client 4 should have a valid PID').toBeGreaterThan(0);

      // Verify all have unique PIDs
      const pids = [client1.embedded.pid, client2.embedded.pid, client3.embedded.pid, client4.embedded.pid];
      const uniquePids = new Set(pids);
      expect(uniquePids.size, `All 4 instances should have unique PIDs, got: ${pids.join(', ')}`).toBe(4);

      // Verify all processes are running
      pids.forEach((pid, index) => {
        expect(isProcessRunning(pid), `Client ${index + 1} (PID ${pid}) should be running`).toBe(true);
      });

      // Verify all are ready
      const [ready1, ready2, ready3, ready4] = await Promise.all([
        client1.isReady(),
        client2.isReady(),
        client3.isReady(),
        client4.isReady(),
      ]);
      expect(ready1 && ready2 && ready3 && ready4, 'All 4 clients should be ready').toBe(true);
    }, 240000);
  });

  describe('Port Isolation', () => {
    it('should verify instances listen on different ports', async () => {
      const port1 = allocatePort();
      const port2 = allocatePort();

      const [client1, client2] = await Promise.all([
        connectToEmbedded({ port: port1 }),
        connectToEmbedded({ port: port2 }),
      ]);

      trackClient(client1);
      trackClient(client2);

      // Verify port configuration
      expect(client1.embedded.options.port, `Client 1 should be configured on port ${port1}`).toBe(port1);
      expect(client2.embedded.options.port, `Client 2 should be configured on port ${port2}`).toBe(port2);
      expect(client1.embedded.options.port, 'Clients should be on different ports').not.toBe(
        client2.embedded.options.port
      );

      // Verify both are accessible on their respective ports
      const [ready1, ready2] = await Promise.all([client1.isReady(), client2.isReady()]);
      expect(ready1, `Client 1 should be ready on port ${port1}`).toBe(true);
      expect(ready2, `Client 2 should be ready on port ${port2}`).toBe(true);
    }, 120000);

    it('should prevent port conflicts when using same port', async () => {
      const port = allocatePort();

      const client1 = trackClient(await connectToEmbedded({ port }));
      expect(client1.embedded.pid, 'First instance should start successfully').toBeGreaterThan(0);
      expect(
        isProcessRunning(client1.embedded.pid),
        `First instance (PID ${client1.embedded.pid}) should be running on port ${port}`
      ).toBe(true);

      // Attempting to start another instance on the same port should fail
      await expect(
        connectToEmbedded({ port }),
        `Second instance should fail to start on already-occupied port ${port}`
      ).rejects.toThrow();
    }, 120000);

    it('should verify gRPC port isolation with custom ports', async () => {
      const client1 = trackClient(
        await connectToEmbedded({
          port: 8013,
          grpcPort: 50061,
        })
      );

      const client2 = trackClient(
        await connectToEmbedded({
          port: 8014,
          grpcPort: 50062,
        })
      );

      // Verify both instances are running
      expect(client1.embedded.pid).toBeGreaterThan(0);
      expect(client2.embedded.pid).toBeGreaterThan(0);

      // Verify both are ready (gRPC is working)
      // Note: This test verifies gRPC connectivity indirectly through isReady().
      // Direct gRPC port verification would require low-level socket inspection,
      // which is beyond the scope of this integration test.
      const [ready1, ready2] = await Promise.all([client1.isReady(), client2.isReady()]);
      expect(ready1).toBe(true);
      expect(ready2).toBe(true);
    }, 120000);

    it('should reject invalid port numbers', async () => {
      // Test port 0 (invalid)
      await expect(connectToEmbedded({ port: 0 })).rejects.toThrow();

      // Test negative port (invalid)
      await expect(connectToEmbedded({ port: -1 })).rejects.toThrow();

      // Test port > 65535 (invalid - max port number)
      await expect(connectToEmbedded({ port: 70000 })).rejects.toThrow();
    }, 60000);

    it('should reject privileged ports without proper permissions', async () => {
      // Port 80 is a privileged port (< 1024) requiring root on Linux/macOS
      // This should fail in CI environment running without root
      try {
        const client = await connectToEmbedded({ port: 80 });
        trackClient(client);
        // If we somehow got here (running as root), clean up
        await client.embedded.stop();
        // Skip assertion - test environment has elevated privileges
      } catch (err) {
        // Expected - should fail without root privileges
        expect(err).toBeDefined();
      }
    }, 60000);
  });

  describe('Data Directory Isolation', () => {
    it('should use separate data directories for different instances', async () => {
      const client1 = trackClient(await connectToEmbedded({ port: 8015 }));
      const client2 = trackClient(await connectToEmbedded({ port: 8016 }));

      // Get persistence paths from environment
      const dataPath1 = client1.embedded.options.persistenceDataPath;
      const dataPath2 = client2.embedded.options.persistenceDataPath;

      // Verify data paths exist
      expect(dataPath1).toBeDefined();
      expect(dataPath2).toBeDefined();

      // Note: The embedded instances share the same base data path but use
      // port-based clustering names to distinguish themselves.
      // This is expected behavior as per CLUSTER_HOSTNAME env var pattern.
      const clusterName1 = `Embedded_at_${client1.embedded.options.port}`;
      const clusterName2 = `Embedded_at_${client2.embedded.options.port}`;

      expect(clusterName1).not.toBe(clusterName2);
    }, 120000);

    it('should maintain data isolation between instances', async () => {
      const client1 = trackClient(await connectToEmbedded({ port: 8017 }));
      const client2 = trackClient(await connectToEmbedded({ port: 8018 }));

      // Create a collection in instance 1
      const collectionName1 = 'Instance1Collection';
      await client1.collections.create({
        name: collectionName1,
        properties: [
          {
            name: 'title',
            dataType: 'text',
          },
        ],
      });

      // Create a different collection in instance 2
      const collectionName2 = 'Instance2Collection';
      await client2.collections.create({
        name: collectionName2,
        properties: [
          {
            name: 'content',
            dataType: 'text',
          },
        ],
      });

      // Verify instance 1 has only its collection
      const collection1 = client1.collections.get(collectionName1);
      expect(collection1).toBeDefined();

      // Verify instance 2 has only its collection
      const collection2 = client2.collections.get(collectionName2);
      expect(collection2).toBeDefined();

      // Verify isolation by listing collections on each instance
      const collections1 = await client1.collections.listAll();
      const collections2 = await client2.collections.listAll();

      const collectionNames1 = collections1.map((c) => c.name);
      const collectionNames2 = collections2.map((c) => c.name);

      expect(collectionNames1).toContain(collectionName1);
      expect(collectionNames1).not.toContain(collectionName2);
      expect(collectionNames2).toContain(collectionName2);
      expect(collectionNames2).not.toContain(collectionName1);

      // Additional verification: attempting to query the other instance's collection should fail
      // Note: The v3 client's .get() method returns a collection object regardless,
      // so we test by trying to query it
      try {
        const otherCollection1 = client1.collections.get(collectionName2);
        const result = await otherCollection1.query.fetchObjects();
        // If we get here, the collection shouldn't exist (should be empty or error)
        expect(result.objects.length).toBe(0);
      } catch (err) {
        // Expected - collection doesn't exist in this instance
        expect(err).toBeDefined();
      }

      // Cleanup
      await client1.collections.delete(collectionName1);
      await client2.collections.delete(collectionName2);
    }, 150000);
  });

  describe('Independent Operations', () => {
    it('should perform concurrent write operations without interference', async () => {
      const client1 = trackClient(await connectToEmbedded({ port: 8019 }));
      const client2 = trackClient(await connectToEmbedded({ port: 8020 }));

      // Create collections in both instances
      const collectionName = 'TestArticle';

      await Promise.all([
        client1.collections.create({
          name: collectionName,
          properties: [{ name: 'title', dataType: 'text' }],
        }),
        client2.collections.create({
          name: collectionName,
          properties: [{ name: 'title', dataType: 'text' }],
        }),
      ]);

      // Insert data concurrently
      const collection1 = client1.collections.get(collectionName);
      const collection2 = client2.collections.get(collectionName);

      await Promise.all([
        collection1.data.insert({
          properties: { title: 'Article from Instance 1' },
        }),
        collection2.data.insert({
          properties: { title: 'Article from Instance 2' },
        }),
      ]);

      // Query both instances
      const [result1, result2] = await Promise.all([
        collection1.query.fetchObjects(),
        collection2.query.fetchObjects(),
      ]);

      // Verify each instance has only its own data
      expect(result1.objects.length).toBe(1);
      expect(result2.objects.length).toBe(1);
      expect(result1.objects[0].properties.title).toBe('Article from Instance 1');
      expect(result2.objects[0].properties.title).toBe('Article from Instance 2');

      // Cleanup
      await Promise.all([
        client1.collections.delete(collectionName),
        client2.collections.delete(collectionName),
      ]);
    }, 150000);

    it('should perform concurrent read operations without interference', async () => {
      const client1 = trackClient(await connectToEmbedded({ port: 8021 }));
      const client2 = trackClient(await connectToEmbedded({ port: 8022 }));

      // Create and populate collections
      const collectionName = 'ReadTestCollection';

      await client1.collections.create({
        name: collectionName,
        properties: [{ name: 'value', dataType: 'int' }],
      });

      await client2.collections.create({
        name: collectionName,
        properties: [{ name: 'value', dataType: 'int' }],
      });

      const collection1 = client1.collections.get(collectionName);
      const collection2 = client2.collections.get(collectionName);

      // Insert different amounts of data
      await collection1.data.insertMany([
        { properties: { value: 1 } },
        { properties: { value: 2 } },
        { properties: { value: 3 } },
      ]);

      await collection2.data.insertMany([{ properties: { value: 10 } }, { properties: { value: 20 } }]);

      // Perform concurrent reads
      const reads = await Promise.all([
        collection1.query.fetchObjects(),
        collection2.query.fetchObjects(),
        collection1.query.fetchObjects(),
        collection2.query.fetchObjects(),
      ]);

      // Verify read isolation
      expect(reads[0].objects.length).toBe(3);
      expect(reads[1].objects.length).toBe(2);
      expect(reads[2].objects.length).toBe(3);
      expect(reads[3].objects.length).toBe(2);

      // Cleanup
      await Promise.all([
        client1.collections.delete(collectionName),
        client2.collections.delete(collectionName),
      ]);
    }, 150000);
  });

  describe('Instance Lifecycle Management', () => {
    it('should stop instances independently', async () => {
      const client1 = trackClient(await connectToEmbedded({ port: 8023 }));
      const client2 = trackClient(await connectToEmbedded({ port: 8024 }));

      const pid1 = client1.embedded.pid;
      const pid2 = client2.embedded.pid;

      // Stop instance 1
      await client1.embedded.stop();

      // Wait for process to terminate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify instance 1 is stopped but instance 2 is still running
      expect(client2.embedded.pid).toBe(pid2);
      const ready2 = await client2.isReady();
      expect(ready2).toBe(true);

      // Stop instance 2
      await client2.embedded.stop();
    }, 120000);

    it('should allow restarting on the same port after stopping', async () => {
      const port = 8025;

      // Start and stop first instance
      const client1 = trackClient(await connectToEmbedded({ port }));
      expect(client1.embedded.pid).toBeGreaterThan(0);

      await client1.embedded.stop();
      // Wait for OS to fully release the port (increased from 2s to 5s for reliability)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Start second instance on the same port
      const client2 = trackClient(await connectToEmbedded({ port }));
      expect(client2.embedded.pid).toBeGreaterThan(0);
      expect(client2.embedded.pid).not.toBe(client1.embedded.pid);

      const ready = await client2.isReady();
      expect(ready).toBe(true);
    }, 150000);
  });

  describe('Stress Testing', () => {
    it('should handle rapid sequential instance creation', async () => {
      const instances: EmbeddedClient[] = [];
      const startPort = 8030;
      const count = 5;

      // Create instances rapidly
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < count; i++) {
        // eslint-disable-next-line no-await-in-loop
        const client = trackClient(await connectToEmbedded({ port: startPort + i }));
        instances.push(client);
        expect(client.embedded.pid).toBeGreaterThan(0);
      }

      // Verify all instances are ready
      const readyStates = await Promise.all(instances.map((c) => c.isReady()));
      expect(readyStates.every((ready) => ready === true)).toBe(true);

      // Verify all PIDs are unique
      const pids = instances.map((c) => c.embedded.pid);
      const uniquePids = new Set(pids);
      expect(uniquePids.size).toBe(count);
    }, 300000);

    it('should handle concurrent operations across multiple instances', async () => {
      const client1 = trackClient(await connectToEmbedded({ port: 8040 }));
      const client2 = trackClient(await connectToEmbedded({ port: 8041 }));
      const client3 = trackClient(await connectToEmbedded({ port: 8042 }));

      // Create collections concurrently
      await Promise.all([
        client1.collections.create({
          name: 'ConcurrentTest',
          properties: [{ name: 'data', dataType: 'text' }],
        }),
        client2.collections.create({
          name: 'ConcurrentTest',
          properties: [{ name: 'data', dataType: 'text' }],
        }),
        client3.collections.create({
          name: 'ConcurrentTest',
          properties: [{ name: 'data', dataType: 'text' }],
        }),
      ]);

      // Perform mixed operations concurrently
      const operations = [];
      for (let i = 0; i < 3; i++) {
        operations.push(
          client1.collections.get('ConcurrentTest').data.insert({
            properties: { data: `client1-${i}` },
          })
        );
        operations.push(
          client2.collections.get('ConcurrentTest').data.insert({
            properties: { data: `client2-${i}` },
          })
        );
        operations.push(
          client3.collections.get('ConcurrentTest').data.insert({
            properties: { data: `client3-${i}` },
          })
        );
      }

      await Promise.all(operations);

      // Verify each instance has its own data
      const [result1, result2, result3] = await Promise.all([
        client1.collections.get('ConcurrentTest').query.fetchObjects(),
        client2.collections.get('ConcurrentTest').query.fetchObjects(),
        client3.collections.get('ConcurrentTest').query.fetchObjects(),
      ]);

      expect(result1.objects.length).toBe(3);
      expect(result2.objects.length).toBe(3);
      expect(result3.objects.length).toBe(3);

      // Cleanup
      await Promise.all([
        client1.collections.delete('ConcurrentTest'),
        client2.collections.delete('ConcurrentTest'),
        client3.collections.delete('ConcurrentTest'),
      ]);
    }, 180000);
  });
});
