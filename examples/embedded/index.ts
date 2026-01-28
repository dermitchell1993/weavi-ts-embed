import { connectToEmbedded } from 'weaviate-ts-embedded';

if (process.platform !== 'linux' && process.platform !== 'darwin') {
  throw new Error('EmbeddedDB only supports Linux and macOS. Try me in a Docker container!');
}

// Connect to embedded Weaviate instance using v3 API
const client = await connectToEmbedded({
  port: 9898,
  version: 'latest',
});

console.info('\nEmbedded DB started\n');

// Create a collection (v3 API)
const myCollection = client.collections.get('Wine');

// Insert data using v3 API
const result = await myCollection.data.insert({
  name: 'Pinot noir',
  description: 'Smooth taste',
});
console.log('Inserted object:', result);

// Query all objects in the collection
const queryResult = await myCollection.query.fetchObjects();
console.log('All objects:', queryResult.objects);

// Get server metadata
const meta = await client.getMeta();
console.log('Server metadata:', meta);

console.info('\nClosing connection...');
await client.close();
console.info('Exiting...');
