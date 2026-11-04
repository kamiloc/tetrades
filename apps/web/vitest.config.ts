import { defineConfig } from 'vitest/config';

// Unit tests run in Node by default (route handlers, middleware, lib/).
// Component tests opt into the DOM with `// @vitest-environment jsdom`.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
