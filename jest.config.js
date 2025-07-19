module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    '*.js',
    '!node_modules/**',
    '!jest.config.js'
  ],
  testMatch: [
    '**/tests/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  verbose: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};