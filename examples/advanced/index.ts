/**
 * Advanced Configuration Example
 * 
 * This example demonstrates advanced configuration options for Weaviate TypeScript Embedded Client.
 * Includes custom ports, environment variables, and OpenAI vectorizer setup.
 */

import { connectToEmbedded } from 'weaviate-ts-embedded';

async function main() {
  console.log('🚀 Starting Weaviate Embedded Advanced Example\n');

  // Advanced Configuration with custom settings
  console.log('⚙️ Connecting with advanced configuration...');
  const client = await connectToEmbedded({
    // Custom ports to avoid conflicts
    port: 9898,
    grpcPort: 50052,
    
    // Specific Weaviate version
    version: '1.27.0',
    
    // Custom data persistence path
    persistenceDataPath: './my-weaviate-data',
    
    // Environment variables for Weaviate configuration
    additionalEnvVars: {
      // Enable OpenAI vectorizer module
      ENABLE_MODULES: 'text2vec-openai',
      DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
      
      // Logging configuration
      LOG_LEVEL: 'info',
      LOG_FORMAT: 'text',
      
      // Query defaults
      QUERY_DEFAULTS_LIMIT: '25',
      QUERY_MAXIMUM_RESULTS: '10000',
    },
    
    // Pass OpenAI API key via headers
    headers: {
      'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
    },
  });

  console.log('✅ Connected with custom configuration!\n');

  // Example 1: Create a collection with schema
  console.log('📦 Creating Article collection with vectorizer...');
  
  try {
    // Create collection with OpenAI vectorizer
    const articleCollection = await client.collections.create({
      name: 'Article',
      vectorizers: [
        {
          name: 'title_vector',
          sourceProperties: ['title', 'content'],
          vectorizer: {
            name: 'text2vec-openai',
            config: {
              model: 'text-embedding-ada-002',
            },
          },
        },
      ],
      properties: [
        {
          name: 'title',
          dataType: 'text',
        },
        {
          name: 'content',
          dataType: 'text',
        },
        {
          name: 'author',
          dataType: 'text',
        },
        {
          name: 'publishedDate',
          dataType: 'date',
        },
      ],
    });

    console.log('✅ Article collection created!\n');

    // Example 2: Insert data (will be automatically vectorized)
    console.log('➕ Inserting articles...');
    
    const article1Id = await articleCollection.data.insert({
      title: 'Introduction to Vector Databases',
      content: 'Vector databases are specialized databases designed to store and query high-dimensional vectors efficiently.',
      author: 'Jane Doe',
      publishedDate: new Date('2024-01-15').toISOString(),
    });

    const article2Id = await articleCollection.data.insert({
      title: 'Getting Started with Weaviate',
      content: 'Weaviate is an open-source vector database that allows you to store and search through data using machine learning models.',
      author: 'John Smith',
      publishedDate: new Date('2024-01-20').toISOString(),
    });

    console.log(`✅ Inserted 2 articles\n`);

    // Example 3: Vector search using nearText
    console.log('🔍 Performing semantic search...');
    
    const searchResults = await articleCollection.query.nearText('what is a vector database?', {
      limit: 2,
      returnMetadata: ['distance'],
    });

    console.log(`Found ${searchResults.objects.length} relevant article(s):`);
    searchResults.objects.forEach((obj, index) => {
      console.log(`  ${index + 1}. ${obj.properties.title}`);
      console.log(`     Author: ${obj.properties.author}`);
      console.log(`     Distance: ${obj.metadata?.distance || 'N/A'}`);
      console.log(`     Preview: ${obj.properties.content.substring(0, 80)}...`);
    });
    console.log('');

    // Example 4: Get collection statistics
    console.log('📊 Collection statistics:');
    const aggregate = await articleCollection.aggregate.overAll();
    console.log(`  Total objects: ${aggregate.totalCount}`);
    console.log('');

  } catch (error) {
    console.error('⚠️ Note: Some features require a valid OpenAI API key');
    console.error('Set OPENAI_API_KEY environment variable to use vectorization');
    console.log('');
  }

  // Example 5: Server information
  console.log('🖥️ Server Information:');
  const meta = await client.getMeta();
  console.log(`  Version: ${meta.version}`);
  console.log(`  Modules: ${Object.keys(meta.modules || {}).join(', ') || 'None'}`);
  console.log('');

  // Clean up
  console.log('🧹 Closing connection...');
  await client.close();
  console.log('✅ Connection closed successfully!');
  console.log('\n✨ Advanced example completed!');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

