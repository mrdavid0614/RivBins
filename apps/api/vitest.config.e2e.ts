import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Every file shares the seeded database: run them one at a time.
    fileParallelism: false,
  },
});
