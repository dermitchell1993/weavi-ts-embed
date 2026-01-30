# Weaviate Client v3 Type Migration Guide

## Overview
This document tracks the migration from `weaviate-ts-client` v2 to `weaviate-client` v3 and documents type compatibility.

## Type Compatibility Matrix

### ✅ Types That Exist in v3

| Type | v2 Location | v3 Location | Notes |
|------|-------------|-------------|-------|
| `WeaviateClient` | `weaviate-ts-client` | `weaviate-client` | ✅ Interface exists, updated API surface |
| `ConnectionParams` | `weaviate-ts-client` | `weaviate-client` | ✅ Exists with updated structure (http/grpc split) |
| `ProtocolParams` | N/A | `weaviate-client` | ✅ New in v3 for http/grpc config |
| `ClientParams` | `weaviate-ts-client` | `weaviate-client` | ✅ Updated structure |

### ❌ Types Removed in v3

| Type | v2 Usage | v3 Replacement | Migration Path |
|------|----------|----------------|----------------|
| `WeaviateClass` | Schema class definition | Collections API | Use `client.collections` instead of schema classes |

### 🔄 API Changes

#### v2 → v3 Schema Management
```typescript
// v2: Schema-based approach
client.schema.classCreator().withClass({...})

// v3: Collections-based approach  
client.collections.create({...})
```

#### v2 → v3 Connection
```typescript
// v2: Single connection method
const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080'
})

// v3: Typed connection helpers
const client = await weaviate.connectToCustom({
  httpHost: 'localhost',
  httpPort: 8080,
  httpSecure: false,
  grpcHost: 'localhost',
  grpcPort: 50051,
  grpcSecure: false
})
```

## v3 WeaviateClient Interface

The v3 `WeaviateClient` interface includes:

```typescript
interface WeaviateClient {
  alias: Aliases;
  backup: Backup;
  cluster: Cluster;
  collections: Collections;  // ← Replaces schema API
  oidcAuth?: OidcAuthenticator;
  groups: Groups;
  roles: Roles;
  users: Users;
  close: () => Promise<void>;
  getMeta: () => Promise<Meta>;
  getConnectionDetails: () => Promise<ConnectionDetails>;
  getOpenIDConfig?: () => Promise<any>;
  getWeaviateVersion: () => Promise<DbVersion>;
  isLive: () => Promise<boolean>;
  isReady: () => Promise<boolean>;
}
```

## Current Usage in weavi-ts-embed

### Types Imported
```typescript
import weaviate, { WeaviateClient } from 'weaviate-client';
```

### Types Used
- ✅ `WeaviateClient` - Extended by `EmbeddedClient` interface
- ✅ Default export with `connectToCustom()` method

### Types NOT Used (No Migration Needed)
- ❌ `WeaviateClass` - Not referenced in codebase
- ❌ `ConnectionParams` - Not directly used (handled by `connectToCustom`)

## Minimum Weaviate Version

⚠️ **Important**: weaviate-client v3 requires Weaviate server v1.27.0+

- v3 enforces gRPC API support
- gRPC was introduced in Weaviate v1.27.0
- Older versions (e.g., v1.19.8) will fail with compatibility errors

## Exported Types

The package re-exports these v3 types for downstream consumers:

```typescript
export type { WeaviateClient } from 'weaviate-client';
export interface EmbeddedClient extends WeaviateClient {
  embedded: EmbeddedDB;
}
```

## Migration Checklist

- [x] Update package.json to use `weaviate-client` v3
- [x] Verify `WeaviateClient` type compatibility
- [x] Confirm `WeaviateClass` not used in codebase
- [x] Update connection code to use `connectToCustom()`
- [x] Add type documentation and re-exports
- [ ] Update tests to use Weaviate v1.27.0+
- [ ] Update test timeouts for embedded startup
- [ ] Remove/update tests for unsupported versions

## References

- [Weaviate v3 Client Documentation](https://weaviate.io/developers/weaviate/client-libraries/typescript)
- [v2 to v3 Migration Guide](https://weaviate.io/developers/weaviate/client-libraries/typescript/v3_migration)

