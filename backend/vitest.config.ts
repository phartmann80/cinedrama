import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-secret-for-ci',
      SESSION_SECRET: 'test-secret-for-ci',
    },
  },
});
