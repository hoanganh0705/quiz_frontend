import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Vitest configuration.
//
// Source epic: Epic 1.3 — RFC 7807 Error Model.
// Source ticket: TKT-1.3.2.5 — extend test.include to discover RFC 7807
//   fixtures and specs in src/.
//
// Source story: Story 3.1 (Design-system primitives) — DOM test env.
// Source ticket: TKT-3.1.B3 / TKT-3.1.C5 — Story 3.1 specs under
//   src/components/primitives/**/__tests__/*.spec.tsx require a DOM
//   environment (jsdom) and @testing-library/jest-dom matchers.
//
// We achieve this with `test.projects`, which lets us mix an env:
//   - node (default) for everything under tests/unit and src/** except
//     src/components/primitives/**, preserving the prior behaviour.
//   - jsdom for src/components/primitives/** with a setupFiles entry
//     that imports @testing-library/jest-dom.

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: [
            'tests/unit/**/*.test.ts',
            'src/**/*.spec.ts',
          ],
          exclude: [
            'src/components/primitives/**/*.spec.tsx',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          include: ['src/components/primitives/**/*.spec.tsx'],
          environment: 'jsdom',
          setupFiles: ['./src/components/primitives/__tests__/setup.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})