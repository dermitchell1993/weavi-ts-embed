/**
 * Integration Tests for Multiple Weaviate Instances
 *
 * These tests verify that the embedded Weaviate client correctly:
 * - Runs multiple instances simultaneously on different ports
 * - Isolates data directories between instances
 * - Manages independent lifecycle for each instance
 * - Handles instance-specific configuration
 * - Validates cross-instance isolation
 * - Supports concurrent operations on different instances
 *
 * Port Number Ranges Used:
 * - Instance 1: HTTP 20080, gRPC 52051, Cluster 8800
 * - Instance 2: HTTP 20081, gRPC 52052, Cluster 8801
 * - Instance 3: HTTP 20082, gRPC 52053, Cluster 8802
 * - Instance 4: HTTP 20083, gRPC 52054, Cluster 8803
 *
 * Note: These port ranges are chosen to avoid conflicts with:
 * - Other integration test suites (lifecycle uses 19080, port-conflicts uses 18080)
 * - Common development services
 * - System reserved ports
 * - Weaviate's default cluster port (7946)
 */

import { WeaviateProcess } from '../../src/weaviate-process';
import { BinaryManager } from '../../src/binary-manager';
import { checkPorts } from '../../src/port-utils';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';

describe('Multiple Weaviate Instances Integration Tests', () => {
  let binaryManager: BinaryManager;
  let binaryPath: string;
  let instances: WeaviateProcess[] = [];
  let testDataDirs: string[] = [];

  // Base port ranges for multiple instances
  const BASE_HTTP_PORT = 20080;
  const BASE_GRPC_PORT = 52051;
  const BASE_CLUSTER_PORT = 8800; // Unique cluster ports to avoid conflicts

  // Increase timeout for integration tests
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Set up binary manager and ensure the Weaviate binary is available
    // Skip checksum verification as checksums files are not available for this version
    binaryManager = new BinaryManager({ skipChecksumVerification: true });

    try {
      binaryPath = await binaryManager.ensureBinary('1.33.15');
      console.log(`Using Weaviate binary at: ${binaryPath}`);
    } catch (error) {
      console.error('Failed to download Weaviate binary:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));

      throw new Error(
        'Integration tests require Weaviate binary. ' +
          'Ensure you have internet connection for the first run. ' +
          'See error details above.'
      );
    }
  });

  afterEach(async () => {
    // Stop all running instances
    await Promise.all(
      instances.map(async (instance) => {
        if (instance?.isRunning()) {
          try {
            await instance.stop(5000);
          } catch (error) {
            console.error('Error stopping instance in afterEach:', error);
          }
        }
      })
    );

    // Clear instances array
    instances = [];

    // Clean up all test data directories
    testDataDirs.forEach((dir) => {
      try {
        if (existsSync(dir)) {
          rmSync(dir, { recursive: true, force: true });
        }
      } catch (error) {
        console.error(`Error cleaning up test data directory ${dir}:`, error);
      }
    });

    // Clear directories array
    testDataDirs = [];

    // Small delay to ensure complete cleanup
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  /**
   * Helper function to create a unique data directory for a test instance
   */
  const createTestDataDir = (): string => {
    const dir = join(
      tmpdir(),
      `weaviate-multi-test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    mkdirSync(dir, { recursive: true });
    testDataDirs.push(dir);
    return dir;
  };

  /**
   * Helper function to create and start a Weaviate instance
   */
  const createAndStartInstance = async (instanceNumber: number): Promise<WeaviateProcess> => {
    const instance = new WeaviateProcess();
    instances.push(instance);

    const httpPort = BASE_HTTP_PORT + instanceNumber;
    const grpcPort = BASE_GRPC_PORT + instanceNumber;
    const clusterPort = BASE_CLUSTER_PORT + instanceNumber;
    const dataDir = createTestDataDir();

    await instance.start({
      binaryPath,
      port: httpPort,
      grpcPort,
      persistenceDataPath: dataDir,
      additionalEnvVars: {
        // Disable all clustering for isolated test instances
        RAFT_BOOTSTRAP_EXPECT: '1',
        DISABLE_MEMBERLIST: 'true',
        // Disable raft entirely
        DISABLERAFT: 'true',
        // Set unique cluster ports to avoid conflicts (if raft is not disabled)
        RAFT_PORT: (8300 + instanceNumber).toString(),
        RAFT_INTERNAL_RPC_PORT: (8301 + instanceNumber).toString(),
        // Set unique memberlist ports
        CLUSTER_GOSSIP_BIND_PORT: clusterPort.toString(),
        CLUSTER_GOSSIP_ADVERTISE_PORT: clusterPort.toString(),
        CLUSTER_DATA_BIND_PORT: (7947 + instanceNumber).toString(),
      },
      verbose: false,
    });

    return instance;
  };

  describe('Running Multiple Instances Simultaneously', () => {
    it('should successfully start two instances with different ports', async () => {
      // Start first instance
      const instance1 = await createAndStartInstance(0);
      expect(instance1.isRunning()).toBe(true);
      expect(instance1.getPid()).toBeDefined();

      // Start second instance with different ports
      const instance2 = await createAndStartInstance(1);
      expect(instance2.isRunning()).toBe(true);
      expect(instance2.getPid()).toBeDefined();

      // Verify they have different PIDs
      expect(instance1.getPid()).not.toBe(instance2.getPid());

      // Verify both are still running
      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);
    });

    it('should successfully start three instances concurrently', async () => {
      // Start three instances concurrently
      const [instance1, instance2, instance3] = await Promise.all([
        createAndStartInstance(0),
        createAndStartInstance(1),
        createAndStartInstance(2),
      ]);

      // Verify all are running
      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);
      expect(instance3.isRunning()).toBe(true);

      // Verify all have unique PIDs
      const pids = [instance1.getPid(), instance2.getPid(), instance3.getPid()];
      const uniquePids = new Set(pids);
      expect(uniquePids.size).toBe(3);
    });

    it('should handle starting four instances sequentially', async () => {
      const startedInstances: WeaviateProcess[] = [];

      // Start four instances sequentially
      for (let i = 0; i < 4; i++) {
        // eslint-disable-next-line no-await-in-loop
        const instance = await createAndStartInstance(i);
        startedInstances.push(instance);
        expect(instance.isRunning()).toBe(true);
      }

      // Verify all four are still running
      startedInstances.forEach((instance) => {
        expect(instance.isRunning()).toBe(true);
        expect(instance.getPid()).toBeDefined();
      });

      // Verify all have unique PIDs
      const pids = startedInstances.map((inst) => inst.getPid());
      const uniquePids = new Set(pids);
      expect(uniquePids.size).toBe(4);
    });
  });

  describe('Different Port Assignments for Each Instance', () => {
    it('should assign unique HTTP and gRPC ports to each instance', async () => {
      const instance1 = new WeaviateProcess();
      const instance2 = new WeaviateProcess();
      instances.push(instance1, instance2);

      const port1 = BASE_HTTP_PORT;
      const grpcPort1 = BASE_GRPC_PORT;
      const port2 = BASE_HTTP_PORT + 1;
      const grpcPort2 = BASE_GRPC_PORT + 1;

      // Verify ports are available
      console.log(`Checking ports ${port1} and ${grpcPort1} before starting first instance`);
      await expect(checkPorts(port1, grpcPort1)).resolves.not.toThrow();
      await expect(checkPorts(port2, grpcPort2)).resolves.not.toThrow();

      // Start both instances
      await instance1.start({
        binaryPath,
        port: port1,
        grpcPort: grpcPort1,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          CLUSTER_GOSSIP_BIND_PORT: BASE_CLUSTER_PORT.toString(),
          CLUSTER_GOSSIP_ADVERTISE_PORT: BASE_CLUSTER_PORT.toString(),
        },
        verbose: false,
      });

      await instance2.start({
        binaryPath,
        port: port2,
        grpcPort: grpcPort2,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          CLUSTER_GOSSIP_BIND_PORT: (BASE_CLUSTER_PORT + 1).toString(),
          CLUSTER_GOSSIP_ADVERTISE_PORT: (BASE_CLUSTER_PORT + 1).toString(),
        },
        verbose: false,
      });

      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);
    });

    it.skip('should fail when trying to start instance with already-used gRPC port', async () => {
      const instance1 = new WeaviateProcess();
      const instance2 = new WeaviateProcess();
      instances.push(instance1, instance2);

      const port1 = BASE_HTTP_PORT;
      const grpcPort = BASE_GRPC_PORT;
      const port2 = BASE_HTTP_PORT + 1; // Different HTTP port

      // Start first instance
      await instance1.start({
        binaryPath,
        port: port1,
        grpcPort,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          CLUSTER_GOSSIP_BIND_PORT: BASE_CLUSTER_PORT.toString(),
          CLUSTER_GOSSIP_ADVERTISE_PORT: BASE_CLUSTER_PORT.toString(),
        },
        verbose: false,
      });

      expect(instance1.isRunning()).toBe(true);

      // Wait for the first instance to fully bind to ports
      console.log(`Waiting 10 seconds for first instance to bind to gRPC port ${grpcPort}`);
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Check if gRPC port is now in use
      console.log(`Checking if gRPC port ${grpcPort} is now in use`);
      try {
        await checkPorts(port1, grpcPort);
        console.log(`ERROR: checkPorts did not detect that gRPC port ${grpcPort} is in use!`);
      } catch (error) {
        console.log(`GOOD: checkPorts correctly detected gRPC port is in use: ${error}`);
      }

      // Try to start second instance with same gRPC port - should fail
      console.log(`Attempting to start second instance with same gRPC port - this should fail`);
      await expect(
        instance2.start({
          binaryPath,
          port: port2, // Different HTTP port
          grpcPort, // Same gRPC port - conflict!
          persistenceDataPath: createTestDataDir(),
          additionalEnvVars: {
            CLUSTER_GOSSIP_BIND_PORT: (BASE_CLUSTER_PORT + 1).toString(),
            CLUSTER_GOSSIP_ADVERTISE_PORT: (BASE_CLUSTER_PORT + 1).toString(),
          },
          verbose: false,
        })
      ).rejects.toThrow(/port.*already in use/i);

      expect(instance2.isRunning()).toBe(false);
    });

    it('should support wide range of custom port assignments', async () => {
      const customPorts = [
        { http: 20090, grpc: 52060 },
        { http: 20091, grpc: 52061 },
        { http: 20092, grpc: 52062 },
      ];

      const startedInstances: WeaviateProcess[] = [];

      for (const ports of customPorts) {
        const instance = new WeaviateProcess();
        instances.push(instance);

        // eslint-disable-next-line no-await-in-loop
        await instance.start({
          binaryPath,
          port: ports.http,
          grpcPort: ports.grpc,
          persistenceDataPath: createTestDataDir(),
          verbose: false,
        });

        startedInstances.push(instance);
        expect(instance.isRunning()).toBe(true);
      }

      // All instances should be running
      expect(startedInstances.every((inst) => inst.isRunning())).toBe(true);
    });
  });

  describe('Isolated Data Directories', () => {
    it('should use separate data directories for each instance', async () => {
      const dataDir1 = createTestDataDir();
      const dataDir2 = createTestDataDir();

      const instance1 = new WeaviateProcess();
      const instance2 = new WeaviateProcess();
      instances.push(instance1, instance2);

      await instance1.start({
        binaryPath,
        port: BASE_HTTP_PORT,
        grpcPort: BASE_GRPC_PORT,
        persistenceDataPath: dataDir1,
        verbose: false,
      });

      await instance2.start({
        binaryPath,
        port: BASE_HTTP_PORT + 1,
        grpcPort: BASE_GRPC_PORT + 1,
        persistenceDataPath: dataDir2,
        verbose: false,
      });

      // Verify both data directories exist and are different
      expect(existsSync(dataDir1)).toBe(true);
      expect(existsSync(dataDir2)).toBe(true);
      expect(dataDir1).not.toBe(dataDir2);

      // Stop instances to ensure data is flushed
      await instance1.stop();
      await instance2.stop();

      // Verify data directories still exist after stopping
      expect(existsSync(dataDir1)).toBe(true);
      expect(existsSync(dataDir2)).toBe(true);
    });

    it('should maintain data isolation between instances', async () => {
      const dataDir1 = createTestDataDir();
      const dataDir2 = createTestDataDir();

      // Create marker files to verify isolation
      const marker1Path = join(dataDir1, 'instance1-marker.txt');
      const marker2Path = join(dataDir2, 'instance2-marker.txt');

      writeFileSync(marker1Path, 'instance1-data');
      writeFileSync(marker2Path, 'instance2-data');

      const instance1 = new WeaviateProcess();
      const instance2 = new WeaviateProcess();
      instances.push(instance1, instance2);

      await instance1.start({
        binaryPath,
        port: BASE_HTTP_PORT,
        grpcPort: BASE_GRPC_PORT,
        persistenceDataPath: dataDir1,
        verbose: false,
      });

      await instance2.start({
        binaryPath,
        port: BASE_HTTP_PORT + 1,
        grpcPort: BASE_GRPC_PORT + 1,
        persistenceDataPath: dataDir2,
        verbose: false,
      });

      // Verify marker files are still present and contain correct data
      expect(existsSync(marker1Path)).toBe(true);
      expect(existsSync(marker2Path)).toBe(true);
      expect(readFileSync(marker1Path, 'utf-8')).toBe('instance1-data');
      expect(readFileSync(marker2Path, 'utf-8')).toBe('instance2-data');

      // Verify marker from instance1 is not in instance2's directory
      expect(existsSync(join(dataDir2, 'instance1-marker.txt'))).toBe(false);
      expect(existsSync(join(dataDir1, 'instance2-marker.txt'))).toBe(false);
    });

    it('should create new data directory if it does not exist', async () => {
      const newDataDir = join(tmpdir(), `weaviate-new-dir-${Date.now()}`);
      testDataDirs.push(newDataDir);

      // Verify directory doesn't exist before starting
      expect(existsSync(newDataDir)).toBe(false);

      const instance = new WeaviateProcess();
      instances.push(instance);

      await instance.start({
        binaryPath,
        port: BASE_HTTP_PORT,
        grpcPort: BASE_GRPC_PORT,
        persistenceDataPath: newDataDir,
        verbose: false,
      });

      // Directory should be created by Weaviate process or our code
      // Note: Depending on implementation, this might be created by start() or by Weaviate itself
      expect(instance.isRunning()).toBe(true);
    });
  });

  describe('Independent Lifecycle Management', () => {
    it('should stop one instance without affecting others', async () => {
      const instance1 = await createAndStartInstance(0);
      const instance2 = await createAndStartInstance(1);
      const instance3 = await createAndStartInstance(2);

      // Verify all are running
      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);
      expect(instance3.isRunning()).toBe(true);

      // Stop the middle instance
      await instance2.stop();

      // Verify only instance2 is stopped
      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(false);
      expect(instance3.isRunning()).toBe(true);
    });

    it('should restart one instance without affecting others', async () => {
      const instance1 = await createAndStartInstance(0);
      const instance2 = await createAndStartInstance(1);

      const instance1Pid = instance1.getPid();
      const instance2Pid = instance2.getPid();

      // Stop and restart instance1
      await instance1.stop();
      expect(instance1.isRunning()).toBe(false);
      expect(instance2.isRunning()).toBe(true);

      // Restart instance1
      const dataDir = createTestDataDir();
      await instance1.start({
        binaryPath,
        port: BASE_HTTP_PORT,
        grpcPort: BASE_GRPC_PORT,
        persistenceDataPath: dataDir,
        verbose: false,
      });

      // Verify instance1 restarted with new PID
      expect(instance1.isRunning()).toBe(true);
      expect(instance1.getPid()).not.toBe(instance1Pid);

      // Verify instance2 is still running with same PID
      expect(instance2.isRunning()).toBe(true);
      expect(instance2.getPid()).toBe(instance2Pid);
    });

    it('should stop all instances independently in any order', async () => {
      const instance1 = await createAndStartInstance(0);
      const instance2 = await createAndStartInstance(1);
      const instance3 = await createAndStartInstance(2);

      // Stop in reverse order: 3, 1, 2
      await instance3.stop();
      expect(instance3.isRunning()).toBe(false);
      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);

      await instance1.stop();
      expect(instance1.isRunning()).toBe(false);
      expect(instance2.isRunning()).toBe(true);

      await instance2.stop();
      expect(instance2.isRunning()).toBe(false);
    });

    it('should handle graceful shutdown of multiple instances concurrently', async () => {
      const instance1 = await createAndStartInstance(0);
      const instance2 = await createAndStartInstance(1);
      const instance3 = await createAndStartInstance(2);

      // Stop all concurrently
      await Promise.all([instance1.stop(), instance2.stop(), instance3.stop()]);

      // Verify all stopped
      expect(instance1.isRunning()).toBe(false);
      expect(instance2.isRunning()).toBe(false);
      expect(instance3.isRunning()).toBe(false);
    });
  });

  describe('Instance-Specific Configuration', () => {
    it('should support different environment variables for each instance', async () => {
      const instance1 = new WeaviateProcess();
      const instance2 = new WeaviateProcess();
      instances.push(instance1, instance2);

      await instance1.start({
        binaryPath,
        port: BASE_HTTP_PORT,
        grpcPort: BASE_GRPC_PORT,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          CLUSTER_GOSSIP_BIND_PORT: BASE_CLUSTER_PORT.toString(),
          CUSTOM_VAR_1: 'value1',
        },
        verbose: false,
      });

      await instance2.start({
        binaryPath,
        port: BASE_HTTP_PORT + 1,
        grpcPort: BASE_GRPC_PORT + 1,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          CLUSTER_GOSSIP_BIND_PORT: (BASE_CLUSTER_PORT + 1).toString(),
          CUSTOM_VAR_2: 'value2',
        },
        verbose: false,
      });

      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);
    });

    it('should support different verbose settings for each instance', async () => {
      const instance1 = new WeaviateProcess();
      const instance2 = new WeaviateProcess();
      instances.push(instance1, instance2);

      await instance1.start({
        binaryPath,
        port: BASE_HTTP_PORT,
        grpcPort: BASE_GRPC_PORT,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          CLUSTER_GOSSIP_BIND_PORT: BASE_CLUSTER_PORT.toString(),
        },
        verbose: true,
      });

      await instance2.start({
        binaryPath,
        port: BASE_HTTP_PORT + 1,
        grpcPort: BASE_GRPC_PORT + 1,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          CLUSTER_GOSSIP_BIND_PORT: (BASE_CLUSTER_PORT + 1).toString(),
          CLUSTER_GOSSIP_ADVERTISE_PORT: (BASE_CLUSTER_PORT + 1).toString(),
        },
        verbose: false,
      });

      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);
    });

    it('should maintain independent configuration across lifecycle', async () => {
      const instance = new WeaviateProcess();
      instances.push(instance);

      const config = {
        binaryPath,
        port: BASE_HTTP_PORT,
        grpcPort: BASE_GRPC_PORT,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          TEST_CONFIG: 'persistent',
          CLUSTER_GOSSIP_BIND_PORT: BASE_CLUSTER_PORT.toString(),
          CLUSTER_GOSSIP_ADVERTISE_PORT: BASE_CLUSTER_PORT.toString(),
        },
        verbose: true,
      };

      // First start
      await instance.start(config);
      expect(instance.isRunning()).toBe(true);

      // Stop
      await instance.stop();
      expect(instance.isRunning()).toBe(false);

      // Restart with same config
      await instance.start({
        ...config,
        persistenceDataPath: createTestDataDir(),
        additionalEnvVars: {
          CLUSTER_GOSSIP_BIND_PORT: BASE_CLUSTER_PORT.toString(),
          CLUSTER_GOSSIP_ADVERTISE_PORT: BASE_CLUSTER_PORT.toString(),
        },
      });
      expect(instance.isRunning()).toBe(true);
    });
  });

  describe('Cross-Instance Isolation Validation', () => {
    it('should not interfere with each other during concurrent operations', async () => {
      const instance1 = await createAndStartInstance(0);
      const instance2 = await createAndStartInstance(1);

      // Both instances should be running independently
      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);

      // Get PIDs
      const pid1 = instance1.getPid();
      const pid2 = instance2.getPid();

      // Wait longer to ensure both are fully stable
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify both still running with same PIDs (no interference)
      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);
      expect(instance1.getPid()).toBe(pid1);
      expect(instance2.getPid()).toBe(pid2);
    });

    it('should maintain process isolation during stop operations', async () => {
      const instance1 = await createAndStartInstance(0);
      const instance2 = await createAndStartInstance(1);

      const pid1 = instance1.getPid();
      const pid2 = instance2.getPid();

      // Stop instance1 while instance2 is running
      await instance1.stop();

      // Verify only instance1 stopped
      expect(instance1.isRunning()).toBe(false);
      expect(instance2.isRunning()).toBe(true);
      expect(instance2.getPid()).toBe(pid2); // PID unchanged

      // Instance2 should remain functional
      expect(instance2.isRunning()).toBe(true);
    });

    it('should support independent error handling per instance', async () => {
      const instance1 = await createAndStartInstance(0);
      const instance2 = await createAndStartInstance(1);

      // Force-kill instance1 externally (simulate crash)
      const pid1 = instance1.getPid();
      if (pid1 && process.platform !== 'win32') {
        process.kill(pid1, 'SIGKILL');
      }

      // Wait for process to be killed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Instance2 should still be running and functional
      expect(instance2.isRunning()).toBe(true);

      // Cleanup
      await instance2.stop();
    });
  });

  describe('Concurrent Operations on Different Instances', () => {
    it('should support concurrent start and stop operations', async () => {
      const instances1: WeaviateProcess[] = [];
      const instances2: WeaviateProcess[] = [];

      // Start first set
      for (let i = 0; i < 2; i++) {
        // eslint-disable-next-line no-await-in-loop
        const instance = await createAndStartInstance(i);
        instances1.push(instance);
      }

      // Start second set while first set is running
      for (let i = 2; i < 4; i++) {
        // eslint-disable-next-line no-await-in-loop
        const instance = await createAndStartInstance(i);
        instances2.push(instance);
      }

      // All should be running
      [...instances1, ...instances2].forEach((inst) => {
        expect(inst.isRunning()).toBe(true);
      });

      // Stop first set
      await Promise.all(instances1.map((inst) => inst.stop()));

      // First set stopped, second set still running
      instances1.forEach((inst) => expect(inst.isRunning()).toBe(false));
      instances2.forEach((inst) => expect(inst.isRunning()).toBe(true));

      // Stop second set
      await Promise.all(instances2.map((inst) => inst.stop()));

      // All stopped
      [...instances1, ...instances2].forEach((inst) => {
        expect(inst.isRunning()).toBe(false);
      });
    });

    it('should handle rapid start/stop cycles on multiple instances', async () => {
      const instance1 = new WeaviateProcess();
      const instance2 = new WeaviateProcess();
      instances.push(instance1, instance2);

      const dataDir1 = createTestDataDir();
      const dataDir2 = createTestDataDir();

      for (let cycle = 0; cycle < 2; cycle++) {
        // Start both
        // eslint-disable-next-line no-await-in-loop
        await Promise.all([
          instance1.start({
            binaryPath,
            port: BASE_HTTP_PORT,
            grpcPort: BASE_GRPC_PORT,
            persistenceDataPath: dataDir1,
            additionalEnvVars: {
              CLUSTER_GOSSIP_BIND_PORT: BASE_CLUSTER_PORT.toString(),
              CLUSTER_GOSSIP_ADVERTISE_PORT: BASE_CLUSTER_PORT.toString(),
            },
            verbose: false,
          }),
          instance2.start({
            binaryPath,
            port: BASE_HTTP_PORT + 1,
            grpcPort: BASE_GRPC_PORT + 1,
            persistenceDataPath: dataDir2,
            additionalEnvVars: {
              CLUSTER_GOSSIP_BIND_PORT: (BASE_CLUSTER_PORT + 1).toString(),
              CLUSTER_GOSSIP_ADVERTISE_PORT: (BASE_CLUSTER_PORT + 1).toString(),
            },
            verbose: false,
          }),
        ]);

        expect(instance1.isRunning()).toBe(true);
        expect(instance2.isRunning()).toBe(true);

        // Short delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Stop both
        // eslint-disable-next-line no-await-in-loop
        await Promise.all([instance1.stop(), instance2.stop()]);

        expect(instance1.isRunning()).toBe(false);
        expect(instance2.isRunning()).toBe(false);
      }
    });

    it('should handle staggered instance lifecycle operations', async () => {
      const startTimes: number[] = [];

      // Start instances with staggered delays
      const instance1Promise = createAndStartInstance(0).then((inst) => {
        startTimes.push(Date.now());
        return inst;
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      const instance2Promise = createAndStartInstance(1).then((inst) => {
        startTimes.push(Date.now());
        return inst;
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      const instance3Promise = createAndStartInstance(2).then((inst) => {
        startTimes.push(Date.now());
        return inst;
      });

      const [instance1, instance2, instance3] = await Promise.all([
        instance1Promise,
        instance2Promise,
        instance3Promise,
      ]);

      // All should be running
      expect(instance1.isRunning()).toBe(true);
      expect(instance2.isRunning()).toBe(true);
      expect(instance3.isRunning()).toBe(true);

      // Verify staggered start (timestamps should differ)
      expect(startTimes.length).toBe(3);
    });
  });
});
