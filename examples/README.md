# Weaviate TypeScript Embedded Client - Examples

These examples demonstrate common usage patterns for the Weaviate TypeScript Embedded Client using the v3 API.

Make sure you have the latest version of `weaviate-ts-embedded` and `weaviate-client` installed! 🙂

## 📦 Available Examples

### 1. [Basic Usage](./basic/)

**Perfect for:** Getting started quickly

Learn the fundamentals:
- ✅ Simple connection with default settings
- ✅ Creating collections and inserting data
- ✅ Basic queries
- ✅ Proper connection cleanup

**Estimated time:** 5 minutes

```bash
cd examples/basic
npm install
npm start
```

---

### 2. [Advanced Configuration](./advanced/)

**Perfect for:** Production-ready setups

Advanced features:
- ✅ Custom ports and version pinning
- ✅ Environment variable configuration
- ✅ OpenAI vectorizer integration
- ✅ Semantic search with nearText
- ✅ Collection schema and properties
- ✅ Data persistence

**Estimated time:** 15 minutes

```bash
cd examples/advanced
npm install
export OPENAI_API_KEY='your-key'  # Optional, for vectorization
npm start
```

---

### 3. [Migration Guide (V1/V2 → V3)](./migration/)

**Perfect for:** Upgrading existing projects

Side-by-side comparison:
- ✅ V1/V2 vs V3 API differences
- ✅ Step-by-step migration checklist
- ✅ Code examples showing before/after
- ✅ Common issues and solutions
- ✅ TypeScript improvements

**Estimated time:** 10 minutes

```bash
cd examples/migration
npm install
npm run v3
```

---

## 🚀 Quick Start

If you're new to Weaviate TypeScript Embedded, start here:

```bash
# Install dependencies
npm install weaviate-ts-embedded weaviate-client

# Run the basic example
cd examples/basic
npm install && npm start
```

## 📚 Example Overview Matrix

| Example | Difficulty | Time | Key Topics |
|---------|-----------|------|------------|
| [Basic](./basic/) | Beginner | 5 min | Connection, CRUD operations |
| [Advanced](./advanced/) | Intermediate | 15 min | Configuration, vectorizers, search |
| [Migration](./migration/) | Intermediate | 10 min | V1/V2 → V3 upgrade path |

## 🔧 Requirements

All examples require:
- **Node.js** >= 18.0.0
- **Operating System**: Linux or macOS
  - Windows users: Use WSL2 or Docker

## 📖 Additional Resources

### Embedded Weaviate

The embedded examples show how to run Weaviate directly within your Node.js application:
- ✅ **No Docker required** - Database runs in-process
- ✅ **MacOS and Linux supported** - Native binaries included
- ✅ **Automatic lifecycle** - Database starts/stops with your app
- ✅ **Perfect for development** - Quick setup, easy debugging

### JavaScript & TypeScript

All examples work with both:
- **TypeScript** - Full type safety and IDE support
- **JavaScript (ESM)** - Modern ES modules
- **JavaScript (CommonJS)** - For older projects (see individual examples)

## 🆘 Need Help?

### Getting Started Issues?

1. **Check your Node.js version**: `node --version` (must be >= 18.0.0)
2. **Verify your OS**: Embedded mode requires Linux or macOS
3. **Check port availability**: Default port 8080 must be free

### Common Problems

**Port already in use:**
```typescript
const client = await connectToEmbedded({ port: 9090 });
```

**Module errors:**
```bash
npm install weaviate-ts-embedded weaviate-client
```

**TypeScript errors:**
```bash
npm install --save-dev typescript @types/node
```

### Resources

- 📘 [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- 🔧 [TypeScript Client v3 Docs](https://weaviate.io/developers/weaviate/client-libraries/typescript)
- 💬 [Weaviate Discord](https://discord.gg/weaviate)
- ❓ [Stack Overflow](https://stackoverflow.com/questions/tagged/weaviate)
- 🐛 [GitHub Issues](https://github.com/weaviate/typescript-embedded/issues)

## 🤝 Contributing

Found an issue with an example? Have a suggestion?

1. Check existing [issues](https://github.com/weaviate/typescript-embedded/issues)
2. Open a new issue with details
3. Submit a PR with improvements

See [CONTRIBUTE.md](../CONTRIBUTE.md) for guidelines.

---

**Happy coding!** 🎉

Start with the [Basic Example](./basic/) and work your way up! 🚀

