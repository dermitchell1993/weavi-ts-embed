// V3 API - Modern weaviate-client integration
export { connectToEmbedded } from './connectToEmbedded';
export type { EmbeddedOptions } from './connectToEmbedded';

// Re-export WeaviateClient from weaviate-client for convenience
export type { WeaviateClient } from 'weaviate-client';

// Export binary manager utilities
export * from './binary-manager';
