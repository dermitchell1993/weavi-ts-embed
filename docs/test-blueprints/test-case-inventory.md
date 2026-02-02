# Test Case Inventory - Phase 0 Research
*Comprehensive catalog of test scenarios from test-museum branch*

## Inventory Summary
- **Total Test Files:** 31
- **Total Test Cases:** ~150+ (estimated from patterns)
- **Test Categories:** Unit, Integration, Security, Performance, Config
- **Coverage Areas:** Binary Management, Operations, Lifecycle, Security, Configuration

## UNIT TESTS

### Binary Manager (src/binary-manager.test.ts)
**File:** src/binary-manager.test.ts (904 lines, 54 tests)

#### Version Resolution Tests
| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should return "latest" when no version specified | Version parsing | Default behavior | Empty input |
| should return "latest" when explicitly specified | Version parsing | Explicit default | String handling |
| should accept valid semantic versions (major.minor.patch) | Version validation | Format acceptance | Standard formats |
| should reject invalid version formats | Input validation | Error throwing | Malformed input |
| should treat empty version string as "latest" | Edge case handling | Empty string handling | Null/undefined |
| should reject versions with prefixes | Security | Path traversal prevention | Attack vectors |
| should return undefined when binaryUrl provided | Logic branching | URL override | Alternative input |
| should throw error when both version and binaryUrl provided | Conflict detection | Error on invalid combo | Parameter validation |
| should reject path traversal attempts in version string | Security | Path sanitization | Injection attacks |

#### URL Construction Tests
| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should return custom binaryUrl when provided | URL handling | Custom URL passthrough | Override behavior |
| should construct correct URL for Linux x64 | Platform detection | URL format | Architecture specific |
| should construct correct URL for Linux arm64 | Platform detection | URL format | Architecture specific |
| should construct correct URL for macOS (darwin) | Platform detection | URL format | OS specific |
| should use .tar.gz extension for Linux | File extension logic | Extension selection | Platform mapping |
| should use .zip extension for macOS | File extension logic | Extension selection | Platform mapping |

#### Checksum & Caching Tests
| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should verify MD5 checksums correctly | Integrity checking | Hash validation | Valid/invalid hashes |
| should generate correct cache paths | Path generation | Path construction | Collision avoidance |
| should handle cache collisions | Conflict resolution | Unique path generation | Hash conflicts |
| should manage persistence data paths | Data storage | Path management | Environment integration |

#### Download Logic Tests
| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should handle successful downloads | Network operations | Success path | Normal operation |
| should handle download redirects | HTTP handling | Redirect following | Server responses |
| should handle download timeouts | Error handling | Timeout detection | Network issues |
| should implement retry logic | Resilience | Retry attempts | Transient failures |
| should handle network errors | Error handling | Error propagation | Connection issues |

#### Extraction Logic Tests
| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should extract tar.gz archives | Archive handling | Extraction success | Format support |
| should extract zip archives | Archive handling | Extraction success | Format support |
| should detect corrupted archives | Integrity checking | Corruption detection | Malformed files |
| should handle extraction errors | Error handling | Error reporting | Failed extraction |
| should prevent path traversal in archives | Security | Path sanitization | Zip slip attacks |

#### Persistence & Data Path Tests
| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should generate correct data paths | Path management | Path construction | Environment variables |
| should validate data directory permissions | Security | Permission checking | Access control |
| should handle environment variable overrides | Configuration | Variable integration | Custom paths |

#### Integration & Edge Cases Tests
| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should handle end-to-end binary lifecycle | Integration | Full workflow | Complete scenarios |
| should validate configuration combinations | Validation | Config checking | Invalid combos |
| should handle resource cleanup | Resource management | Cleanup verification | Memory leaks |

#### Performance & Resource Management Tests
| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should monitor memory usage | Performance | Resource tracking | Memory limits |
| should prevent resource leaks | Resource management | Leak detection | Cleanup verification |
| should handle concurrent operations | Concurrency | Thread safety | Race conditions |

