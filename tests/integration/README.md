# Integration Tests

This directory contains integration tests for the Weaviate TypeScript Embedded Client.

## Overview

Integration tests verify the complete functionality of the embedded Weaviate client by interacting with real system resources including:
- Actual Weaviate binary processes
- System ports and networking
- File system operations
- Process signals and lifecycle management

## Test Files

### `lifecycle.test.ts`
Tests for Weaviate process lifecycle management, including:
- Starting and stopping processes
- Graceful shutdown with SIGTERM
- Force termination with SIGKILL
- Resource cleanup verification
- Multiple start/stop cycles
- Restart scenarios

## Running Integration Tests

### Run All Tests (Unit + Integration)
```bash
npm test
```

### Run Only Integration Tests
```bash
npm test -- tests/integration
```

### Run Specific Integration Test File
```bash
npm test -- tests/integration/lifecycle.test.ts
```

## Requirements

1. **Weaviate Binary**: Integration tests will automatically download the Weaviate binary on first run (requires internet connection)
2. **Available Ports**: Tests use ports 18080 (HTTP) and 50151 (gRPC) - ensure these are available
3. **Node.js**: Version 18.0.0 or higher
4. **Disk Space**: Approximately 100MB for Weaviate binary and test data

## Test Timeout

Integration tests have a 60-second timeout per test to account for:
- Binary download (first run only)
- Process startup time
- Graceful shutdown periods
- Resource cleanup

## Test Isolation

Each test:
- Uses unique data directories to avoid conflicts
- Cleans up processes in `afterEach` hooks
- Verifies port availability before starting
- Removes test data directories after completion

## Troubleshooting

### Port Already in Use
If tests fail with port errors, ensure no other Weaviate instances or services are using ports 18080 or 50151.

### Binary Download Fails
If the binary download fails:
1. Check your internet connection
2. Verify access to GitHub releases
3. Try manually downloading from: https://github.com/weaviate/weaviate/releases

### Tests Timeout
If tests consistently timeout:
1. Check system resources (CPU, memory)
2. Increase timeout in individual test files
3. Run tests with `--runInBand` flag to avoid parallel execution

### Cleanup Issues
If test data directories accumulate:
```bash
# Clean up test data manually
rm -rf /tmp/weaviate-test-*
```

## Contributing

When adding new integration tests:
1. Follow the existing test structure
2. Use unique ports to avoid conflicts
3. Always clean up resources in `afterEach`
4. Document test purpose and requirements
5. Set appropriate timeouts for long-running operations
6. Ensure tests can run independently and in any order

