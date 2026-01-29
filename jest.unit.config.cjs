module.exports = {
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'], // Only test files in src directory
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
  maxWorkers: '50%', // Use 50% of available CPU cores for faster parallel execution
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig-test.json',
        useEsm: true,
      },
    ],
  },
};
