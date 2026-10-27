import { defineConfig } from 'vitest/config';

// Unit tests only; Playwright owns /tests.
export default defineConfig({
  test: { include: ['compare/**/*.test.ts', 'data/**/*.test.ts'] },
});
