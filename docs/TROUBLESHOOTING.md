# Troubleshooting Guide

This guide covers common issues and their solutions when using `weaviate-ts-embedded`.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Connection Issues](#connection-issues)
- [Port Conflicts](#port-conflicts)
- [Binary Download Issues](#binary-download-issues)
- [Performance Issues](#performance-issues)
- [Data Persistence Issues](#data-persistence-issues)
- [Module Configuration Issues](#module-configuration-issues)
- [Authentication Issues](#authentication-issues)
- [Platform-Specific Issues](#platform-specific-issues)

---

## Installation Issues

### Error: Module not found

**Problem:** Import errors like `Cannot find module 'weaviate-ts-embedded'`

**Solution:**
```bash
npm install weaviate-ts-embedded weaviate-client
```

Make sure both packages are installed. `weaviate-client` is a required peer dependency.

### Error: Node version incompatibility

**Problem:** `error weaviate-ts-embedded@1.2.0: The engine "node" is incompatible`

**Solution:**
This package requires Node.js >= 18.0.0. Upgrade your Node.js version:
```bash
node --version  # Check current version
nvm install 18  # Install Node 18 using nvm
nvm use 18      # Switch to Node 18
```

---

## Connection Issues

### Error: Connection timeout

**Problem:** `waitForReady` throws timeout error

**Solutions:**

1. **Increase timeout duration:**
```typescript
import { connectToEmbedded } from 'weaviate-ts-embedded';
import { waitForReady } from 'weaviate-ts-embedded';

const client = await connectToEmbedded({ port: 8080 });
// If using waitForReady directly:
await waitForReady(8080, { timeout: 60000 }); // 60 seconds
```

2. **Check if Weaviate process started:**
```typescript
const client = await connectToEmbedded({ 
  port: 8080,
  additionalEnvVars: {
    LOG_LEVEL: 'debug'  // Enable debug logs
  }
});
```

3. **Verify port availability:**
```typescript
import { isPortAvailable } from 'weaviate-ts-embedded';

const httpAvailable = await isPortAvailable(8080);
const grpcAvailable = await isPortAvailable(50051);

console.log({ httpAvailable, grpcAvailable });
```

### Error: ECONNREFUSED

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:8080`

**Solution:**
The Weaviate process failed to start or isn't listening on the expected port.

1. Check for port conflicts (see [Port Conflicts](#port-conflicts))
2. Enable verbose logging to see startup errors:
```typescript
const client = await connectToEmbedded({
  additionalEnvVars: {
    LOG_LEVEL: 'debug'
  }
});
```

---

## Port Conflicts

### Error: Port already in use

**Problem:** `Error: HTTP port 8080 is already in use`

**Solutions:**

1. **Use different ports:**
```typescript
const client = await connectToEmbedded({
  port: 8081,      // Try a different HTTP port
  grpcPort: 50052  // Try a different gRPC port
});
```

2. **Find and kill the process using the port (Unix/macOS):**
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

3. **Find and kill the process using the port (Windows):**
```cmd
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

4. **Use port checking before starting:**
```typescript
import { connectToEmbedded, checkPorts } from 'weaviate-ts-embedded';

// Check ports before attempting connection
try {
  await checkPorts(8080, 50051);
  const client = await connectToEmbedded({ port: 8080, grpcPort: 50051 });
} catch (error) {
  console.error('Port conflict:', error.message);
  // Try alternative ports
  const client = await connectToEmbedded({ port: 8081, grpcPort: 50052 });
}
```

---

## Binary Download Issues

### Error: Failed to download binary

**Problem:** Binary download fails with network errors

**Solutions:**

1. **Check internet connection and firewall settings**

2. **Use a custom binary path:**
```typescript
const client = await connectToEmbedded({
  binaryPath: '/path/to/downloaded/weaviate'
});
```

3. **Manually download and specify path:**
   - Download from: https://github.com/weaviate/weaviate/releases
   - Extract the binary
   - Use `binaryPath` option

4. **Set custom cache directory:**
```typescript
import { BinaryManager } from 'weaviate-ts-embedded';

const binaryManager = new BinaryManager({
  cacheDir: '/custom/cache/path'
});
```

### Error: Checksum verification failed

**Problem:** Downloaded binary fails checksum verification

**Solutions:**

1. **Clear cache and retry:**
```bash
rm -rf ~/.cache/weaviate-embedded
```

2. **Skip checksum verification (not recommended for production):**
```typescript
import { BinaryManager } from 'weaviate-ts-embedded';

const binaryManager = new BinaryManager({
  skipChecksumVerification: true
});
const binaryPath = await binaryManager.ensureBinary('1.27.0');
```

---

## Performance Issues

### Slow startup time

**Problem:** Weaviate takes a long time to start

**Solutions:**

1. **Use specific version instead of 'latest':**
```typescript
const client = await connectToEmbedded({
  version: '1.27.0'  // Specific version is faster than 'latest'
});
```

2. **Increase wait timeout:**
```typescript
import { waitForReady } from 'weaviate-ts-embedded';

await waitForReady(8080, { 
  timeout: 60000,           // 60 seconds
  retryInterval: 1000,      // Check every second
  useExponentialBackoff: true
});
```

### High memory usage

**Problem:** Weaviate process consuming too much memory

**Solutions:**

1. **Limit query results:**
```typescript
const client = await connectToEmbedded({
  additionalEnvVars: {
    QUERY_DEFAULTS_LIMIT: '50',
    QUERY_MAXIMUM_RESULTS: '1000'
  }
});
```

2. **Configure memory limits via environment variables:**
```typescript
const client = await connectToEmbedded({
  additionalEnvVars: {
    GOMEMLIMIT: '2GiB'  // Limit memory to 2GB
  }
});
```

---

## Data Persistence Issues

### Data not persisting between restarts

**Problem:** Data is lost when the embedded instance is restarted

**Solution:**
Specify a persistent data path:

```typescript
const client = await connectToEmbedded({
  persistenceDataPath: './my-weaviate-data'  // Data will persist here
});
```

Make sure to use the same path each time you start the embedded instance.

### Corrupted data directory

**Problem:** Weaviate fails to start with data corruption errors

**Solutions:**

1. **Backup and remove corrupted data:**
```bash
mv ./data/weaviate ./data/weaviate.backup
```

2. **Start with fresh data directory:**
```typescript
const client = await connectToEmbedded({
  persistenceDataPath: './data/weaviate-fresh'
});
```

---

## Module Configuration Issues

### Error: Module not enabled

**Problem:** `Error: vectorizer module "text2vec-openai" not enabled`

**Solution:**
Enable the required module:

```typescript
const client = await connectToEmbedded({
  additionalEnvVars: {
    ENABLE_MODULES: 'text2vec-openai',
    DEFAULT_VECTORIZER_MODULE: 'text2vec-openai'
  },
  headers: {
    'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY
  }
});
```

### Multiple modules not working

**Problem:** Only first module is being used

**Solution:**
Enable multiple modules with comma separation:

```typescript
const client = await connectToEmbedded({
  additionalEnvVars: {
    ENABLE_MODULES: 'text2vec-openai,text2vec-cohere,generative-openai',
    DEFAULT_VECTORIZER_MODULE: 'text2vec-openai'
  }
});
```

---

## Authentication Issues

### Error: Invalid API key

**Problem:** Authentication fails with embedded instance

**Solution:**

1. **Enable API key authentication:**
```typescript
const client = await connectToEmbedded({
  additionalEnvVars: {
    AUTHENTICATION_APIKEY_ENABLED: 'true',
    AUTHENTICATION_APIKEY_ALLOWED_KEYS: 'my-secret-key',
    AUTHENTICATION_APIKEY_USERS: 'admin'
  },
  authCredentials: {
    apiKey: 'my-secret-key'
  }
});
```

2. **Verify API key matches:**
Make sure the key in `authCredentials` matches one of the keys in `AUTHENTICATION_APIKEY_ALLOWED_KEYS`.

---

## Platform-Specific Issues

### macOS: Permission denied when starting binary

**Problem:** `Error: spawn EACCES` when starting Weaviate

**Solution:**

1. **Grant execute permission:**
```bash
chmod +x ~/.cache/weaviate-embedded/weaviate-*
```

2. **macOS may block unsigned binaries:**
```bash
xattr -d com.apple.quarantine ~/.cache/weaviate-embedded/weaviate-*
```

### Linux: Binary not compatible

**Problem:** `cannot execute binary file: Exec format error`

**Solution:**
This usually means architecture mismatch. The library supports:
- Linux: x86_64 (amd64) and arm64
- macOS: x86_64 (amd64) and arm64 (M1/M2)

Check your architecture:
```bash
uname -m
```

If your architecture is not supported, you can:
1. Use Docker with a supported architecture
2. Build Weaviate from source for your architecture

### Windows: Not supported

**Problem:** Windows is not directly supported

**Solution:**
Use Docker or WSL2:

**Using Docker:**
```bash
docker run -p 8080:8080 -p 50051:50051 semitechnologies/weaviate:latest
```

**Using WSL2:**
Install WSL2 with Ubuntu and run the embedded client from within WSL2.

---

## Getting More Help

If you're still experiencing issues:

1. **Enable debug logging:**
```typescript
const client = await connectToEmbedded({
  additionalEnvVars: {
    LOG_LEVEL: 'debug',
    LOG_FORMAT: 'json'
  }
});
```

2. **Check the Weaviate process logs:**
The embedded client captures stdout/stderr. Look for error messages in your console.

3. **Community Support:**
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/weaviate)
   - [GitHub Issues](https://github.com/weaviate/typescript-embedded/issues)
   - [Weaviate Slack Community](https://weaviate.io/slack)

4. **Report a Bug:**
If you've found a bug, please [open an issue](https://github.com/weaviate/typescript-embedded/issues/new) with:
   - Your Node.js version (`node --version`)
   - Your operating system and architecture
   - Complete error message and stack trace
   - Minimal code example to reproduce the issue

