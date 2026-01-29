# Weaviate TypeScript EmbeddedDB <img alt='Weaviate logo' src='https://weaviate.io/img/site/weaviate-logo-light.png' width='148' align='right' />

An embedded Weaviate database with TypeScript client interface, available for Linux and Mac

## Installation

```bash
npm install weaviate-ts-embedded weaviate-client
```

**Requirements:**
- Node.js >= 18.0.0
- weaviate-client v3.11.0 or higher (installed as dependency)

## Quick Start

### Basic Usage (Recommended - V3 API)

```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';

// Connect to embedded instance with defaults
const client = await connectToEmbedded();

// Use the client like any weaviate-client v3 instance
const collections = await client.collections.listAll();

// Clean up
await client.close();
```

**Default Configuration:**
- **HTTP Port**: `8080`
- **gRPC Port**: `50051` 
- **Version**: `latest`
- **Host**: `localhost`

### Custom Configuration

```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';

const client = await connectToEmbedded({
  port: 8080,
  grpcPort: 50051,
  version: '1.27.0',
  persistenceDataPath: './my-weaviate-data',
  additionalEnvVars: {
    QUERY_DEFAULTS_LIMIT: '50',
    DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
  },
  headers: {
    'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY,
  },
});

// Use collections API
const myCollection = client.collections.get('Article');
const result = await myCollection.query.fetchObjects();

await client.close();
```

### Headers & Authentication

**Custom Headers** (e.g., for OpenAI API keys):

```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';

const client = await connectToEmbedded({
  headers: {
    'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || 'sk-...',
  },
});

await client.close();
```

**API Key Authentication** (accepts string or ApiKey class):

```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';
import { ApiKey } from 'weaviate-client';

// Option 1: Using string (automatically converted to ApiKey)
const client1 = await connectToEmbedded({
  authCredentials: 'your-weaviate-api-key',
});

// Option 2: Using ApiKey class explicitly
const client2 = await connectToEmbedded({
  authCredentials: new ApiKey('your-weaviate-api-key'),
});

await client1.close();
await client2.close();
```

**Combined Headers + Authentication**:

```typescript
const client = await connectToEmbedded({
  headers: {
    'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY,
  },
  authCredentials: 'your-weaviate-api-key',
});

await client.close();
```

### Full Example with TypeScript Generics

```typescript
import { connectToEmbedded, type WeaviateClient } from 'weaviate-ts-embedded';

interface Article {
  title: string;
  content: string;
  author: string;
}

async function main() {
  const client: WeaviateClient = await connectToEmbedded({
    version: '1.27.0',
  });

  // Type-safe collection access
  const articles = client.collections.get<Article>('Article');
  
  // Insert data
  await articles.data.insert({
    title: 'Embedded Weaviate',
    content: 'Easy local vector search!',
    author: 'Developer',
  });

  // Query with full type safety
  const results = await articles.query.fetchObjects();
  console.log(results.objects[0].properties.title); // TypeScript knows this is a string!

  await client.close();
}

main().catch(console.error);
```

---

## 📚 Documentation

- [Weaviate Embedded Installation Guide](https://weaviate.io/developers/weaviate/installation/embedded)
- [Weaviate TypeScript Client v3 Docs](https://weaviate.io/developers/weaviate/client-libraries/typescript)

---

## Support

- [Stackoverflow for questions](https://stackoverflow.com/questions/tagged/weaviate).
- [Github for issues](https://github.com/weaviate/typescript-embedded/issues).

## Contributing

- [How to Contribute](https://github.com/weaviate/typescript-embedded/blob/main/CONTRIBUTE.md).

## Build Status

[![Build Status](https://github.com/weaviate/typescript-embedded/actions/workflows/.github/workflows/main.yaml/badge.svg?branch=main)](https://github.com/weaviate/typescript-embedded/actions/workflows/.github/workflows/main.yaml)
