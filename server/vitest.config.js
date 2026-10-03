import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
