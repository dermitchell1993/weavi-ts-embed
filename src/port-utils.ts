import { createServer } from 'net';

/**
 * Check if a port is available for binding.
 *
 * @param port The port number to check
 * @returns Promise that resolves to true if the port is available, false otherwise
 *
 * @example
 * ```typescript
 * const available = await isPortAvailable(8080);
 * if (available) {
 *   console.log('Port 8080 is available');
 * } else {
 *   console.log('Port 8080 is already in use');
 * }
 * ```
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Check if both HTTP and gRPC ports are available.
 * Throws an error with actionable suggestions if any port is unavailable.
 *
 * @param httpPort The HTTP port to check
 * @param grpcPort The gRPC port to check
 * @throws Error if either port is unavailable
 *
 * @example
 * ```typescript
 * try {
 *   await checkPorts(8080, 50051);
 *   console.log('Both ports are available');
 * } catch (error) {
 *   console.error(error.message);
 *   // Port 8080 is already in use. Try: connectToEmbedded({ port: 8081 })
 * }
 * ```
 */
export async function checkPorts(httpPort: number, grpcPort: number): Promise<void> {
  const httpAvailable = await isPortAvailable(httpPort);
  const grpcAvailable = await isPortAvailable(grpcPort);

  if (!httpAvailable || !grpcAvailable) {
    const portStatus = [];

    if (!httpAvailable) {
      portStatus.push(`HTTP port ${httpPort} is already in use`);
    }

    if (!grpcAvailable) {
      portStatus.push(`gRPC port ${grpcPort} is already in use`);
    }

    const suggestions = [];

    if (!httpAvailable) {
      suggestions.push(`Try using a different HTTP port: connectToEmbedded({ port: ${httpPort + 1} })`);
    }

    if (!grpcAvailable) {
      suggestions.push(`Try using a different gRPC port: connectToEmbedded({ grpcPort: ${grpcPort + 1} })`);
    }

    if (!httpAvailable && !grpcAvailable) {
      suggestions.push(
        `Or specify both: connectToEmbedded({ port: ${httpPort + 1}, grpcPort: ${grpcPort + 1} })`
      );
    }

    suggestions.push(`Another Weaviate instance may be running. Check with: lsof -i :${httpPort}`);

    throw new Error(
      `Ports already in use. ${portStatus.join(', ')}. Suggestions:\n  - ${suggestions.join('\n  - ')}`
    );
  }
}
