import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Vitest configuration.
//
// Source epic: Epic 1.3 — RFC 7807 Error Model.
// Source ticket: TKT-1.3.2.5 — extend test.include to discover RFC 7807
//   fixtures and specs in src/.
//
// The default include pattern (tests/unit/**/*.test.ts) covers the
// pre-existing tests but does NOT pick up:
//   - src/lib/api/core/__fixtures__/**/*.json — RFC 7807 JSON fixtures
//     consumed by ApiError.spec.ts.
//   - src/**/*.spec.ts — feature-local specs that Epic 1.3 onward
//     will introduce (the previous convention was *.test.ts in
//     tests/unit/, but *.spec.ts colocated with the source is the
//     newer pattern chosen by Epic 1.3).
//
// The new glob (src/**/*.spec.ts) covers both the Epic 1.3 specs and
// any future feature-local specs. The pre-existing tests/unit/**/*.test.ts
// glob is kept untouched for backward compatibility with the 2 tests
// that already live there.
//
// Fixture files (__fixtures__/**/*.json) are not test files themselves
// and are imported by the spec files. Vitest will only execute them if
// their extension matches test.include; we keep the JSON fixtures out
// of test.include and import them explicitly from the spec file with
// `import fixture from './__fixtures__/404-not-found.json'` (vitest
// treats them as static data, not test entries).

export default defineConfig({
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'src/**/*.spec.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})