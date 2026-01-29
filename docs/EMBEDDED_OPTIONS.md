# EmbeddedOptions Interface Documentation

Complete configuration reference for the `EmbeddedOptions` interface in weaviate-ts-embedded.

## Interface Definition

```typescript
interface EmbeddedOptions {
  port?: number;
  grpcPort?: number;
  version?: string;
  binaryPath?: string;
  persistenceDataPath?: string;
  additionalEnvVars?: Record<string, string>;
  headers?: Record<string, string>;
  authCredentials?: AuthCredentials;
}
```

## Configuration Options

### `port?: number`
HTTP port for Weaviate REST API.
- **Default:** `8080`
- **Valid Range:** `1024-65535`

### `grpcPort?: number`
gRPC port for high-performance operations.
- **Default:** `50051`
- **Valid Range:** `1024-65535`
- **Note:** Must be different from HTTP port

### `version?: string`
Weaviate version to run.
- **Default:** `'latest'`
- **Format:** `X.Y.Z` or `'latest'`

### `binaryPath?: string`
Path to custom binary (overrides automatic download).

### `persistenceDataPath?: string`
Directory for Weaviate data persistence.
- **Default:** `'./data/weaviate'`

### `additionalEnvVars?: Record<string, string>`
Additional environment variables for Weaviate process.

### `headers?: Record<string, string>`
Custom HTTP headers for client requests.

### `authCredentials?: AuthCredentials`
Authentication credentials.

## Usage Examples

### Basic Usage
```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';

const client = await connectToEmbedded({
  port: 8080,
  version: '1.27.0'
});
```

### Complete Configuration
```typescript
const client = await connectToEmbedded({
  port: 8080,
  grpcPort: 50051,
  version: '1.27.0',
  persistenceDataPath: './my-weaviate-data',
  additionalEnvVars: {
    ENABLE_MODULES: 'text2vec-openai',
    LOG_LEVEL: 'debug',
  },
  headers: {
    'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY,
  },
});
```

## Validation

The `validateOptions()` function validates configuration before starting Weaviate:

```typescript
import { validateOptions } from 'weaviate-ts-embedded';

try {
  validateOptions({ port: 8080, grpcPort: 50051 });
} catch (error) {
  console.error('Invalid options:', error.message);
}
```

### Validation Rules

- **Ports:** Must be integers between 1024-65535, and different from each other
- **Version:** Must be `X.Y.Z` format or `'latest'` (cannot be empty string)
- **Environment Variables & Headers:** Must be objects with string values (not arrays)

## Common Pitfalls

### Port Conflicts
```typescript
// ❌ WRONG - Same port for HTTP and gRPC
connectToEmbedded({ port: 8080, grpcPort: 8080 });
// Error: HTTP port and gRPC port must be different

// ✅ CORRECT - Different ports
connectToEmbedded({ port: 8080, grpcPort: 50051 });
```

### Invalid Version Format
```typescript
// ❌ WRONG - Invalid version formats
connectToEmbedded({ version: '' });           // Empty string
connectToEmbedded({ version: '1.27' });       // Missing patch version
connectToEmbedded({ version: 'v1.27.0' });    // Has 'v' prefix
connectToEmbedded({ version: '1.27.0-beta' }); // Has prerelease tag

// ✅ CORRECT - Valid version formats
connectToEmbedded({ version: '1.27.0' });     // Semantic version
connectToEmbedded({ version: 'latest' });     // Latest stable
```

### Invalid Environment Variables
```typescript
// ❌ WRONG - Array instead of object
connectToEmbedded({ 
  additionalEnvVars: ['LOG_LEVEL=debug'] // Arrays not allowed
});

// ❌ WRONG - Non-string values
connectToEmbedded({ 
  additionalEnvVars: { LOG_LEVEL: 123 } // Must be strings
});

// ✅ CORRECT - Object with string values
connectToEmbedded({ 
  additionalEnvVars: { LOG_LEVEL: 'debug' }
});
```

### Port Range Issues
```typescript
// ❌ WRONG - Ports outside valid range
connectToEmbedded({ port: 80 });      // Below 1024 (privileged)
connectToEmbedded({ port: 70000 });   // Above 65535
connectToEmbedded({ port: 8080.5 });  // Not an integer

// ✅ CORRECT - Ports within valid range
connectToEmbedded({ port: 8080 });    // Valid range: 1024-65535
```
