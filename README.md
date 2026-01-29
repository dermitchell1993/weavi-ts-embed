# Weaviate TypeScript EmbeddedDB <img alt='Weaviate logo' src='https://weaviate.io/img/site/weaviate-logo-light.png' width='148' align='right' />

An embedded Weaviate database with TypeScript client interface, available for Linux and Mac

## Installation

```bash
npm install weaviate-ts-embedded weaviate-client
```

**Requirements:**
- Node.js >= 18.0.0 (Node 20 or 22 recommended for best performance - [see performance guide](./docs/testing/ci-testing.md#nodejs-version-support))
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

## Configuration Options

### Environment Variables

The `additionalEnvVars` option allows you to configure Weaviate using environment variables. Here are commonly used variables:

#### Module Configuration
- `ENABLE_MODULES` - Enable specific vectorizer modules (e.g., `'text2vec-openai,text2vec-cohere'`)
- `DEFAULT_VECTORIZER_MODULE` - Set the default vectorizer (e.g., `'text2vec-openai'`)

#### Logging
- `LOG_LEVEL` - Set logging verbosity: `'debug'`, `'info'`, `'warn'`, or `'error'`
- `LOG_FORMAT` - Log format: `'text'` or `'json'`

#### Storage
- `PERSISTENCE_DATA_PATH` - Data storage directory (can also be set via `persistenceDataPath` option)

#### Authentication
- `AUTHENTICATION_APIKEY_ENABLED` - Enable API key authentication: `'true'` or `'false'`
- `AUTHENTICATION_APIKEY_ALLOWED_KEYS` - Comma-separated list of allowed API keys
- `AUTHENTICATION_APIKEY_USERS` - Comma-separated list of usernames

#### Performance
- `QUERY_DEFAULTS_LIMIT` - Default query result limit (e.g., `'50'`)
- `QUERY_MAXIMUM_RESULTS` - Maximum allowed results per query (e.g., `'10000'`)

#### Basic Example

```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';

// Simple configuration with common variables
const client = await connectToEmbedded({
  port: 8080,
  additionalEnvVars: {
    LOG_LEVEL: 'debug',
    ENABLE_MODULES: 'text2vec-openai',
  },
});
```

**Important:** All environment variable values must be strings. TypeScript will enforce this:

```typescript
// ✅ Correct - values are strings
additionalEnvVars: {
  QUERY_DEFAULTS_LIMIT: '50',
  LOG_LEVEL: 'debug',
}

// ❌ Won't compile - TypeScript error
additionalEnvVars: {
  QUERY_DEFAULTS_LIMIT: 50,  // Error: Type 'number' is not assignable to type 'string'
}
```

#### Advanced Example with Authentication

```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';

const client = await connectToEmbedded({
  port: 8080,
  additionalEnvVars: {
    // Enable modules
    ENABLE_MODULES: 'text2vec-openai,text2vec-cohere',
    DEFAULT_VECTORIZER_MODULE: 'text2vec-openai',
    
    // Configure logging
    LOG_LEVEL: 'debug',
    LOG_FORMAT: 'json',
    
    // Enable authentication
    AUTHENTICATION_APIKEY_ENABLED: 'true',
    AUTHENTICATION_APIKEY_ALLOWED_KEYS: 'my-secret-key',
    AUTHENTICATION_APIKEY_USERS: 'admin',
    
    // Performance tuning
    QUERY_DEFAULTS_LIMIT: '50',
    QUERY_MAXIMUM_RESULTS: '10000',
  },
  headers: {
    'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY,
  },
  authCredentials: {
    apiKey: 'my-secret-key',
  },
});
```

For a complete list of environment variables, see the [Weaviate Configuration Documentation](https://weaviate.io/developers/weaviate/config-refs/env-vars).

---

## 📚 Examples & Documentation

### 🎯 Working Examples

Check out our example projects demonstrating common use cases:

- **[Basic Usage](./examples/basic/)** - Simple connection, insert, and query (5 min)
- **[Advanced Configuration](./examples/advanced/)** - Custom ports, environment variables, OpenAI vectorizer (15 min)
- **[Migration Guide](./examples/migration/)** - Side-by-side v1/v2 vs v3 comparison (10 min)

See the [Examples README](./examples/README.md) for a complete overview.

### 📖 Official Documentation

### API Documentation

- **[Complete API Reference](./docs/api/index.html)** - Full TypeDoc-generated API documentation
- **[Configuration Options Guide](./docs/EMBEDDED_OPTIONS.md)** - Detailed `EmbeddedOptions` reference
- **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Additional Resources

- [Weaviate Embedded Installation Guide](https://weaviate.io/developers/weaviate/installation/embedded)
- [Weaviate TypeScript Client v3 Docs](https://weaviate.io/developers/weaviate/client-libraries/typescript)
- [Weaviate Environment Variables Reference](https://weaviate.io/developers/weaviate/config-refs/env-vars)

---

## Support

- [Stackoverflow for questions](https://stackoverflow.com/questions/tagged/weaviate).
- [Github for issues](https://github.com/weaviate/typescript-embedded/issues).

## Contributing

- [How to Contribute](https://github.com/weaviate/typescript-embedded/blob/main/CONTRIBUTE.md).

## Build Status

[![Build Status](https://github.com/weaviate/typescript-embedded/actions/workflows/.github/workflows/main.yaml/badge.svg?branch=main)](https://github.com/weaviate/typescript-embedded/actions/workflows/.github/workflows/main.yaml)
