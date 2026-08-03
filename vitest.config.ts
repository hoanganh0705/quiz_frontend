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
          // TKT-4.1.E3 — `useOptimisticMutation` hook spec exercises
          // SWR + `BroadcastChannel`, which need a DOM environment.
          // The spec is discovered in the jsdom project below; this
          // exclusion prevents the node project from also picking it
          // up (which would crash on `document` / `BroadcastChannel`
          // being undefined).
          'src/lib/api/__tests__/useOptimisticMutation.spec.ts',
          // TKT-4.2.A2 — `useQuizForm` spec uses `@testing-library/react`'s
          // `renderHook`, which requires a DOM environment. The hook
          // does not need jsdom itself, but the test driver does.
          // Discovered in the jsdom project below.
          'src/lib/forms/__tests__/useQuizForm.spec.ts',
          // TKT-4.2.C2 — `useDraftAutoSave` spec uses `renderHook` and
          // drives fake timers + setInterval + form.watch, all of which
          // settle through React's effects in jsdom.
          'src/lib/forms/__tests__/useDraftAutoSave.spec.ts',
          // TKT-4.2.C3 — `useUnsavedChangesGuard` spec uses
          // `renderHook` + window event dispatch.
          'src/lib/forms/__tests__/useUnsavedChangesGuard.spec.tsx',
          // TKT-4.2.E3 — integration smoke test.
          'src/lib/forms/__tests__/useQuizForm-integration.spec.tsx',
          // TKT-4.3.B — Epic 4.3 hook specs need jsdom; excluded from node.
          'src/features/users/hooks/__tests__/*.spec.tsx',
          // TKT-4.3.C / D — component specs need jsdom; excluded from node.
          'src/features/users/components/settings/__tests__/*.spec.tsx',
          'src/features/users/components/my-profile/__tests__/*.spec.tsx',
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
            // Co-located with the hook under test.
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
            // TKT-4.1.E3 — `useOptimisticMutation` hook consumes
            // SWR's global `mutate` and `BroadcastChannel`. The spec
            // exercises the hook via `@testing-library/react`'s
            // `renderHook` and asserts the snapshot/revert/cooldown/
            // typed-confirm/cross-tab broadcast contract end-to-end.
            // jsdom is required because `BroadcastChannel` is
            // a browser-only API.
            'src/lib/api/__tests__/useOptimisticMutation.spec.ts',
            // TKT-4.1.H1 — cross-feature integration smoke check.
            // Renders React components (ConfirmDialog) and uses
            // BroadcastChannel via useOptimisticMutation, so the
            // jsdom environment is required.
            'src/features/shared/__tests__/phase4-4-1.integration.spec.tsx',
            // TKT-4.2.A2 — `useQuizForm` primitive spec uses
            // `@testing-library/react`'s `renderHook`, which requires
            // a DOM environment. The hook does not need jsdom
            // itself, but the test driver does.
            'src/lib/forms/__tests__/useQuizForm.spec.ts',
            // TKT-4.2.C2 — `useDraftAutoSave` spec uses `renderHook`
            // and drives fake timers + setInterval + form.watch, all
            // of which settle through React's effects in jsdom.
            'src/lib/forms/__tests__/useDraftAutoSave.spec.ts',
            // TKT-4.2.C3 — `useUnsavedChangesGuard` spec mocks
            // `next/navigation` and drives `beforeunload` / `popstate`
            // events; needs jsdom for `window` event dispatch.
            'src/lib/forms/__tests__/useUnsavedChangesGuard.spec.tsx',
            // TKT-4.2.E3 — integration smoke test exercising the
            // primitive + atoms + banners + auto-save end-to-end. Renders
            // a React tree with `ToastProvider`, `useDraftAutoSave` fake
            // timers, and the full atom ecosystem; jsdom required.
            'src/lib/forms/__tests__/useQuizForm-integration.spec.tsx',
          // TKT-4.3.B — Epic 4.3 hook specs. All use `useOptimisticMutation`
          // and `BroadcastChannel`; needs jsdom.
          'src/features/users/hooks/__tests__/*.spec.tsx',
          // TKT-4.3.C / D — settings section + my-profile component specs.
          // Render React components and use hooks that need jsdom.
          'src/features/users/components/settings/__tests__/*.spec.tsx',
          'src/features/users/components/my-profile/__tests__/*.spec.tsx',
          // TKT-4.4.E3–E7 — Epic 4.4 hook specs. Use SWR hooks that need
          // jsdom; co-located with the hooks under test.
          'src/features/quizzes/hooks/__tests__/*.spec.tsx',
          // TKT-4.4.E7 — MyQuizzesTableRow RTL component spec. Needs jsdom.
          'src/features/quizzes/components/__tests__/MyQuizzesTableRow.spec.tsx',
          // TKT-4.4.F1 — MyQuizzesDashboardPage integration spec. Needs jsdom.
          'src/features/quizzes/components/__tests__/MyQuizzesDashboardPage.integration.spec.tsx',
          // TKT-4.4.F2 — MyQuizzes dashboard a11y spec. Uses axe-core in jsdom.
          'src/features/quizzes/components/__tests__/my-quizzes.a11y.spec.tsx',
          // T-4.11.9 — PublishCta + PublishConfirmDialog integration tests. Needs jsdom.
          'src/features/quizzes/components/__tests__/PublishCta.spec.tsx',
          // (T-4.11.14 EditPublishedQuizCTA tests run in node env to avoid jsdom issues.)
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
