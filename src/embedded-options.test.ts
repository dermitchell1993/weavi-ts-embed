import { validateOptions, type EmbeddedOptions } from './embedded-options';

describe('validateOptions', () => {
  describe('valid options', () => {
    it('should accept undefined options', () => {
      expect(() => validateOptions()).not.toThrow();
    });

    it('should accept empty options object', () => {
      expect(() => validateOptions({})).not.toThrow();
    });

    it('should accept valid port', () => {
      expect(() => validateOptions({ port: 8080 })).not.toThrow();
    });

    it('should accept valid grpcPort', () => {
      expect(() => validateOptions({ grpcPort: 50051 })).not.toThrow();
    });

    it('should accept valid version in X.Y.Z format', () => {
      expect(() => validateOptions({ version: '1.27.0' })).not.toThrow();
      expect(() => validateOptions({ version: '1.0.0' })).not.toThrow();
      expect(() => validateOptions({ version: '10.20.30' })).not.toThrow();
    });

    it('should accept "latest" as version', () => {
      expect(() => validateOptions({ version: 'latest' })).not.toThrow();
    });

    it('should accept valid binaryPath', () => {
      expect(() => validateOptions({ binaryPath: '/usr/local/bin/weaviate' })).not.toThrow();
    });

    it('should accept valid persistenceDataPath', () => {
      expect(() => validateOptions({ persistenceDataPath: './data/weaviate' })).not.toThrow();
    });

    it('should accept valid additionalEnvVars', () => {
      expect(() =>
        validateOptions({
          additionalEnvVars: {
            ENABLE_MODULES: 'text2vec-openai',
            LOG_LEVEL: 'debug',
          },
        })
      ).not.toThrow();
    });

    it('should accept valid headers', () => {
      expect(() =>
        validateOptions({
          headers: {
            'X-OpenAI-Api-Key': 'sk-...',
            'X-Custom-Header': 'value',
          },
        })
      ).not.toThrow();
    });

    it('should accept valid authCredentials', () => {
      expect(() =>
        validateOptions({
          authCredentials: { apiKey: 'your-api-key' },
        })
      ).not.toThrow();
    });

    it('should accept complete valid configuration', () => {
      const options: EmbeddedOptions = {
        port: 8080,
        grpcPort: 50051,
        version: '1.27.0',
        binaryPath: '/usr/local/bin/weaviate',
        persistenceDataPath: './my-weaviate-data',
        additionalEnvVars: {
          ENABLE_MODULES: 'text2vec-openai',
          LOG_LEVEL: 'debug',
        },
        headers: {
          'X-OpenAI-Api-Key': 'sk-...',
        },
        authCredentials: { apiKey: 'your-api-key' },
      };

      expect(() => validateOptions(options)).not.toThrow();
    });

    it('should accept minimum valid port (1024)', () => {
      expect(() => validateOptions({ port: 1024 })).not.toThrow();
    });

    it('should accept maximum valid port (65535)', () => {
      expect(() => validateOptions({ port: 65535 })).not.toThrow();
    });
  });

  describe('invalid port', () => {
    it('should reject port below 1024', () => {
      expect(() => validateOptions({ port: 1023 })).toThrow('Port must be between 1024 and 65535');
      expect(() => validateOptions({ port: 80 })).toThrow('Port must be between 1024 and 65535');
    });

    it('should reject port above 65535', () => {
      expect(() => validateOptions({ port: 65536 })).toThrow('Port must be between 1024 and 65535');
      expect(() => validateOptions({ port: 100000 })).toThrow('Port must be between 1024 and 65535');
    });

    it('should reject non-integer port', () => {
      expect(() => validateOptions({ port: 8080.5 })).toThrow('Port must be an integer');
    });

    it('should reject negative port', () => {
      expect(() => validateOptions({ port: -1 })).toThrow('Port must be between 1024 and 65535');
    });
  });

  describe('invalid grpcPort', () => {
    it('should reject grpcPort below 1024', () => {
      expect(() => validateOptions({ grpcPort: 1023 })).toThrow('gRPC port must be between 1024 and 65535');
      expect(() => validateOptions({ grpcPort: 80 })).toThrow('gRPC port must be between 1024 and 65535');
    });

    it('should reject grpcPort above 65535', () => {
      expect(() => validateOptions({ grpcPort: 65536 })).toThrow('gRPC port must be between 1024 and 65535');
      expect(() => validateOptions({ grpcPort: 100000 })).toThrow('gRPC port must be between 1024 and 65535');
    });

    it('should reject non-integer grpcPort', () => {
      expect(() => validateOptions({ grpcPort: 50051.5 })).toThrow('gRPC port must be an integer');
    });

    it('should reject negative grpcPort', () => {
      expect(() => validateOptions({ grpcPort: -1 })).toThrow('gRPC port must be between 1024 and 65535');
    });
  });

  describe('port conflicts', () => {
    it('should reject when port and grpcPort are the same', () => {
      expect(() => validateOptions({ port: 8080, grpcPort: 8080 })).toThrow(
        'HTTP port and gRPC port must be different'
      );
    });
  });

  describe('invalid version', () => {
    it('should reject empty string version', () => {
      expect(() => validateOptions({ version: '' })).toThrow('Version cannot be empty string');
    });

    it('should reject version with invalid format', () => {
      expect(() => validateOptions({ version: '1.27' })).toThrow(
        'Version must be in format X.Y.Z or "latest"'
      );
      expect(() => validateOptions({ version: 'v1.27.0' })).toThrow(
        'Version must be in format X.Y.Z or "latest"'
      );
      expect(() => validateOptions({ version: '1.27.0-beta' })).toThrow(
        'Version must be in format X.Y.Z or "latest"'
      );
      expect(() => validateOptions({ version: '1' })).toThrow('Version must be in format X.Y.Z or "latest"');
    });
  });

  describe('invalid binaryPath', () => {
    it('should reject non-string binaryPath', () => {
      expect(() => validateOptions({ binaryPath: 123 as any })).toThrow('binaryPath must be a string');
      expect(() => validateOptions({ binaryPath: true as any })).toThrow('binaryPath must be a string');
      expect(() => validateOptions({ binaryPath: {} as any })).toThrow('binaryPath must be a string');
    });
  });

  describe('invalid persistenceDataPath', () => {
    it('should reject non-string persistenceDataPath', () => {
      expect(() => validateOptions({ persistenceDataPath: 123 as any })).toThrow(
        'persistenceDataPath must be a string'
      );
      expect(() => validateOptions({ persistenceDataPath: true as any })).toThrow(
        'persistenceDataPath must be a string'
      );
      expect(() => validateOptions({ persistenceDataPath: {} as any })).toThrow(
        'persistenceDataPath must be a string'
      );
    });
  });

  describe('invalid additionalEnvVars', () => {
    it('should reject non-object additionalEnvVars', () => {
      expect(() => validateOptions({ additionalEnvVars: 'string' as any })).toThrow(
        'additionalEnvVars must be an object'
      );
      expect(() => validateOptions({ additionalEnvVars: 123 as any })).toThrow(
        'additionalEnvVars must be an object'
      );
      expect(() => validateOptions({ additionalEnvVars: null as any })).toThrow(
        'additionalEnvVars must be an object'
      );
    });

    it('should reject array as additionalEnvVars', () => {
      expect(() => validateOptions({ additionalEnvVars: [] as any })).toThrow(
        'additionalEnvVars must be an object'
      );
      expect(() => validateOptions({ additionalEnvVars: ['value'] as any })).toThrow(
        'additionalEnvVars must be an object'
      );
    });

    it('should reject additionalEnvVars with non-string values', () => {
      expect(() =>
        validateOptions({
          additionalEnvVars: {
            ENABLE_MODULES: 'text2vec-openai',
            LOG_LEVEL: 123 as any,
          },
        })
      ).toThrow('additionalEnvVars.LOG_LEVEL must be a string, got number');
    });
  });

  describe('invalid headers', () => {
    it('should reject non-object headers', () => {
      expect(() => validateOptions({ headers: 'string' as any })).toThrow('headers must be an object');
      expect(() => validateOptions({ headers: 123 as any })).toThrow('headers must be an object');
      expect(() => validateOptions({ headers: null as any })).toThrow('headers must be an object');
    });

    it('should reject array as headers', () => {
      expect(() => validateOptions({ headers: [] as any })).toThrow('headers must be an object');
      expect(() => validateOptions({ headers: ['value'] as any })).toThrow('headers must be an object');
    });

    it('should reject headers with non-string values', () => {
      expect(() =>
        validateOptions({
          headers: {
            'X-OpenAI-Api-Key': 'sk-...',
            'X-Custom-Header': 123 as any,
          },
        })
      ).toThrow('headers.X-Custom-Header must be a string, got number');
    });
  });

  describe('invalid authCredentials', () => {
    it('should reject non-object authCredentials', () => {
      expect(() => validateOptions({ authCredentials: 'string' as any })).toThrow(
        'authCredentials must be an object'
      );
      expect(() => validateOptions({ authCredentials: 123 as any })).toThrow(
        'authCredentials must be an object'
      );
      expect(() => validateOptions({ authCredentials: null as any })).toThrow(
        'authCredentials must be an object'
      );
    });
  });
});
