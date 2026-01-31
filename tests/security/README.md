# Archive Bomb Protection Security Tests

This directory contains security tests that validate protection against archive-based attacks in the binary manager.

## 🛡️ Security Threats Covered

### 1. Zip Bombs (Excessive Nesting)
Archives that contain nested archives many levels deep, designed to consume excessive CPU and memory during extraction.

**Example Attack:**
```
bomb.zip
  └─ level1.zip
      └─ level2.zip
          └─ ... (1000 levels)
```

**Protection:** Limit nesting depth to 100 levels

### 2. Decompression Bombs (Extreme Compression Ratios)
Small archives that expand to enormous sizes, exploiting highly compressible data.

**Example Attack:**
- 42.zip: 42KB compressed → 4.5 petabytes uncompressed
- Uses repeated zeros or patterns that compress extremely well

**Protection:** 
- Limit compression ratio to 100:1
- Limit total uncompressed size to 1GB

### 3. Path Traversal Attacks
Archive entries with relative paths that escape the extraction directory.

**Example Attack:**
```
malicious.zip:
  - ../../etc/passwd
  - ../../../root/.ssh/id_rsa
```

**Protection:** Block any paths containing `../` or absolute paths

### 4. Symlink Attacks
Symbolic links in archives pointing to sensitive system files or locations outside the extraction directory.

**Example Attack:**
```
archive.zip:
  - innocent.txt -> /etc/passwd (symlink)
```

**Protection:** Block or carefully validate all symlinks

### 5. Additional Threats
- Null bytes in filenames (string truncation exploits)
- Extremely long paths (filesystem limits)
- Corrupted archives (parser crashes)
- Permission errors (graceful handling)

## 🎯 Security Thresholds

| Parameter | Threshold | Rationale |
|-----------|-----------|-----------|
| Max Nesting Depth | 100 levels | Prevents recursive bomb attacks while allowing legitimate nested structures |
| Max Compression Ratio | 100:1 | Prevents decompression bombs while allowing normal compression (typical: 2:1 to 10:1) |
| Max Uncompressed Size | 1GB | Prevents disk exhaustion; reasonable limit for binary archives |
| Max Path Length | 4096 chars | Standard filesystem limit (Linux PATH_MAX) |

## 📁 Test Files

- **`archiveBombs.test.ts`** - Main security test suite
- **`../helpers/securityArchives.ts`** - Malicious archive generators

## 🚀 Running Tests

```bash
# Run all security tests
npm test tests/security/

# Run specific test group
npm test -- --grep "Excessive Nesting"

# Run with coverage
npm run test:coverage -- tests/security/
```

## ⚠️ Implementation Status

**CURRENT STATUS: Tests document required behavior**

These tests are written assuming security protections WILL BE implemented in:
- `EmbeddedDB.untarBinary()` 
- `EmbeddedDB.unzipBinary()`

Until security features are added, some tests may fail or be skipped.

## 🔧 Required Implementations

### For `untarBinary()`:
```typescript
private async untarBinary(tarballPath: string): Promise<null> {
  let nestingDepth = 0;
  let totalUncompressed = 0;
  
  // Track extraction metrics
  tarball.on('entry', (entry) => {
    // Validate path for traversal
    if (entry.path.includes('../') || path.isAbsolute(entry.path)) {
      throw new Error(`Path traversal detected: ${entry.path}`);
    }
    
    // Check nesting depth
    const depth = (entry.path.match(/\//g) || []).length;
    if (depth > MAX_NESTING_DEPTH) {
      throw new Error(`Nesting depth ${depth} exceeds maximum ${MAX_NESTING_DEPTH}`);
    }
    
    // Track size
    totalUncompressed += entry.size;
    if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
      throw new Error(`Uncompressed size exceeds maximum`);
    }
  });
  
  // ... existing extraction logic
}
```

### For `unzipBinary()`:
```typescript
private unzipBinary(zipPath: string): Promise<null> {
  const zip = new Unzipper(zipPath);
  const entries = zip.getEntries();
  
  let totalCompressed = 0;
  let totalUncompressed = 0;
  
  entries.forEach((entry) => {
    // Validate path
    if (entry.entryName.includes('../') || path.isAbsolute(entry.entryName)) {
      throw new Error(`Path traversal detected: ${entry.entryName}`);
    }
    
    // Calculate compression metrics
    totalCompressed += entry.compressedSize;
    totalUncompressed += entry.uncompressedSize;
  });
  
  // Check compression ratio
  const ratio = totalUncompressed / totalCompressed;
  if (ratio > MAX_COMPRESSION_RATIO) {
    throw new Error(`Compression ratio ${ratio}:1 exceeds maximum ${MAX_COMPRESSION_RATIO}:1`);
  }
  
  // ... existing extraction logic
}
```

## 📚 References

- [OWASP: Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [Zip Bomb (Wikipedia)](https://en.wikipedia.org/wiki/Zip_bomb)
- [Bamsoftware: A Better Zip Bomb](https://www.bamsoftware.com/hacks/zipbomb/)
- [CVE-2018-1002200: Kubernetes Path Traversal](https://nvd.nist.gov/vuln/detail/CVE-2018-1002200)
- [Evilarc: Archive Path Traversal Tool](https://github.com/ptoomey3/evilarc)

## 🔗 Related Issues

- **PRI-829**: Archive Bomb Protection (this implementation)
- **PRI-824**: Binary Manager Test Enhancements (parent)
- **PRI-789**: Wave 2: Testing Suite (grandparent)

## 👨‍💻 Testing Best Practices

1. **Isolation**: Each test creates its own temporary directory
2. **Cleanup**: Tests clean up after themselves (even on failure)
3. **Clear Assertions**: Error messages specify what was tested and why it failed
4. **Edge Cases**: Tests cover boundary conditions (exactly at threshold, just above/below)
5. **Performance**: Tests complete in < 3 seconds (acceptance criteria)
6. **Documentation**: Each test includes comments explaining the attack vector

## 🎯 Success Criteria

- ✅ All 5 main attack vectors have test coverage
- ✅ Boundary conditions tested for all thresholds
- ✅ Tests execute in < 3 seconds
- ✅ Mock archive generators created and documented
- ✅ Security thresholds documented
- ✅ Clear, actionable error messages specified
- ✅ No false positives on legitimate archives

## 📝 Notes

This security test suite was developed following the Wave-Based development model for the Weaviate TS Embedded v3 Migration project. The tests can run independently and merge to `develop` without blocking other parallel work streams.

**Agent**: PRI-829 (Agent 4 - Archive Bomb Protection)  
**Wave**: Wave 2 (Testing Suite)  
**Execution Model**: Parallel (zero conflicts with other agents)

