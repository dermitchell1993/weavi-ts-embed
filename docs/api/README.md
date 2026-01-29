# API Documentation

This directory contains the auto-generated TypeDoc API documentation for `weaviate-ts-embedded`.

## Viewing the Documentation

Open `index.html` in your browser to view the complete API reference, or visit the [hosted documentation on GitHub Pages](https://github.com/weaviate/typescript-embedded) (if available).

## Generating Documentation

To regenerate the API documentation after making changes to source code:

```bash
npm run docs
```

This will regenerate all documentation in this directory based on the TypeScript source files and JSDoc comments.

### Watch Mode

For continuous documentation generation during development:

```bash
npm run docs:watch
```

## Documentation Coverage

The generated documentation includes:

### Core Functions
- `connectToEmbedded()` - Main entry point for connecting to embedded Weaviate
- `validateOptions()` - Validates configuration options

### Interfaces
- `EmbeddedOptions` - Configuration options for embedded instances
- `WeaviateProcessConfig` - Process-level configuration
- `BinaryManagerOptions` - Binary management options
- `WaitForReadyOptions` - Health check configuration

### Classes
- `BinaryManager` - Handles binary downloads and caching
- `WeaviateProcess` - Manages the Weaviate server process lifecycle

### Utility Functions
- `waitForReady()` - Polls Weaviate health endpoint
- `checkLiveness()` - Checks if Weaviate is alive
- `isPortAvailable()` - Checks if a port is available
- `checkPorts()` - Validates multiple ports

## Configuration

Documentation generation is configured in `typedoc.json` in the repository root.

Key settings:
- **Entry Point:** `src/index.ts`
- **Output Directory:** `docs/api`
- **Excluded Files:** Test files (`**/*.test.ts`)
- **Excluded Scopes:** Private and internal members

## Contributing to Documentation

When adding new public APIs or modifying existing ones:

1. **Add JSDoc comments** to functions, classes, and interfaces
2. **Include examples** in `@example` blocks
3. **Document parameters** with `@param` tags
4. **Document return values** with `@returns` tags
5. **Document errors** with `@throws` tags
6. **Run docs generation** to verify output: `npm run docs`

### JSDoc Best Practices

```typescript
/**
 * Brief one-line description.
 *
 * More detailed description explaining the purpose and behavior.
 * Can span multiple paragraphs.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} Description of when this error is thrown
 *
 * @example
 * ```typescript
 * const result = myFunction(arg);
 * console.log(result);
 * ```
 */
export function myFunction(paramName: string): ReturnType {
  // Implementation
}
```

## Additional Resources

- [TypeDoc Documentation](https://typedoc.org/)
- [JSDoc Reference](https://jsdoc.app/)
- [Configuration Guide](../../docs/EMBEDDED_OPTIONS.md)
- [Troubleshooting Guide](../../docs/TROUBLESHOOTING.md)

