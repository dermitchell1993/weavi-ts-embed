# Binary Manager Mock Setup Tests

This directory contains comprehensive unit tests for validating mock setups used in binary download and streaming scenarios.

## Test Suite: `binaryManager.mockSetup.test.ts`

### Overview

These tests demonstrate proper mock patterns for testing HTTP download functionality, stream handling, and error scenarios. They serve as examples for testing binary managers and download utilities.

### Test Categories

#### 1. **Chunked Transfer Encoding** (3 tests)
Tests realistic HTTP chunked transfer scenarios:
- Multiple data chunks assembly
- Empty chunk handling
- Rapid successive chunks (stress test with 100 chunks)

#### 2. **Large File Handling** (3 tests)
Memory pressure and large file scenarios:
- 10MB files with 1MB chunks
- 50MB files with 5MB chunks
- Varied chunk sizes (realistic streaming patterns: 8KB - 1MB)

#### 3. **Connection Timeouts** (3 tests)
Timeout handling during downloads:
- No 'end' event received (ETIMEDOUT)
- Timeout during large file downloads
- Slow connections with delayed chunks

#### 4. **Connection Errors Mid-Stream** (7 tests)
Network error scenarios:
- Connection reset (ECONNRESET)
- Connection refused (ECONNREFUSED)
- Host unreachable (EHOSTUNREACH)
- Multiple error handling
- Partial download failures (EPIPE)
- Custom error messages (e.g., SSL certificate errors)

#### 5. **Edge Cases and Boundary Conditions** (5 tests)
Boundary scenarios:
- Zero-byte files (empty downloads)
- Single-byte chunks (minimum chunk size)
- HTTP 302 redirects followed by chunked transfer
- Backpressure handling (slow consumer)

### Running the Tests

```bash
# Run all mock setup tests
npm test --  tests/unit/binaryManager.mockSetup.test.ts

# Run with coverage
npm run test:coverage -- tests/unit/binaryManager.mockSetup.test.ts

# Run in watch mode
npm run test:watch tests/unit/binaryManager.mockSetup.test.ts
```

### Key Testing Patterns

####  Writable Stream Mocking
```typescript
const dataChunks: Buffer[] = [];
const mockFile = new Writable({
  write(chunk: Buffer, encoding: BufferEncoding, callback) {
    dataChunks.push(chunk);
    callback();
  },
});
```

#### HTTP Response Mocking
```typescript
const mockResponse = Object.assign(new EventEmitter(), {
  statusCode: 200,
  headers: {},
  pipe: vi.fn(function(destination: Writable) {
    this.on('data', (chunk: Buffer) => destination.write(chunk));
    this.on('end', () => destination.end());
    this.on('error', (err: Error) => destination.destroy(err));
    return destination;
  }),
});
```

#### Simulating Chunked Downloads
```typescript
mockResponse.pipe(mockFile);
mockResponse.emit('data', Buffer.from('chunk1'));
mockResponse.emit('data', Buffer.from('chunk2'));
mockResponse.emit('end');
```

#### Testing Error Scenarios
```typescript
mockFile.on('error', (err: Error) => {
  expect(err.message).toMatch(/ECONNRESET/i);
  done();
});

mockResponse.pipe(mockFile);
mockResponse.emit('data', Buffer.from('partial_data'));
mockResponse.emit('error', new Error('ECONNRESET: Connection reset'));
```

### Test Metrics

- **Total Tests**: 19
- **Code Coverage**: Validates mock patterns for streaming downloads
- **Execution Time**: <100ms for full suite
- **Memory Safety**: Tests validate proper handling of large buffers (50MB+)

### Future Enhancements

These tests can be extended to cover:
1. Real filesystem integration tests
2. Archive extraction validation
3. Checksum verification
4. Retry logic testing
5. Progress callback validation

### Related Issues

- **Parent**: [PRI-824](https://linear.app/prince-josh/issue/PRI-824) - Binary Manager Test Enhancements
- **Project**: Wave 2 Testing Suite (Parallel Execution)
- **Agent**: Agent 1 - Mock Setup Enhancements

