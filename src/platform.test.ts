import { detectPlatform, getBinaryFilename, Platform } from './platform';

describe('Platform Detection', () => {
  let originalPlatform: string;
  let originalArch: string;

  beforeEach(() => {
    originalPlatform = process.platform;
    originalArch = process.arch;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    });
    Object.defineProperty(process, 'arch', {
      value: originalArch,
      writable: true,
    });
  });

  describe('detectPlatform', () => {
    it('should detect macOS arm64', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      Object.defineProperty(process, 'arch', { value: 'arm64', writable: true });

      const platform = detectPlatform();
      expect(platform).toEqual({ os: 'darwin', arch: 'arm64' });
    });

    it('should detect macOS x64', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      Object.defineProperty(process, 'arch', { value: 'x64', writable: true });

      const platform = detectPlatform();
      expect(platform).toEqual({ os: 'darwin', arch: 'x64' });
    });

    it('should detect Linux arm64', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      Object.defineProperty(process, 'arch', { value: 'arm64', writable: true });

      const platform = detectPlatform();
      expect(platform).toEqual({ os: 'linux', arch: 'arm64' });
    });

    it('should detect Linux x64', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      Object.defineProperty(process, 'arch', { value: 'x64', writable: true });

      const platform = detectPlatform();
      expect(platform).toEqual({ os: 'linux', arch: 'x64' });
    });

    it('should throw clear error on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true });
      Object.defineProperty(process, 'arch', { value: 'x64', writable: true });

      expect(() => detectPlatform()).toThrow('Weaviate Embedded is not supported on Windows');
    });

    it('should throw clear error on unsupported OS', () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd', writable: true });
      Object.defineProperty(process, 'arch', { value: 'x64', writable: true });

      expect(() => detectPlatform()).toThrow('Unsupported OS: freebsd');
    });

    it('should throw clear error on unsupported architecture', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      Object.defineProperty(process, 'arch', { value: 'ia32', writable: true });

      expect(() => detectPlatform()).toThrow('Unsupported architecture: ia32');
    });

    it('should throw error for both unsupported OS and arch (OS checked first)', () => {
      Object.defineProperty(process, 'platform', { value: 'aix', writable: true });
      Object.defineProperty(process, 'arch', { value: 's390x', writable: true });

      expect(() => detectPlatform()).toThrow('Unsupported OS: aix');
    });
  });

  describe('getBinaryFilename', () => {
    it('should return correct filename for macOS arm64', () => {
      const platform: Platform = { os: 'darwin', arch: 'arm64' };
      const filename = getBinaryFilename('1.23.0', platform);
      expect(filename).toBe('weaviate-1.23.0-darwin-arm64');
    });

    it('should return correct filename for macOS x64', () => {
      const platform: Platform = { os: 'darwin', arch: 'x64' };
      const filename = getBinaryFilename('1.23.0', platform);
      expect(filename).toBe('weaviate-1.23.0-darwin-x64');
    });

    it('should return correct filename for Linux arm64', () => {
      const platform: Platform = { os: 'linux', arch: 'arm64' };
      const filename = getBinaryFilename('1.23.0', platform);
      expect(filename).toBe('weaviate-1.23.0-linux-arm64');
    });

    it('should return correct filename for Linux x64', () => {
      const platform: Platform = { os: 'linux', arch: 'x64' };
      const filename = getBinaryFilename('1.23.0', platform);
      expect(filename).toBe('weaviate-1.23.0-linux-x64');
    });

    it('should handle different version formats', () => {
      const platform: Platform = { os: 'linux', arch: 'x64' };

      expect(getBinaryFilename('1.0.0', platform)).toBe('weaviate-1.0.0-linux-x64');
      expect(getBinaryFilename('2.0.0-beta', platform)).toBe('weaviate-2.0.0-beta-linux-x64');
      expect(getBinaryFilename('latest', platform)).toBe('weaviate-latest-linux-x64');
    });
  });
});
