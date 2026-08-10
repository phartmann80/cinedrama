import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    env: {
      SESSION_SECRET: 'test-secret-for-ci',
      // DATABASE_URL not required for gateway token tests (no DB queries for invalid tokens)
    },
  },
});
