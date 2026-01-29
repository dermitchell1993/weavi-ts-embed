# Migration Guide: V1/V2 → V3

This example demonstrates the differences between the old Weaviate client API (v1/v2) and the new v3 API.

## Why Upgrade to V3?

✅ **Simpler API** - Less boilerplate, more intuitive  
✅ **Better TypeScript Support** - Full type safety with generics  
✅ **Collections Instead of Classes** - More modern terminology  
✅ **Cleaner Queries** - No more `.do()` chains  
✅ **Better Performance** - Optimized under the hood  

## Quick Comparison

### Connection

**V1/V2 (Old):**
```typescript
import weaviate from 'weaviate-client';

const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});
```

**V3 (New):**
```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';

const client = await connectToEmbedded({
  port: 8080,
});
```

### Creating Schema

**V1/V2 (Old):**
```typescript
await client.schema
  .classCreator()
  .withClass({
    class: 'Wine',
    properties: [
      {
        name: 'name',
        dataType: ['text'],
      },
    ],
  })
  .do();
```

**V3 (New):**
```typescript
await client.collections.create({
  name: 'Wine',
  properties: [
    {
      name: 'name',
      dataType: 'text',
    },
  ],
});
```

### Inserting Data

**V1/V2 (Old):**
```typescript
const result = await client.data
  .creator()
  .withClassName('Wine')
  .withProperties({
    name: 'Chardonnay',
    description: 'A crisp white wine',
  })
  .do();
```

**V3 (New):**
```typescript
const collection = client.collections.get('Wine');
const result = await collection.data.insert({
  name: 'Chardonnay',
  description: 'A crisp white wine',
});
```

### Querying Data

**V1/V2 (Old):**
```typescript
const result = await client.graphql
  .get()
  .withClassName('Wine')
  .withFields('name description')
  .withLimit(5)
  .do();
```

**V3 (New):**
```typescript
const collection = client.collections.get('Wine');
const result = await collection.query.fetchObjects({
  limit: 5,
});
```

### Semantic Search

**V1/V2 (Old):**
```typescript
const result = await client.graphql
  .get()
  .withClassName('Wine')
  .withNearText({
    concepts: ['fruity wine'],
  })
  .withFields('name description')
  .withLimit(5)
  .do();
```

**V3 (New):**
```typescript
const collection = client.collections.get('Wine');
const result = await collection.query.nearText('fruity wine', {
  limit: 5,
});
```

## Key Terminology Changes

| V1/V2 Term | V3 Term |
|------------|---------|
| Class | Collection |
| Schema | Collection Definition |
| Object | Object (same) |
| dataType: ['text'] | dataType: 'text' |
| .do() | (not needed) |
| GraphQL queries | Direct method calls |

## Migration Checklist

- [ ] Update `weaviate-client` to v3.11.0 or higher
- [ ] Install `weaviate-ts-embedded` for embedded usage
- [ ] Replace `client.schema.classCreator()` with `client.collections.create()`
- [ ] Replace `client.data.creator()` with `collection.data.insert()`
- [ ] Replace `client.graphql.get()` with `collection.query.*`
- [ ] Update terminology: "class" → "collection"
- [ ] Remove `.do()` calls from query chains
- [ ] Update dataType arrays to strings: `['text']` → `'text'`
- [ ] Add TypeScript generic types for type safety
- [ ] Test all queries and operations

## Full Migration Example

### Before (V1/V2)

```typescript
import weaviate from 'weaviate-client';

const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

// Create schema
await client.schema
  .classCreator()
  .withClass({
    class: 'Wine',
    properties: [
      { name: 'name', dataType: ['text'] },
      { name: 'description', dataType: ['text'] },
    ],
  })
  .do();

// Insert data
await client.data
  .creator()
  .withClassName('Wine')
  .withProperties({
    name: 'Chardonnay',
    description: 'Crisp white wine',
  })
  .do();

// Query data
const result = await client.graphql
  .get()
  .withClassName('Wine')
  .withFields('name description')
  .do();
```

### After (V3)

```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';

const client = await connectToEmbedded({
  port: 8080,
});

// Create collection
await client.collections.create({
  name: 'Wine',
  properties: [
    { name: 'name', dataType: 'text' },
    { name: 'description', dataType: 'text' },
  ],
});

// Insert data
const collection = client.collections.get('Wine');
await collection.data.insert({
  name: 'Chardonnay',
  description: 'Crisp white wine',
});

// Query data
const result = await collection.query.fetchObjects();
```

## Type Safety Improvements

V3 provides excellent TypeScript support:

```typescript
interface Wine {
  name: string;
  description: string;
  year: number;
  price: number;
}

// Type-safe collection access
const wines = client.collections.get<Wine>('Wine');

// TypeScript knows the types!
const result = await wines.query.fetchObjects();
result.objects[0].properties.name;  // string
result.objects[0].properties.price; // number
```

## Running the Examples

**See the old way (reference only):**
```bash
cat v1-example.ts
```

**Run the new way:**
```bash
npx tsx v3-example.ts
```

## Common Issues

### "Cannot find module 'weaviate-client'"

Make sure you're using v3.11.0 or higher:

```bash
npm install weaviate-client@^3.11.0
```

### "Class not found" errors

In v3, use `collections` instead of `schema`:

```typescript
// ❌ Old
await client.schema.classGetter()...

// ✅ New
await client.collections.get('MyCollection')
```

### Type errors with dataType

V3 uses strings, not arrays:

```typescript
// ❌ Old
dataType: ['text']

// ✅ New
dataType: 'text'
```

## Resources

- [Weaviate V3 Client Documentation](https://weaviate.io/developers/weaviate/client-libraries/typescript)
- [V3 Migration Guide](https://weaviate.io/developers/weaviate/client-libraries/typescript/typescript-v3)
- [API Reference](https://weaviate.io/developers/weaviate/api)

## Need Help?

- [Weaviate Discord](https://discord.gg/weaviate)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/weaviate)
- [GitHub Issues](https://github.com/weaviate/typescript-client/issues)

