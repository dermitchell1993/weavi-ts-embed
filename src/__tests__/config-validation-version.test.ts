/**
 * Version Validation Tests
 *
 * Tests validateOptions() version field for:
 * - Security (path traversal protection - PRI-857)
 * - Semver compliance (pre-release, build metadata - PRI-858)
 * - Backward compatibility (0.x.x versions)
 * - Invalid formats
 */

import { describe, it } from 'vitest';
import type { EmbeddedOptionsConfig } from '../embedded';
import {
  expectValidConfig,
  expectInvalidConfig,
  validVersions,
  invalidVersions,
  testValidVersions,
  testInvalidVersions,
} from './config-test-helpers';

describe('validateOptions - Version Validation', () => {
  describe('basic version validation', () => {
    it('rejects non-string version', () => {
      expectInvalidConfig({ version: 123 } as unknown as EmbeddedOptionsConfig, 'Version must be a string');
    });

    it('accepts standard semantic versions', () => {
      testValidVersions(validVersions.standard);
    });

    it('accepts "latest" keyword', () => {
      testValidVersions(validVersions.special);
    });

    it('rejects invalid version formats', () => {
      testInvalidVersions(invalidVersions.format, 'semantic versioning format');
    });
  });

  describe('security - path traversal protection (PRI-857)', () => {
    it('rejects path traversal with ../', () => {
      testInvalidVersions(invalidVersions.pathTraversal, /path traversal attempt detected/);
    });

    it('rejects URL-encoded path traversal', () => {
      testInvalidVersions(invalidVersions.urlEncoded, /path traversal attempt detected/);
    });

    it('rejects versions with slashes', () => {
      testInvalidVersions(invalidVersions.slashes, /invalid characters/);
    });

    it('provides clear error message for path traversal', () => {
      expectInvalidConfig(
        { version: '../test' },
        'Version contains invalid characters (path traversal attempt detected)'
      );
    });
  });

  describe('backward compatibility', () => {
    it('accepts 0.x.x versions (early development)', () => {
      expectValidConfig({ version: '0.1.0' });
      expectValidConfig({ version: '0.23.7' });
      expectValidConfig({ version: '0.0.1' });
    });

    it('accepts 1.x.x and higher versions', () => {
      expectValidConfig({ version: '1.0.0' });
      expectValidConfig({ version: '1.23.7' });
      expectValidConfig({ version: '23.45.67' });
    });

    it('accepts versions with leading zeros in minor/patch', () => {
      expectValidConfig({ version: '1.01.0' });
      expectValidConfig({ version: '1.0.01' });
      expectValidConfig({ version: '10.001.2' });
    });
  });

  describe('pre-release tags (PRI-858)', () => {
    it('accepts alpha pre-releases', () => {
      expectValidConfig({ version: '1.0.0-alpha' });
      expectValidConfig({ version: '1.0.0-alpha.1' });
      expectValidConfig({ version: '2.3.4-alpha.beta' });
    });

    it('accepts beta pre-releases', () => {
      expectValidConfig({ version: '1.0.0-beta' });
      expectValidConfig({ version: '1.0.0-beta.2' });
      expectValidConfig({ version: '1.0.0-beta.11.ee' });
    });

    it('accepts release candidate pre-releases', () => {
      expectValidConfig({ version: '1.0.0-rc.1' });
      expectValidConfig({ version: '1.23.7-rc.2' });
      expectValidConfig({ version: '2.0.0-rc.final' });
    });

    it('accepts numeric pre-release identifiers', () => {
      expectValidConfig({ version: '1.0.0-0.3.7' });
      expectValidConfig({ version: '1.0.0-x.7.z.92' });
    });

    it('accepts pre-release identifiers with hyphens', () => {
      expectValidConfig({ version: '1.0.0-alpha-test' });
      expectValidConfig({ version: '1.0.0-rc-1-beta-2' });
    });

    it('accepts 0.x.x pre-release versions', () => {
      expectValidConfig({ version: '0.1.0-alpha' });
      expectValidConfig({ version: '0.23.7-rc.1' });
    });
  });

  describe('build metadata (PRI-858)', () => {
    it('accepts build numbers', () => {
      expectValidConfig({ version: '1.0.0+build.1' });
      expectValidConfig({ version: '1.0.0+build.123' });
      expectValidConfig({ version: '1.23.7+456' });
    });

    it('accepts timestamp build metadata', () => {
      expectValidConfig({ version: '1.0.0+20130313144700' });
      expectValidConfig({ version: '1.0.0+20230615' });
    });

    it('accepts mixed build metadata', () => {
      expectValidConfig({ version: '1.0.0+exp.sha.5114f85' });
      expectValidConfig({ version: '1.0.0+build.v3.2.1' });
    });

    it('accepts 0.x.x with build metadata', () => {
      expectValidConfig({ version: '0.1.0+build.1' });
      expectValidConfig({ version: '0.23.7+20230615' });
    });
  });

  describe('combined pre-release and build metadata (PRI-858)', () => {
    it('accepts pre-release with build metadata', () => {
      testValidVersions(validVersions.combined);
    });

    it('accepts 0.x.x with pre-release and build', () => {
      expectValidConfig({ version: '0.1.0-alpha+build.1' });
      expectValidConfig({ version: '0.23.7-rc.1+20230615' });
    });
  });

  describe('edge cases and warnings', () => {
    it('accepts versions with long pre-release identifiers', () => {
      expectValidConfig({ version: '1.0.0-very-long-pre-release-identifier-name' });
    });

    it('accepts versions with multiple dots in pre-release', () => {
      expectValidConfig({ version: '1.0.0-alpha.beta.gamma.delta' });
    });

    it('accepts versions with long build metadata', () => {
      expectValidConfig({ version: '1.0.0+build.with.many.segments.12345' });
    });
  });
});
