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
2. **Available Ports**: Tests use ports 19080 (HTTP) and 51051 (gRPC) - ensure these are available
3. **Node.js**: Version 18.0.0 or higher
4. **Disk Space**: Approximately 100MB for Weaviate binary and test data

**Note:** Port range 19080-19090 is used to avoid conflicts with PR #15 (port conflict tests) which uses 18080-18098.

## Test Timeout

Integration tests have a 60-second timeout per test to account for:
- Binary download (first run only)
- Process startup time
- Graceful shutdown periods
- Resource cleanup

### Expected Test Execution Time

**First Run (with binary download):**
- Download time: ~30-60 seconds (depends on network speed)
- Test execution: ~15-20 seconds
- **Total: ~45-80 seconds**

**Subsequent Runs (binary cached):**
- Test execution: ~15-20 seconds
- **Total: ~15-20 seconds**

**Per Test Average:** 1-2 seconds (after setup)

## Test Isolation

Each test:
- Uses unique data directories to avoid conflicts
- Cleans up processes in `afterEach` hooks
- Verifies port availability before starting
- Removes test data directories after completion

## CI/CD Integration

### GitHub Actions

Add this to your workflow file (`.github/workflows/test.yml`):

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run integration tests
        run: npm test -- tests/integration
        env:
          # Optional: Customize ports if needed
          TEST_PORT: 19080
          TEST_GRPC_PORT: 51051
```

### GitLab CI

Add this to your `.gitlab-ci.yml`:

```yaml
integration-tests:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test -- tests/integration
  variables:
    TEST_PORT: "19080"
    TEST_GRPC_PORT: "51051"
```

### CircleCI

Add this to your `.circleci/config.yml`:

```yaml
version: 2.1
jobs:
  integration-tests:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run: npm ci
      - run: npm test -- tests/integration
```

### CI/CD Best Practices

1. **Cache Weaviate Binary**: Cache the `~/.weaviate-embedded/` directory to speed up subsequent runs
2. **Parallel Execution**: Run integration tests separately from unit tests
3. **Timeout Configuration**: Set job timeout to at least 10 minutes for first run
4. **Resource Allocation**: Ensure at least 2GB RAM available for test execution

## Environment Variables

The following environment variables can be used to customize test execution:

- `TEST_PORT`: Override the default HTTP port (default: 19080)
- `TEST_GRPC_PORT`: Override the default gRPC port (default: 51051)
- `WEAVIATE_BINARY_PATH`: Use a specific binary path instead of downloading

Example:
```bash
TEST_PORT=20080 TEST_GRPC_PORT=52051 npm test -- tests/integration
```

## Troubleshooting

### Port Already in Use
If tests fail with port errors, ensure no other Weaviate instances or services are using ports 19080 or 51051.

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
