import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/types/**'],
    environment: 'node',
    globals: true,
    reporters: ['default']
  }
});
