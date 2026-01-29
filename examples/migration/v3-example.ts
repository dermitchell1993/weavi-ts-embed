/**
 * V3 Example (NEW API - Use This!)
 * 
 * This shows the NEW way of using Weaviate TypeScript Embedded Client.
 * Much simpler, more intuitive, and fully type-safe!
 */

import { connectToEmbedded } from 'weaviate-ts-embedded';

async function newWay() {
  console.log('🚀 V3 API Example - The Modern Way!\n');

  // V3: Simple, clean connection
  console.log('📡 Connecting...');
  const client = await connectToEmbedded({
    port: 8080,
  });
  console.log('✅ Connected!\n');

  // V3: Collections-based approach (not classes)
  console.log('📦 Working with collections...');
  const wineCollection = client.collections.get('Wine');

  // V3: Simple, direct data insertion
  console.log('➕ Inserting data...');
  const insertResult = await wineCollection.data.insert({
    name: 'Chardonnay',
    description: 'A crisp white wine with notes of apple and citrus',
    year: 2020,
    price: 25.99,
  });
  console.log(`✅ Inserted with ID: ${insertResult}\n`);

  // V3: Clean, intuitive queries
  console.log('🔍 Querying data...');
  const queryResult = await wineCollection.query.fetchObjects({
    limit: 5,
  });

  console.log(`Found ${queryResult.objects.length} wine(s):`);
  queryResult.objects.forEach((obj) => {
    console.log(`  - ${obj.properties.name}: ${obj.properties.description}`);
  });
  console.log('');

  // V3: Semantic search is straightforward
  try {
    console.log('🔍 Semantic search example...');
    const searchResults = await wineCollection.query.nearText('fruity wine', {
      limit: 5,
    });

    console.log(`Found ${searchResults.objects.length} result(s) for "fruity wine"`);
  } catch (error) {
    console.log('⚠️ Semantic search requires vectorizer configuration');
  }
  console.log('');

  // V3: Type-safe operations with generics
  interface Wine {
    name: string;
    description: string;
    year: number;
    price: number;
  }

  const typedCollection = client.collections.get<Wine>('Wine');
  const typedResult = await typedCollection.query.fetchObjects({ limit: 1 });
  
  if (typedResult.objects.length > 0) {
    // TypeScript knows these properties exist!
    const wine = typedResult.objects[0].properties;
    console.log('🍷 Type-safe access:');
    console.log(`  Name: ${wine.name} (TypeScript knows this is a string!)`);
    console.log(`  Price: $${wine.price} (TypeScript knows this is a number!)`);
    console.log('');
  }

  // Clean up
  console.log('🧹 Closing...');
  await client.close();
  console.log('✅ Done!\n');
  
  console.log('✨ V3 API is much cleaner and easier to use!');
}

// Run the example
newWay().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

