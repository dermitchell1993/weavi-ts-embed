/**
 * Basic Usage Example
 * 
 * This example demonstrates the simplest way to use Weaviate TypeScript Embedded Client.
 * Perfect for getting started quickly!
 */

import { connectToEmbedded } from 'weaviate-ts-embedded';

async function main() {
  console.log('🚀 Starting Weaviate Embedded Basic Example\n');

  // Step 1: Connect to embedded Weaviate instance
  console.log('📡 Connecting to embedded Weaviate...');
  const client = await connectToEmbedded();
  console.log('✅ Connected successfully!\n');

  // Step 2: Create a collection
  console.log('📦 Working with the Wine collection...');
  const wineCollection = client.collections.get('Wine');

  // Step 3: Insert data
  console.log('➕ Inserting wine data...');
  const insertResult = await wineCollection.data.insert({
    name: 'Chardonnay',
    description: 'A crisp white wine with notes of apple and citrus',
    year: 2020,
    price: 25.99,
  });
  console.log(`✅ Inserted wine with ID: ${insertResult}\n`);

  // Insert another wine
  await wineCollection.data.insert({
    name: 'Merlot',
    description: 'A smooth red wine with plum and chocolate flavors',
    year: 2019,
    price: 32.50,
  });
  console.log('✅ Inserted second wine\n');

  // Step 4: Query all objects
  console.log('🔍 Querying all wines...');
  const queryResult = await wineCollection.query.fetchObjects({
    limit: 10,
  });
  
  console.log(`Found ${queryResult.objects.length} wine(s):`);
  queryResult.objects.forEach((obj, index) => {
    console.log(`  ${index + 1}. ${obj.properties.name} (${obj.properties.year}) - $${obj.properties.price}`);
    console.log(`     ${obj.properties.description}`);
  });
  console.log('');

  // Step 5: Get server metadata
  console.log('📊 Getting server metadata...');
  const meta = await client.getMeta();
  console.log(`Weaviate Version: ${meta.version}`);
  console.log('');

  // Step 6: Clean up
  console.log('🧹 Closing connection...');
  await client.close();
  console.log('✅ Connection closed successfully!');
  console.log('\n✨ Example completed!');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

