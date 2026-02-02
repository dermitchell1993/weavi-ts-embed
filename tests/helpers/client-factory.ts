/**
 * Test Client Factory
 *
 * Reusable utilities for creating and managing Weaviate embedded clients in tests.
 * Handles common patterns: creation, validation, cleanup.
 */

import weaviate, { EmbeddedClient, EmbeddedOptions } from '../../src';
import type { EmbeddedOptionsConfig } from '../../src/embedded';

export class TestClientFactory {
  /**
   * Create client with default options
   */
  static async createWithDefaults(): Promise<EmbeddedClient> {
    const client = await weaviate.client(new EmbeddedOptions());
    await this.validateConnectivity(client);
    return client;
  }

  /**
   * Create client with custom configuration
   */
  static async createWithConfig(config: Partial<EmbeddedOptionsConfig>): Promise<EmbeddedClient> {
    const client = await weaviate.client(new EmbeddedOptions(config));
    await this.validateConnectivity(client);
    return client;
  }

  /**
   * Create client with custom options object
   */
  static async createWithOptions(options: EmbeddedOptions): Promise<EmbeddedClient> {
    const client = await weaviate.client(options);
    await this.validateConnectivity(client);
    return client;
  }

  /**
   * Create client with version specification
   */
  static createWithVersion(version: string): Promise<EmbeddedClient> {
    return this.createWithConfig({ version });
  }

  /**
   * Create client with binary URL
   */
  static createWithBinaryUrl(binaryUrl: string): Promise<EmbeddedClient> {
    return this.createWithConfig({ binaryUrl });
  }

  /**
   * Validate client connectivity by creating and deleting a test collection
   */
  static async validateConnectivity(client: EmbeddedClient): Promise<void> {
    const testCollection = {
      name: 'TestConnectivityCollection',
      properties: [{ name: 'testProp', dataType: 'text' as const }],
    };

    try {
      // Create collection
      await client.collections.create(testCollection);
      // Delete collection
      await client.collections.delete(testCollection.name);
    } catch (error) {
      throw new Error(`Client connectivity validation failed: ${error}`);
    }
  }

  /**
   * Clean shutdown with timeout
   */
  static async shutdown(client: EmbeddedClient, timeoutMs = 2000): Promise<void> {
    if (client?.embedded) {
      client.embedded.stop();
      // Wait for process to terminate
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    }
  }

  /**
   * Create and validate client, with automatic cleanup
   */
  static async withClient<T>(
    config: Partial<EmbeddedOptionsConfig>,
    testFn: (client: EmbeddedClient) => Promise<T>
  ): Promise<T> {
    const client = await this.createWithConfig(config);
    try {
      return await testFn(client);
    } finally {
      await this.shutdown(client);
    }
  }
}

/**
 * Common test configurations
 */
export const TEST_CONFIGS = {
  defaults: new EmbeddedOptions(),
  customPort: new EmbeddedOptions({ port: 7878 }),
  withVersion: new EmbeddedOptions({ version: '1.27.0' }),
  withLatest: new EmbeddedOptions({ version: 'latest' }),
  withEnvVars: new EmbeddedOptions({
    env: {
      QUERY_DEFAULTS_LIMIT: 50,
      DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
    },
  }),
  withBinaryUrl: new EmbeddedOptions({
    binaryUrl:
      'https://github.com/weaviate/weaviate/releases/download/v1.27.0/weaviate-v1.27.0-linux-amd64.tar.gz',
  }),
} as const;