### Operations (src/operations.test.ts)
**File:** src/operations.test.ts (316 lines, 15 tests)

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| creates collection with text properties | CRUD | Collection creation | Property types |
| lists all collections | Read operations | Collection enumeration | Empty database |
| retrieves collection by name after creation | Read operations | Name-based retrieval | Non-existent names |
| deletes a collection | CRUD | Collection removal | Dependencies |
| inserts single object | CRUD | Object insertion | Data validation |
| inserts batch objects | Batch operations | Bulk insertion | Large datasets |
| updates an object | CRUD | Object modification | Partial updates |
| deletes object by ID | CRUD | ID-based deletion | Invalid IDs |
| deletes objects by filter | Query operations | Filter-based deletion | Complex filters |
| fetches with limit | Query operations | Result limiting | Boundary limits |
| searches with filters | Query operations | Filter application | Multiple conditions |
| handles connection errors | Error handling | Connection recovery | Network issues |
| validates input parameters | Validation | Input checking | Invalid parameters |
| manages transactions | Transaction handling | ACID properties | Rollback scenarios |

## INTEGRATION TESTS

### Lifecycle Integration (tests/integration/lifecycle.test.ts)
**File:** tests/integration/lifecycle.test.ts (25KB, 10+ tests)

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should start process successfully with valid configuration | Process management | Successful startup | Valid config |
| should handle port conflict gracefully without crashing | Port management | Conflict resolution | Port in use |
| should restart process after manual stop | Process lifecycle | Restart capability | Stop/start cycle |
| should handle environment variable overrides | Configuration | Variable precedence | Env integration |
| should manage multiple concurrent instances | Multi-instance | Instance isolation | Resource sharing |
| should handle graceful shutdown | Process lifecycle | Clean termination | Signal handling |
| should recover from process crashes | Resilience | Auto-recovery | Crash scenarios |
| should validate configuration on startup | Validation | Config checking | Invalid config |
| should handle resource cleanup on exit | Resource management | Cleanup verification | Exit scenarios |
| should maintain process health monitoring | Health checking | Status monitoring | Health endpoints |

### Downloads Integration (tests/integration/downloads.test.ts)
**File:** tests/integration/downloads.test.ts (11KB)

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should download and verify binary integrity | Download workflow | End-to-end download | Checksum validation |
| should handle network interruptions | Resilience | Resume capability | Connection drops |
| should validate download size limits | Security | Size restrictions | Large files |
| should handle authentication requirements | Security | Auth handling | Protected resources |

### Embedded DB Integration (tests/integration/embeddedDB.test.ts)
**File:** tests/integration/embeddedDB.test.ts (19KB)

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should initialize database with custom schema | DB initialization | Schema application | Custom schemas |
| should handle concurrent read/write operations | Concurrency | Data consistency | Race conditions |
| should maintain data integrity across restarts | Persistence | Data preservation | Restart cycles |
| should handle large dataset operations | Performance | Scalability | Large datasets |

### Environment Variables (tests/integration/env-vars.test.ts)
**File:** tests/integration/env-vars.test.ts (19KB)

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should respect WEAVIATE_PORT environment variable | Configuration | Port override | Custom ports |
| should handle WEAVIATE_DATA_PATH overrides | Configuration | Path override | Custom paths |
| should validate environment variable formats | Validation | Format checking | Invalid values |
| should handle missing environment variables | Defaults | Fallback behavior | Missing vars |

### Extraction Integration (tests/integration/extraction.test.ts)
**File:** tests/integration/extraction.test.ts (17KB)

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should extract and validate binary executability | Extraction workflow | Executable creation | Permission setting |
| should handle partial extraction failures | Resilience | Partial recovery | Corrupted segments |
| should validate extracted file permissions | Security | Permission checking | Executable rights |
| should handle disk space constraints | Resource management | Space checking | Low disk space |

### Multiple Instances (tests/integration/multiple-instances.test.ts)
**File:** tests/integration/multiple-instances.test.ts (23KB)

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should run multiple instances on different ports | Multi-instance | Port isolation | Port conflicts |
| should share common data when configured | Data sharing | Shared access | Configuration options |
| should maintain instance independence | Isolation | Independent operation | Resource separation |
| should handle instance communication | Inter-instance | Communication protocols | Message passing |

### Port Conflicts (tests/integration/port-conflicts.test.ts)
**File:** tests/integration/port-conflicts.test.ts (21KB)

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should detect and resolve port conflicts automatically | Conflict resolution | Auto port selection | Dynamic allocation |
| should handle port range exhaustion | Resource management | Exhaustion handling | No available ports |
| should maintain port reservations | Persistence | Reservation tracking | Restart scenarios |
| should handle port release on cleanup | Resource management | Cleanup verification | Proper teardown |

