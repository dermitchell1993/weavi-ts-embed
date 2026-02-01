/**
 * Logger Integration Tests
 *
 * Tests configurable logging framework for version validation warnings.
 * Covers:
 * - Custom logger usage
 * - Silent logger (suppression)
 * - Default logger fallback
 * - Logger threading through validation pipeline
 */

import { describe, it, expect, vi } from 'vitest';
import { validateOptions, prepareConfig } from '../config';
import type { EmbeddedOptionsConfig } from '../embedded';
import type { Logger } from '../types';

describe('Logger Integration', () => {
  describe('Custom Logger', () => {
    it('uses custom logger for 0.x.x version warnings', () => {
      const mockLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const config: EmbeddedOptionsConfig = { version: '0.1.0' };
      validateOptions(config, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('0.x.x'));
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('initial development phase'));
    });

    it('uses custom logger for build metadata warnings', () => {
      const mockLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const config: EmbeddedOptionsConfig = { version: '1.0.0+build.123' };
      validateOptions(config, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('build metadata'));
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('without pre-release tag'));
    });

    it('uses custom logger from config object', () => {
      const mockLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const config: EmbeddedOptionsConfig = {
        version: '0.23.7',
        logger: mockLogger,
      };
      validateOptions(config);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('does not call logger for stable versions without build metadata', () => {
      const mockLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const config: EmbeddedOptionsConfig = { version: '1.23.7' };
      validateOptions(config, mockLogger);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Silent Logger', () => {
    it('suppresses warnings with no-op logger', () => {
      const silentLogger: Logger = {
        warn: () => {},
        error: () => {},
        info: () => {},
      };

      // Should not throw and should not log
      expect(() => {
        validateOptions({ version: '0.1.0' }, silentLogger);
      }).not.toThrow();

      expect(() => {
        validateOptions({ version: '1.0.0+build.123' }, silentLogger);
      }).not.toThrow();
    });

    it('allows users to suppress warnings via config logger', () => {
      const silentLogger: Logger = {
        warn: () => {},
        error: () => {},
        info: () => {},
      };

      const config: EmbeddedOptionsConfig = {
        version: '0.1.0',
        logger: silentLogger,
      };

      expect(() => {
        validateOptions(config);
      }).not.toThrow();
    });
  });

  describe('Logger Threading', () => {
    it('threads logger through prepareConfig', () => {
      const mockLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      prepareConfig({ version: '0.1.0', logger: mockLogger });

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('prioritizes user config logger over base config logger', () => {
      const baseLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const userLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      prepareConfig({ version: '0.1.0', logger: userLogger }, { logger: baseLogger });

      expect(userLogger.warn).toHaveBeenCalled();
      expect(baseLogger.warn).not.toHaveBeenCalled();
    });

    it('uses base config logger if user config has no logger', () => {
      const baseLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      prepareConfig({ version: '0.1.0' }, { logger: baseLogger });

      expect(baseLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Default Logger', () => {
    it('falls back to console when no logger provided', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        validateOptions({ version: '0.1.0' });
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
          '⚠️  Version 0.1.0 has major version 0.x.x - this indicates initial development phase. ' +
            'Per semver spec, the public API should not be considered stable.'
        );
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('uses console for build metadata warnings by default', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        validateOptions({ version: '1.0.0+build.123' });
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
          'ℹ️  Version 1.0.0+build.123 includes build metadata without pre-release tag. ' +
            'This is valid but uncommon - build metadata is typically used with pre-releases.'
        );
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('does not call console for stable versions', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        validateOptions({ version: '1.23.7' });
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles versions with pre-release and build metadata', () => {
      const mockLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      // Pre-release with build metadata should not trigger build-without-prerelease warning
      const config: EmbeddedOptionsConfig = { version: '1.0.0-rc.1+build.123' };
      validateOptions(config, mockLogger);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('handles 0.x.x versions with pre-release', () => {
      const mockLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const config: EmbeddedOptionsConfig = { version: '0.1.0-alpha' };
      validateOptions(config, mockLogger);

      // Should warn about 0.x.x but not about build metadata
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('0.x.x'));
    });

    it('handles 0.x.x versions with build metadata only', () => {
      const mockLogger: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      const config: EmbeddedOptionsConfig = { version: '0.1.0+build.123' };
      validateOptions(config, mockLogger);

      // Should warn about both 0.x.x and build metadata
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Backward Compatibility', () => {
    it('maintains backward compatibility when no logger is provided', () => {
      // Existing code should continue to work
      expect(() => {
        validateOptions({ version: '1.23.7' });
      }).not.toThrow();

      expect(() => {
        prepareConfig({ version: '1.23.7' });
      }).not.toThrow();
    });

    it('does not break when config object has no logger property', () => {
      const config: EmbeddedOptionsConfig = {
        host: '127.0.0.1',
        port: 8080,
        version: '1.23.7',
      };

      expect(() => {
        validateOptions(config);
      }).not.toThrow();
    });

    it('accepts logger without debug method (backward compatibility)', () => {
      // Logger without optional debug() method should work
      const loggerWithoutDebug: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      };

      expect(() => {
        validateOptions({ version: '1.23.7' }, loggerWithoutDebug);
      }).not.toThrow();
    });

    it('accepts logger with debug method', () => {
      // Logger with optional debug() method should also work
      const loggerWithDebug: Logger = {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      expect(() => {
        validateOptions({ version: '1.23.7' }, loggerWithDebug);
      }).not.toThrow();
    });
  });
});
