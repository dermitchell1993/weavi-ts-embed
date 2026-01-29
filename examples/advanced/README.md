# Advanced Configuration Example

This example demonstrates advanced configuration options and features of the Weaviate TypeScript Embedded Client.

## What This Example Covers

- ✅ Custom port configuration to avoid conflicts
- ✅ Specifying a Weaviate version
- ✅ Custom data persistence path
- ✅ Environment variables for module configuration
- ✅ OpenAI vectorizer integration with headers
- ✅ Creating collections with schema and vectorizers
- ✅ Semantic search using nearText
- ✅ Collection statistics and aggregation

## Prerequisites

- Node.js >= 18.0.0
- Linux or macOS operating system
- OpenAI API key (optional, for vectorization features)

## Installation

```bash
npm install weaviate-ts-embedded weaviate-client
```

## Setup

To use the OpenAI vectorization features, set your API key:

```bash
export OPENAI_API_KEY='your-openai-api-key'
```

## Running the Example

```bash
npx tsx index.ts
```

Or with environment variable inline:

```bash
OPENAI_API_KEY='your-key' npx tsx index.ts
```

## Configuration Options Explained

### Custom Ports

```typescript
port: 9898,        // HTTP API port
grpcPort: 50052,   // gRPC port for faster operations
```

Use custom ports when:
- Default ports (8080/50051) are already in use
- Running multiple Weaviate instances simultaneously
- Working in environments with port restrictions

### Weaviate Version

```typescript
version: '1.27.0',  // Pin to specific version
```

Benefits:
- Reproducible environments
- Test with specific features
- Control when to upgrade

### Data Persistence

```typescript
persistenceDataPath: './my-weaviate-data',
```

- Data persists between restarts
- Useful for development and testing
- Can be backed up or version controlled (with caution)

### Environment Variables

```typescript
additionalEnvVars: {
  ENABLE_MODULES: 'text2vec-openai',
  DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
  LOG_LEVEL: 'info',
  QUERY_DEFAULTS_LIMIT: '25',
}
```

Common environment variables:

#### Modules
- `ENABLE_MODULES`: Comma-separated list of modules to enable
- `DEFAULT_VECTORIZER_MODULE`: Default vectorizer for new collections

#### Logging
- `LOG_LEVEL`: `debug`, `info`, `warn`, or `error`
- `LOG_FORMAT`: `text` or `json`

#### Performance
- `QUERY_DEFAULTS_LIMIT`: Default result limit
- `QUERY_MAXIMUM_RESULTS`: Maximum allowed results

See [Weaviate Environment Variables](https://weaviate.io/developers/weaviate/config-refs/env-vars) for more.

### Headers

```typescript
headers: {
  'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY,
}
```

Headers are used to pass API keys to vectorizer modules:
- `X-OpenAI-Api-Key`: For text2vec-openai
- `X-Cohere-Api-Key`: For text2vec-cohere
- `X-HuggingFace-Api-Key`: For text2vec-huggingface

## Key Features Demonstrated

### Schema Creation

The example creates a collection with:
- Named vectorizers
- Source properties for vectorization
- Property definitions with data types

### Semantic Search

```typescript
const results = await collection.query.nearText('search query', {
  limit: 2,
  returnMetadata: ['distance'],
});
```

nearText performs semantic search based on meaning, not just keywords.

### Aggregation

```typescript
const aggregate = await collection.aggregate.overAll();
console.log(aggregate.totalCount);
```

Get statistics about your data.

## Available Vectorizers

Common vectorizer modules you can enable:

- `text2vec-openai` - OpenAI embeddings (recommended)
- `text2vec-cohere` - Cohere embeddings
- `text2vec-huggingface` - HuggingFace models
- `text2vec-transformers` - Local transformer models
- `multi2vec-clip` - Image and text embeddings

## Example Output

```
🚀 Starting Weaviate Embedded Advanced Example

⚙️ Connecting with advanced configuration...
✅ Connected with custom configuration!

📦 Creating Article collection with vectorizer...
✅ Article collection created!

➕ Inserting articles...
✅ Inserted 2 articles

🔍 Performing semantic search...
Found 2 relevant article(s):
  1. Introduction to Vector Databases
     Author: Jane Doe
     Distance: 0.123
     Preview: Vector databases are specialized databases designed to store and query...
  2. Getting Started with Weaviate
     Author: John Smith
     Distance: 0.234
     Preview: Weaviate is an open-source vector database that allows you to store...

📊 Collection statistics:
  Total objects: 2

🖥️ Server Information:
  Version: 1.27.0
  Modules: text2vec-openai

🧹 Closing connection...
✅ Connection closed successfully!

✨ Advanced example completed!
```

## Troubleshooting

### "Module not enabled"

Make sure the module is in `ENABLE_MODULES`:

```typescript
additionalEnvVars: {
  ENABLE_MODULES: 'text2vec-openai,text2vec-cohere',
}
```

### OpenAI API errors

Verify your API key is set:

```bash
echo $OPENAI_API_KEY
```

### Port conflicts

Change ports if they're already in use:

```typescript
const client = await connectToEmbedded({
  port: 9999,
  grpcPort: 50099,
});
```

## Next Steps

- Explore different vectorizer modules
- Try other query methods (nearVector, hybrid, bm25)
- Implement filters and complex queries
- Add authentication (see headers-auth-example.ts)
- Read the [Weaviate Documentation](https://weaviate.io/developers/weaviate)

