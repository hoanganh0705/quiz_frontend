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
          include: [
            'src/components/primitives/**/*.spec.tsx',
            // F1 — page-level composition tests for the detail pages.
            // These render React components (CategoryDetailPage /
            // TagDetailPage) and need a DOM environment. The ticket
            // TKT-3.9.F1 specifies the location as
            // `src/features/{categories,tags}/components/__tests__/`
            // so the test files are co-located with the unit under
            // test. The `setup.ts` (jest-dom matchers + ResizeObserver
            // + cleanup) is the same one the Story 3.1 primitives
            // already use.
            'src/features/categories/components/__tests__/**/*.spec.tsx',
            'src/features/tags/components/__tests__/**/*.spec.tsx',
            // TKT-3.11.B1 — `useLeaderboard` hook uses SWR and
            // renders the test probe via `@testing-library/react`,
            // so it needs the DOM environment. Co-located with the
            // hook under test.
            'src/features/leaderboard/hooks/__tests__/**/*.spec.tsx',
            // TKT-3.11.B2 — `LeaderboardPeriodSelector` is a presentational
            // component rendered with `@testing-library/react`. Co-located
            // with the component under test.
            'src/features/leaderboard/components/__tests__/**/*.spec.tsx',
            // TKT-3.12.B1 — `useDailyChallengeToday` uses
            // `useSingleWithRetry` and `useDailyChallengeHistory` uses
            // `useCursorPaginated` (SWR). Both need a DOM environment.
            // Co-located with the hooks under test.
            'src/features/daily-challenge/hooks/__tests__/**/*.spec.tsx',
            // TKT-3.12.B2 — `useDailyChallengeStreakView` reads from
            // the Zustand user store and the `DailyChallengeStreakIndicator`
            // is a presentational component. Both need a DOM environment.
            // Co-located with the hook / component under test.
            'src/features/daily-challenge/components/__tests__/**/*.spec.tsx',
            // TKT-3.12.E1 — page-boundary integration test for the
            // `/daily-challenge` route. The spec imports the
            // `app/(public)/daily-challenge/page.tsx` default export
            // and asserts the `getFeatureFlagValue('dailyChallengePage')`
            // read is forwarded to the composition. Needs a DOM
            // environment because the page renders
            // `<DailyChallengeMainContent />` which is a React tree.
            'src/app/(public)/daily-challenge/page.spec.tsx',
          ],
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