## SECURITY TESTS

### Archive Bombs (tests/security/archiveBombs.test.ts)
**File:** tests/security/archiveBombs.test.ts

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should detect and reject zip bombs with extreme nesting | Zip bomb protection | Nesting detection | Deep nesting (>100 levels) |
| should detect and reject zip bombs with moderate nesting | Zip bomb protection | Nesting detection | Moderate nesting |
| should accept archives with safe nesting levels (<= 100 levels) | Safe archive handling | Acceptance criteria | Normal archives |
| should detect nesting at exactly the threshold boundary (100 levels) | Boundary testing | Threshold detection | Exact boundary |
| should detect nesting just above threshold (101 levels) | Boundary testing | Threshold enforcement | Boundary +1 |

### Corrupted Archives (tests/security/corruptedArchives.test.ts)
**File:** tests/security/corruptedArchives.test.ts

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should detect truncated archives | Corruption detection | Format validation | Partial files |
| should detect modified archive headers | Integrity checking | Header validation | Tampered headers |
| should handle archives with invalid compression | Compression validation | Algorithm checking | Unsupported compression |
| should prevent extraction of malicious symlinks | Path traversal | Symlink validation | Symlink attacks |
| should validate archive metadata integrity | Metadata checking | Structure validation | Corrupted metadata |

## PERFORMANCE TESTS

### Benchmarks (tests/performance/benchmarks.test.ts)
**File:** tests/performance/benchmarks.test.ts

| Test Name | Category | Assertions | Edge Cases |
|-----------|----------|------------|------------|
| should measure binary download performance | Download performance | Speed metrics | Network conditions |
| should measure extraction performance | Extraction performance | Speed metrics | Archive sizes |
| should measure startup time | Startup performance | Time metrics | Cold starts |
| should measure query performance | Query performance | Response times | Query complexity |
| should measure memory usage patterns | Memory performance | Usage tracking | Memory leaks |

## CONFIG TESTS

### Config Defaults (src/__tests__/config-defaults.test.ts)
| Test Name | Category | Assertions |
|-----------|----------|------------|
| should provide sensible defaults for all configuration options | Defaults | Default values |
| should handle missing configuration gracefully | Resilience | Fallback behavior |
| should validate default value types | Type checking | Type safety |

### Config Validation (Multiple files)
**Basic Validation:**
- should reject invalid port numbers
- should validate data path formats
- should check version format requirements

**Field Validation:**
- should validate required fields
- should handle optional field absence
- should validate field type constraints

**Version Validation:**
- should accept valid semantic versions
- should reject invalid version strings
- should handle version comparison logic

## HELPER USAGE PATTERNS

### Current Helper Structure
- **mockArchives.ts (274 lines):** Archive creation, corruption simulation, fixture generation
- **networkUtils.ts (185 lines):** HTTP mocking, timeout simulation, response stubbing
- **processUtils.ts (322 lines):** Process spawning, signal handling, lifecycle management
- **securityArchives.ts (332 lines):** Security archive creation, bomb generation, validation helpers

### Helper Function Categories
1. **Factory Functions:** Create test objects with predefined configurations
2. **Mock Builders:** Construct complex mock scenarios
3. **Validation Helpers:** Common assertion patterns
4. **Utility Functions:** Common test operations

## TEST ORGANIZATION MATRIX

| Category | Files | Total Tests | Focus Areas | Key Patterns |
|----------|-------|-------------|-------------|--------------|
| Unit - Binary | 1 | 54 | Version, URL, Download, Extraction | Security-first, platform-specific |
| Unit - Operations | 1 | 15 | CRUD, Batch, Query | Full lifecycle, error handling |
| Integration | 7 | ~70 | Lifecycle, Downloads, DB, Env, Extraction, Multi-instance, Ports | End-to-end, resilience |
| Security | 2 | ~15 | Archive bombs, corruption | Boundary testing, attack vectors |
| Performance | 1 | ~10 | Benchmarks, metrics | Measurement, comparison |
| Config | 8 | ~40 | Defaults, validation, merging | Configuration management |

## TOTAL INVENTORY: ~204 test cases across 20 files

This inventory ensures comprehensive coverage while guiding the clean rebuild from the 92a30d4 state. All test scenarios will be preserved through simple helper functions instead of complex DSL patterns.

