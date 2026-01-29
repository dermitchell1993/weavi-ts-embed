// V3 API - Modern weaviate-client integration
export { connectToEmbedded } from './connectToEmbedded';
export type { EmbeddedOptions } from './connectToEmbedded';

// Re-export WeaviateClient from weaviate-client for convenience
export type { WeaviateClient } from 'weaviate-client';

// Export binary manager utilities
export * from './binary-manager';
export * from './port-utils';

// Export process management utilities
export * from './weaviate-process';

// Export health check utilities
export * from './health-check';
