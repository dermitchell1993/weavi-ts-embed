/**
 * Example: Headers and Authentication Integration
 *
 * This example demonstrates how to use headers and authentication credentials
 * with the Weaviate TypeScript Embedded Client.
 *
 * Use cases:
 * - OpenAI API keys for vectorization modules
 * - Custom authentication headers
 * - API key authentication
 */

import { connectToEmbedded } from '../../src';
import { apiKey } from 'weaviate-client';

async function exampleWithHeaders() {
  console.log('=== Example 1: Using Custom Headers ===\n');

  // Pass OpenAI API key via headers for text2vec-openai module
  const client = await connectToEmbedded({
    port: 8080,
    grpcPort: 50051,
    headers: {
      'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || 'sk-...',
    },
    additionalEnvVars: {
      ENABLE_MODULES: 'text2vec-openai',
    },
  });

  console.log('✅ Connected with custom headers\n');

  await client.close();
}

async function exampleWithAuthentication() {
  console.log('=== Example 2: Using Authentication Credentials ===\n');

  // Use API key authentication
  const client = await connectToEmbedded({
    port: 8081,
    grpcPort: 50052,
    authCredentials: apiKey('your-weaviate-api-key'),
  });

  console.log('✅ Connected with API key authentication\n');

  await client.close();
}

async function exampleWithBothHeadersAndAuth() {
  console.log('=== Example 3: Using Both Headers and Authentication ===\n');

  // Combine custom headers with authentication
  const client = await connectToEmbedded({
    port: 8082,
    grpcPort: 50053,
    headers: {
      'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || 'sk-...',
      'X-Cohere-Api-Key': process.env.COHERE_API_KEY || 'cohere-key',
    },
    authCredentials: apiKey('your-weaviate-api-key'),
    additionalEnvVars: {
      ENABLE_MODULES: 'text2vec-openai,text2vec-cohere',
    },
  });

  console.log('✅ Connected with both headers and authentication\n');

  await client.close();
}

async function main() {
  console.log('🚀 Weaviate Embedded: Headers & Authentication Examples\n');

  try {
    await exampleWithHeaders();
    await exampleWithAuthentication();
    await exampleWithBothHeadersAndAuth();

    console.log('✨ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}
