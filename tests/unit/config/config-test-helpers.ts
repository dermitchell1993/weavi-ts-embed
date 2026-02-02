/**
 * Shared Test Utilities for Config Tests
 *
 * Reusable test helpers, fixtures, and assertion utilities
 * to maximize code reuse across modularized test files.
 */

import { expect } from 'vitest';
import { ConfigValidationError, validateOptions } from '../../../src/config';
import type { EmbeddedOptionsConfig } from '../../../src/embedded';

/**
 * Test data fixtures
 */
export const validVersions = {
  standard: ['0.1.0', '0.2.3', '1.0.0', '1.23.7', '10.20.30'],
  preRelease: ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-beta.2', '1.0.0-rc.1', '2.0.0-rc.final'],
  buildMetadata: ['1.0.0+build.1', '1.0.0+20130313144700', '1.0.0+exp.sha.5114f85'],
  combined: ['1.0.0-alpha+build.1', '1.0.0-rc.1+20230615', '2.0.0-beta.11+exp.sha'],
  special: ['latest'],
};

export const invalidVersions = {
  format: ['1.2', '1', 'v1.2.3', '1.2.3.4'],
  pathTraversal: ['../../../etc/passwd', '1.0.0/../tmp', '..\\windows\\system32'],
  urlEncoded: ['%2E%2E%2F%2E%2E%2Fetc%2Fpasswd', '1.0.0%5C..%5C..%5Ctmp'],
  slashes: ['1.0.0/test', 'version\\test'],
};

export const validHosts = {
  ipv4: ['127.0.0.1', '192.168.1.1', '10.0.0.1'],
  ipv6: ['::1', '::', 'fe80::1', '2001:db8::1', '::ffff:192.0.2.1'],
  hostnames: ['localhost', 'weaviate.example.com', 'db-server', 'test.local'],
};

export const invalidHosts = {
  type: [12345, null, undefined, true] as unknown[],
  empty: ['', '   '],
  format: ['invalid host!', 'host with spaces', 'host@#$%'],
  ipv4: ['256.1.1.1', '192.168.1', '999.999.999.999'],
};

export const validPorts = [1, 80, 443, 8080, 65535];
export const invalidPorts = {
  type: ['8080', null, undefined] as unknown[],
  nonInteger: [8080.5, 3000.1],
  outOfRange: [0, -1, 70000, 99999],
};

/**
 * Assertion helpers
 */
export function expectValidConfig(config: EmbeddedOptionsConfig): void {
  expect(() => validateOptions(config)).not.toThrow();
}

export function expectInvalidConfig(
  config: EmbeddedOptionsConfig | unknown,
  expectedError?: string | RegExp
): void {
  expect(() => validateOptions(config as EmbeddedOptionsConfig)).toThrow(ConfigValidationError);
  if (expectedError) {
    expect(() => validateOptions(config as EmbeddedOptionsConfig)).toThrow(expectedError);
  }
}

export function expectConfigErrorField(config: EmbeddedOptionsConfig, expectedField: string): void {
  try {
    validateOptions(config);
    expect.fail('Should have thrown ConfigValidationError');
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect((error as ConfigValidationError).field).toBe(expectedField);
  }
}

/**
 * Test case generators for reducing duplication
 */
export function testValidVersions(versions: string[], description = 'valid versions'): void {
  versions.forEach((version) => {
    expectValidConfig({ version });
  });
}

export function testInvalidVersions(versions: string[], errorPattern?: string | RegExp): void {
  versions.forEach((version) => {
    expectInvalidConfig({ version }, errorPattern);
  });
}

export function testValidHosts(hosts: string[]): void {
  hosts.forEach((host) => {
    expectValidConfig({ host });
  });
}

export function testInvalidHosts(hosts: unknown[], errorPattern?: string | RegExp): void {
  hosts.forEach((host) => {
    // Skip null/undefined as they shouldn't be passed at all (optional field)
    if (host !== null && host !== undefined) {
      expectInvalidConfig({ host } as EmbeddedOptionsConfig, errorPattern);
    }
  });
}

export function testValidPorts(ports: number[]): void {
  ports.forEach((port) => {
    expectValidConfig({ port });
  });
}

export function testInvalidPorts(ports: unknown[], errorPattern?: string | RegExp): void {
  ports.forEach((port) => {
    // Skip null/undefined as they shouldn't be passed at all (optional field)
    if (port !== null && port !== undefined) {
      expectInvalidConfig({ port } as EmbeddedOptionsConfig, errorPattern);
    }
  });
}
