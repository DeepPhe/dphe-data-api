module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/helpers/test-env.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/docs/**', '!src/types/**'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
  testTimeout: 10000,
};
