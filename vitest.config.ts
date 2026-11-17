import { defineConfig } from 'vitest/config';

// Tests use esbuild's automatic JSX transform (tsconfig "jsx": "react-jsx"), so no React plugin is needed.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
