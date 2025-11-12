import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  // Keep to JS tests to avoid transformers
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'jsx'],
  transform: {},
  setupFilesAfterEnv: [],
};

export default config;
