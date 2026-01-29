# Basic Usage Example

This example demonstrates the simplest way to get started with Weaviate TypeScript Embedded Client.

## What This Example Covers

- ✅ Connecting to an embedded Weaviate instance with default settings
- ✅ Creating and working with a collection
- ✅ Inserting data objects
- ✅ Querying all objects from a collection
- ✅ Getting server metadata
- ✅ Properly closing the connection

## Prerequisites

- Node.js >= 18.0.0
- Linux or macOS operating system

## Installation

```bash
npm install weaviate-ts-embedded weaviate-client
```

## Running the Example

```bash
npx tsx index.ts
```

Or if you have TypeScript configured in your project:

```bash
ts-node index.ts
```

## Expected Output

You should see output similar to:

```
🚀 Starting Weaviate Embedded Basic Example

📡 Connecting to embedded Weaviate...
✅ Connected successfully!

📦 Working with the Wine collection...
➕ Inserting wine data...
✅ Inserted wine with ID: <uuid>

✅ Inserted second wine

🔍 Querying all wines...
Found 2 wine(s):
  1. Chardonnay (2020) - $25.99
     A crisp white wine with notes of apple and citrus
  2. Merlot (2019) - $32.5
     A smooth red wine with plum and chocolate flavors

📊 Getting server metadata...
Weaviate Version: 1.27.x

🧹 Closing connection...
✅ Connection closed successfully!

✨ Example completed!
```

## Key Concepts

### Default Configuration

When you call `connectToEmbedded()` without arguments, it uses these defaults:

- **HTTP Port**: 8080
- **gRPC Port**: 50051
- **Version**: latest
- **Host**: localhost

### Collections API (v3)

The v3 API uses a collections-based approach:

```typescript
const collection = client.collections.get('CollectionName');
```

### Data Operations

- **Insert**: `collection.data.insert(object)`
- **Query**: `collection.query.fetchObjects()`
- **Delete**: `collection.data.delete(id)`

## Next Steps

- Check out the **advanced** example for custom configuration options
- Check out the **migration** example if you're upgrading from v1/v2
- Read the [Weaviate TypeScript Client v3 Documentation](https://weaviate.io/developers/weaviate/client-libraries/typescript)

## Troubleshooting

### "EmbeddedDB only supports Linux and macOS"

This error means you're trying to run on Windows. Use WSL2 or a Docker container with Linux.

### Port Already in Use

If port 8080 is already taken, you can specify a different port:

```typescript
const client = await connectToEmbedded({ port: 9090 });
```

### Connection Timeout

Make sure no other Weaviate instances are running on the same ports.

