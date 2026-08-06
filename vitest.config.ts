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
          // TKT-7.1.C1 — AdminRoleGuard boundary component spec;
          // uses @testing-library/react.
          'src/features/admin/components/__tests__/AdminRoleGuard.spec.tsx',
          // TKT-7.1.C2 — PermissionDeniedNotice component spec;
          // uses @testing-library/react.
          'src/features/admin/components/__tests__/PermissionDeniedNotice.spec.tsx',
          // TKT-7.1.C3 — AuditActionShell primitive spec; uses
          // @testing-library/react + render-prop pattern.
          'src/features/admin/components/__tests__/AuditActionShell.spec.tsx',
          // TKT-7.1.C4 — RequestIdBanner component spec; uses
          // @testing-library/react.
          'src/features/admin/components/__tests__/RequestIdBanner.spec.tsx',
          // TKT-7.1.C5 — TypedConfirmDialog primitive spec; uses
          // @testing-library/react.
          'src/features/admin/components/__tests__/TypedConfirmDialog.spec.tsx',
          // TKT-7.1.C6 — AdminActionPending loading layer spec; uses
          // @testing-library/react.
          'src/features/admin/components/__tests__/AdminActionPending.spec.tsx',
          // TKT-7.1.C7 — AdminBreadcrumb component spec; uses
          // @testing-library/react + next/navigation mock.
          'src/features/admin/components/__tests__/AdminBreadcrumb.spec.tsx',
          // TKT-7.1.D1 — useSelfActionGate hook spec; uses renderHook.
          'src/features/admin/hooks/__tests__/useSelfActionGate.spec.tsx',
          // TKT-7.1.D2 — useAdminRequestId hook spec; uses renderHook.
          'src/features/admin/hooks/__tests__/useAdminRequestId.spec.tsx',
          // TKT-7.1.D3 — useAdminIdentity fallback hook spec; uses
          // renderHook + fetch mock.
          'src/features/admin/hooks/__tests__/useAdminIdentity.spec.tsx',
          // TKT-7.1.B2 — usePermission selector hook spec; uses
          // renderHook + a mocked `useAdminRole`.
          'src/features/admin/hooks/__tests__/usePermission.spec.tsx',
          // TKT-7.1.B5 — useAdminFeatureFlag hook spec; uses renderHook
          // + a mocked feature-flags reader.
          'src/features/admin/hooks/__tests__/useAdminFeatureFlag.spec.tsx',
          // TKT-7.1.E9 — audit-shell-integration spec. Renders
          // AuditActionShell via @testing-library/react with a render
          // prop and walks the source tree via `node:fs`. Needs jsdom.
          'src/features/admin/services/__tests__/audit-shell-integration.spec.tsx',
          // TKT-4.3.B — Epic 4.3 hook specs need jsdom; excluded from node.
          'src/features/users/hooks/__tests__/*.spec.tsx',
          // TKT-4.3.C / D — component specs need jsdom; excluded from node.
          'src/features/users/components/settings/__tests__/*.spec.tsx',
          'src/features/users/components/my-profile/__tests__/*.spec.tsx',
          // T-4.15.24 — URL-sync hook integration spec uses renderHook +
          // vi.mock; excluded from node, discovered in jsdom project below.
          'src/features/attempts/hooks/__tests__/useAttemptHistoryFilters.integration.spec.tsx',
          // TKT-5.1.B2 — `connection-registry` spec requires jsdom.
          'src/lib/realtime/__tests__/connection-registry.spec.ts',
          // TKT-5.1.E1–E3 — hook specs require jsdom (renderHook).
          'src/lib/realtime/__tests__/useSocket.spec.tsx',
          'src/lib/realtime/__tests__/useRealtimeEvent.spec.tsx',
          'src/lib/realtime/__tests__/useRealtimeQuery.spec.tsx',
          // TKT-5.1.H1 — integration spec uses renderHook; jsdom required.
          'src/features/shared/__tests__/phase5-5-1.integration.spec.tsx',
          // TKT-5.7.G1 — instance hook specs require jsdom (renderHook).
          'src/features/instances/hooks/__tests__/useInstance.spec.tsx',
          'src/features/instances/hooks/__tests__/useInstancePlayers.spec.tsx',
          'src/features/instances/hooks/__tests__/useInstancePermissions.spec.tsx',
          'src/features/instances/hooks/__tests__/useJoinInstance.spec.tsx',
          'src/features/instances/hooks/__tests__/useLeaveInstance.spec.tsx',
          'src/features/instances/hooks/__tests__/useStartInstance.spec.tsx',
          'src/features/instances/hooks/__tests__/useCloseInstance.spec.tsx',
          'src/features/instances/hooks/__tests__/useInstancesFeatureFlag.spec.tsx',
          // TKT-5.7.G2 — instance socket and store specs require jsdom.
          'src/features/instances/hooks/__tests__/useInstanceSocket.spec.tsx',
          'src/features/instances/hooks/__tests__/useInstanceRealtimeBridge.spec.tsx',
          'src/features/instances/stores/__tests__/instanceRealtime.store.spec.ts',
          // TKT-5.4.G1 — notification hook specs require jsdom (renderHook).
          'src/features/notifications/hooks/__tests__/useNotifications.spec.tsx',
          'src/features/notifications/hooks/__tests__/useUnreadNotificationCount.spec.tsx',
          'src/features/notifications/hooks/__tests__/useNotificationSocket.spec.tsx',
          'src/features/notifications/hooks/__tests__/useMarkNotificationRead.spec.tsx',
          'src/features/notifications/hooks/__tests__/useMarkNotificationUnread.spec.tsx',
          'src/features/notifications/hooks/__tests__/useDeleteNotification.spec.tsx',
          'src/features/notifications/hooks/__tests__/useNotificationPreferences.spec.tsx',
          'src/features/notifications/hooks/__tests__/useNotificationFeatureFlag.spec.tsx',
          // TKT-5.5.G1 — ranking/achievement hook specs require jsdom (renderHook).
          'src/features/rankings/hooks/__tests__/useEventuallyConsistentQuery.spec.tsx',
          'src/features/rankings/hooks/__tests__/useMyRanking.spec.tsx',
          'src/features/rankings/hooks/__tests__/useRankingLeaderboard.spec.tsx',
          'src/features/rankings/hooks/__tests__/useRankingHistory.spec.tsx',
          'src/features/rankings/hooks/__tests__/useRankingMilestones.spec.tsx',
          'src/features/rankings/hooks/__tests__/useUserRanking.spec.tsx',
          'src/features/achievements/hooks/__tests__/useBadges.spec.tsx',
          'src/features/achievements/hooks/__tests__/useBadge.spec.tsx',
          'src/features/achievements/hooks/__tests__/useMyBadges.spec.tsx',
          'src/features/achievements/hooks/__tests__/useUserBadges.spec.tsx',
          'src/features/achievements/hooks/__tests__/useAchievementHistory.spec.tsx',
          'src/features/achievements/hooks/__tests__/useAchievementFocusRevalidation.spec.tsx',
          'src/features/achievements/hooks/__tests__/useAchievementNotificationRevalidation.spec.tsx',
          // TKT-5.6.G1 — search hook specs require jsdom (renderHook).
          'src/features/search/hooks/__tests__/useDebouncedValue.spec.ts',
          'src/features/search/hooks/__tests__/useSearch.spec.tsx',
          'src/features/search/hooks/__tests__/useSearchHistory.spec.tsx',
          'src/features/search/hooks/__tests__/useSearchUrlState.spec.tsx',
          // TKT-5.6.G2 — search component and page specs require jsdom.
          'src/features/search/components/__tests__/SearchResults.spec.tsx',
          'src/features/search/components/__tests__/SearchResultGroup.spec.tsx',
          'src/features/search/components/__tests__/SearchInput.spec.tsx',
          'src/features/search/components/__tests__/GlobalSearch.spec.tsx',
          'src/features/search/components/cards/__tests__/SocialReadResultCard.spec.tsx',
          'src/app/(public)/search/__tests__/page.spec.tsx',
          // TKT-6.1.G1 — social hook specs (useRelationship,
          // useSocialPermissions, and the seven read hooks) require
          // jsdom (renderHook); excluded from node.
          'src/features/social/hooks/__tests__/*.spec.tsx',
          // TKT-6.2.B1 / B2 — the SocialListRouteGate component spec
          // uses @testing-library/react and is co-located under the
          // component. Excluded from node, discovered in jsdom below.
          'src/features/social/components/__tests__/*.spec.tsx',
          // TKT-6.2.E1 / E2 / E3 / F2 — the list-page component
          // specs (FollowersList, FollowingList, FriendsList,
          // BlockedUsersList) use @testing-library/react and are
          // co-located under the list page. Excluded from node,
          // discovered in jsdom below.
          'src/features/social/lists/__tests__/*.spec.tsx',
          // TKT-6.2.D3 — the social-list-loaded-channel spec (the
          // compatibility shim re-exported by the G1 module) is
          // co-located under `features/social/__tests__/` rather
          // than under a subdirectory. Excluded from node,
          // discovered in jsdom below.
          'src/features/social/__tests__/*.spec.tsx',
          'src/features/social/__tests__/*.spec.ts',
          // TKT-6.2.B1 / B2 — the route-scaffold specs render the App
          // Router route module; excluded from node, discovered in jsdom.
          'src/app/social/**/*.spec.tsx',
          // TKT-6.2.G1 — the social-list-loaded broadcast-channel spec
          // uses BroadcastChannel + sessionStorage; needs jsdom.
          'src/lib/social/__tests__/social-list-loaded-broadcast-channel.spec.ts',
          'src/lib/social/__tests__/social-list-loaded-broadcast-channel.spec.tsx',
          // TKT-6.2.H1 — the phase6_6_2_sentry spec uses jsdom for
          // the Sentry test transport.
          'src/lib/social/__tests__/phase6_6_2_sentry.spec.ts',
          'src/lib/social/__tests__/phase6_6_2_sentry.spec.tsx',
          // TKT-7.4.A3 — category admin route file spec uses
          // @testing-library/react; excluded from node, discovered in jsdom.
          'src/app/admin/__tests__/admin-categories-page.spec.tsx',
          // TKT-7.4.A3 — category admin categories-sub-route spec uses
          // @testing-library/react; excluded from node, discovered in jsdom.
          'src/app/admin/categories/__tests__/*.spec.tsx',
          // TKT-7.4.C1–C6 — category admin hook specs require jsdom (renderHook +
          // SWR + @testing-library/react); excluded from node.
          'src/features/admin/category-admin/hooks/__tests__/*.spec.tsx',
          // TKT-7.5.A3 — review reports route file spec uses
          // @testing-library/react; excluded from node, discovered in jsdom.
          'src/app/admin/reviews/reports/__tests__/*.spec.tsx',
          // TKT-7.5.B1–B3 — review moderation type/enum/validation specs
          // are pure-function specs but live under the admin folder so
          // they are excluded from node and discovered in jsdom for
          // a consistent test driver.
          'src/features/admin/review-moderation/__tests__/*.spec.ts',
          'src/features/admin/review-moderation/__tests__/*.spec.tsx',
          // TKT-7.5.C1 — useReviewReports hook spec uses renderHook +
          // mocked next/navigation + useCursorPaginated; needs jsdom.
          'src/features/admin/review-moderation/hooks/__tests__/*.spec.tsx',
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
            // TKT-5.1.H1 — cross-feature integration smoke check.
            // Exercises useSocket → connected, useRealtimeQuery invalidation,
            // WsError → authRequired, and all six Phase 5 service wrappers.
            // Uses renderHook + mocked Socket.IO; jsdom required.
            'src/features/shared/__tests__/phase5-5-1.integration.spec.tsx',
            // TKT-7.2.E2 — Epic 7.2 shell integration smoke check.
            // Renders AdminLayoutShell through mocked flag/role/nav/pathname
            // hooks and asserts flag × role × nav × breadcrumb composition
            // end-to-end. Needs jsdom for @testing-library/react.
            'src/features/shared/__tests__/phase7-7-2.integration.spec.tsx',
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
            // T-4.12.5 — useQuizComments read hook. Uses SWR via useCursorPaginated
            // and renderHook from @testing-library/react; needs jsdom.
            'src/features/comments/hooks/__tests__/useQuizComments.spec.tsx',
            // T-4.12.21 — CommentsWidget integration spec. Mocks all
            // comment hooks (useAuth, useQuizComments, useCreateComment,
            // useVoteComment, useReportComment, useCommentThreadLookup,
            // etc.) and renders the full widget tree. Needs jsdom because
            // the widget renders SWR + React subtrees.
            'src/features/comments/components/__tests__/CommentsWidget.integration.spec.tsx',
            // T-4.13.4 — useQuizReviews read hook. Uses
            // useCursorPaginated + renderHook; needs jsdom.
            'src/features/reviews/hooks/__tests__/useQuizReviews.spec.tsx',
            // T-4.13.5 — useMyQuizReview hook. Uses useSingleWithRetry
            // + renderHook; needs jsdom.
            'src/features/reviews/hooks/__tests__/useMyQuizReview.spec.tsx',
            // T-4.13.6 — useCompletedQuizAttempt hook. Uses
            // useSingleWithRetry + renderHook; needs jsdom.
            'src/features/reviews/hooks/__tests__/useCompletedQuizAttempt.spec.tsx',
            // T-4.13.7 — useReviewGate composition hook. Composites
            // useMyQuizReview + useCompletedQuizAttempt with auth
            // bootstrap state; needs jsdom for renderHook.
            'src/features/reviews/hooks/__tests__/useReviewGate.spec.tsx',
            // T-4.13.8 — useCreateReview mutation hook. Uses
            // useAuthBootstrap + SWR global mutate + renderHook;
            // needs jsdom.
            'src/features/reviews/hooks/__tests__/useCreateReview.spec.tsx',
            // T-4.13.9 — useEditReview mutation hook. Uses
            // useAuthBootstrap + SWR global mutate + renderHook;
            // needs jsdom.
            'src/features/reviews/hooks/__tests__/useEditReview.spec.tsx',
            // T-4.13.10 — useDeleteReview mutation hook. Uses
            // useAuthBootstrap + SWR global mutate + renderHook;
            // needs jsdom.
            'src/features/reviews/hooks/__tests__/useDeleteReview.spec.tsx',
            // T-4.13.11 — useHelpfulReview optimistic hook. Uses
            // SWR global mutate (cache updater) + renderHook;
            // needs jsdom.
            'src/features/reviews/hooks/__tests__/useHelpfulReview.spec.tsx',
            // T-4.13.12 — StarRatingInput RTL component spec. Uses
            // Radix RadioGroup + userEvent; needs jsdom.
            'src/features/reviews/components/__tests__/StarRatingInput.spec.tsx',
            // T-4.13.13 — ReviewGateState RTL component spec. Needs
            // jsdom for the rendered DOM assertions.
            'src/features/reviews/components/__tests__/ReviewGateState.spec.tsx',
            // T-4.13.14 — ReviewHelpfulButton RTL component spec.
            // Needs jsdom for the rendered DOM assertions.
            'src/features/reviews/components/__tests__/ReviewHelpfulButton.spec.tsx',
            // T-4.13.15 — ReviewForm RTL component spec. Renders
            // gate branches through mocked useReviewGate +
            // useCreateReview; needs jsdom.
            'src/features/reviews/components/__tests__/ReviewForm.spec.tsx',
            // T-4.13.16 — ReviewEditInline RTL component spec.
            // Renders the owner-only edit + typed-delete controls
            // through mocked useEditReview / useDeleteReview;
            // needs jsdom for the ConfirmDialog + Radix RadioGroup.
            'src/features/reviews/components/__tests__/ReviewEditInline.spec.tsx',
            // T-4.13.17 — ReviewItem RTL component spec. Renders
            // a single review row with rating / text / byline /
            // ownership branches; needs jsdom.
            'src/features/reviews/components/__tests__/ReviewItem.spec.tsx',
            // T-4.13.18 — ReviewsList RTL component spec.
            // Renders the public list with cursor pagination,
            // skeletons, empty state, and retry. Mocks
            // useQuizReviews; needs jsdom for the rendered DOM.
            'src/features/reviews/components/__tests__/ReviewsList.spec.tsx',
            // T-4.13.19 — ReviewsWidget RTL component spec.
            // Renders the section composition (heading + form +
            // list) under mocked auth bootstrap / my-review.
            // Needs jsdom for the rendered DOM.
            'src/features/reviews/components/__tests__/ReviewsWidget.spec.tsx',
            // T-4.13.21 — ReviewsWidget integration spec. Mocks all
            // review hooks (useAuthBootstrap, useMyQuizReview,
            // useReviewGate, useCreateReview, useEditReview,
            // useDeleteReview, useHelpfulReview, useQuizReviews) and
            // exercises the full Story 4.13 critical flow end-to-end:
            // public list, gate branches, create races, edit + typed
            // delete, helpful toggle, cache isolation. Needs jsdom
            // for the rendered DOM.
            'src/features/reviews/components/__tests__/ReviewsWidget.integration.spec.tsx',
            // T-4.13.21 — QuizDetailPage reviews integration spec.
            // Mounts the full QuizDetailPage under mocked hooks and
            // asserts the reviews section integrates cleanly with the
            // existing quiz layout (heading, canonical quiz id, error
            // isolation). Needs jsdom for the rendered DOM.
            'src/features/quizzes/components/__tests__/QuizDetailPage.reviews.spec.tsx',
            // T-4.14.5 / T-4.14.6 / T-4.14.8 — Story 4.14 read hooks.
            // All use `useSingleWithRetry` + `useAuthBootstrap` +
            // `renderHook`; jsdom required. Co-located with the
            // hooks under test. Also covers T-4.15.24 URL-sync hook
            // integration spec.
            'src/features/attempts/hooks/__tests__/*.spec.tsx',
            // T-4.14.13 / T-4.14.14 / T-4.14.15 / T-4.14.16 /
            // T-4.14.17 / T-4.14.20 / T-4.14.21 / T-4.14.22 /
            // T-4.14.23 — Story 4.14 atomic runner components,
            // composition, page container, and CTA components. All
            // render React subtrees via `@testing-library/react`
            // and need a DOM environment. Co-located with the
            // components under test.
            'src/features/attempts/components/__tests__/**/*.spec.tsx',
            // T-4.14.24 — QuizCtaStrip live-mode integration spec.
            // Mounts the live branch through mocked attempt hooks
            // and verifies the canonical Start / Continue / loading
            // / retry branches render exclusively.
            'src/features/quizzes/components/__tests__/QuizCtaStrip.live.spec.tsx',
            // TKT-5.1.B2 — `connection-registry` unit spec. Tests require a
            // browser-like environment (window, Map) — specifically, `isBrowser()`
            // must return true so the registry stores connections. The
            // `SocketLike` interface means no real socket.io-client import, so
            // the spec is safe in jsdom. SSR guard is tested implicitly via
            // the `isBrowser()` guard already exercised by the singleton tests.
            'src/lib/realtime/__tests__/connection-registry.spec.ts',
            // TKT-5.1.C1 — `events` unit spec. Pure TypeScript; no DOM required.
            'src/lib/realtime/__tests__/events.spec.ts',
            // TKT-5.1.C2 — `dto-adapters` unit spec. Pure TypeScript.
            'src/lib/realtime/__tests__/dto-adapters.spec.ts',
            // TKT-5.1.D1 — `ws-error` unit spec. Pure TypeScript.
            'src/lib/realtime/__tests__/ws-error.spec.ts',
            // TKT-5.1.D2 — `connection-state` unit spec. Pure TypeScript.
            'src/lib/realtime/__tests__/connection-state.spec.ts',
            // TKT-5.1.E1 — `useSocket` spec. Uses `renderHook` + `@testing-library/react`.
            'src/lib/realtime/__tests__/useSocket.spec.tsx',
            // TKT-5.1.E2 — `useRealtimeEvent` spec. Uses `renderHook`.
            'src/lib/realtime/__tests__/useRealtimeEvent.spec.tsx',
            // TKT-5.1.E3 — `useRealtimeQuery` spec. Uses `renderHook`.
            'src/lib/realtime/__tests__/useRealtimeQuery.spec.tsx',
            // TKT-5.4.G1 — notification hook specs require jsdom (renderHook).
            'src/features/notifications/hooks/__tests__/useNotifications.spec.tsx',
            'src/features/notifications/hooks/__tests__/useUnreadNotificationCount.spec.tsx',
            'src/features/notifications/hooks/__tests__/useNotificationSocket.spec.tsx',
            'src/features/notifications/hooks/__tests__/useMarkNotificationRead.spec.tsx',
            'src/features/notifications/hooks/__tests__/useMarkNotificationUnread.spec.tsx',
            'src/features/notifications/hooks/__tests__/useDeleteNotification.spec.tsx',
            'src/features/notifications/hooks/__tests__/useNotificationPreferences.spec.tsx',
            'src/features/notifications/hooks/__tests__/useNotificationFeatureFlag.spec.tsx',
            // TKT-5.4.G2 — notification component and page specs require jsdom.
            'src/features/notifications/components/__tests__/UnreadBadge.spec.tsx',
            'src/features/notifications/components/__tests__/NotificationItem.spec.tsx',
            'src/features/notifications/components/__tests__/NotificationBell.spec.tsx',
            'src/features/notifications/components/__tests__/NotificationPopover.spec.tsx',
            'src/features/notifications/components/__tests__/NotificationPreferencesForm.spec.tsx',
            'src/features/notifications/components/__tests__/NotificationCenterPage.integration.spec.tsx',
            'src/features/notifications/components/__tests__/NotificationPreferencesPage.integration.spec.tsx',
            // TKT-5.5.G1 — ranking/achievement hook specs require jsdom (renderHook).
            'src/features/rankings/hooks/__tests__/useEventuallyConsistentQuery.spec.tsx',
            'src/features/rankings/hooks/__tests__/useMyRanking.spec.tsx',
            'src/features/rankings/hooks/__tests__/useRankingLeaderboard.spec.tsx',
            'src/features/rankings/hooks/__tests__/useRankingHistory.spec.tsx',
            'src/features/rankings/hooks/__tests__/useRankingMilestones.spec.tsx',
            'src/features/rankings/hooks/__tests__/useUserRanking.spec.tsx',
            'src/features/achievements/hooks/__tests__/useBadges.spec.tsx',
            'src/features/achievements/hooks/__tests__/useBadge.spec.tsx',
            'src/features/achievements/hooks/__tests__/useMyBadges.spec.tsx',
            'src/features/achievements/hooks/__tests__/useUserBadges.spec.tsx',
            'src/features/achievements/hooks/__tests__/useAchievementHistory.spec.tsx',
            'src/features/achievements/hooks/__tests__/useAchievementFocusRevalidation.spec.tsx',
            'src/features/achievements/hooks/__tests__/useAchievementNotificationRevalidation.spec.tsx',
            // TKT-5.5.G2 — ranking/achievement component and page specs require jsdom.
            'src/features/rankings/components/__tests__/RankingSummaryCard.spec.tsx',
            'src/features/rankings/components/__tests__/LeaderboardTable.spec.tsx',
            'src/features/rankings/components/__tests__/RankingHistory.spec.tsx',
            'src/features/rankings/components/__tests__/MilestonesList.spec.tsx',
            'src/features/rankings/components/__tests__/RankingsPage.spec.tsx',
            'src/features/achievements/components/__tests__/BadgeGallery.spec.tsx',
            'src/features/achievements/components/__tests__/BadgeDetail.spec.tsx',
            'src/features/achievements/components/__tests__/EarnedBadgeList.spec.tsx',
            'src/features/achievements/components/__tests__/AchievementHistory.spec.tsx',
            'src/features/achievements/components/__tests__/AchievementsPage.spec.tsx',
            // TKT-5.7.G1 — instance hook specs require jsdom (renderHook).
            'src/features/instances/hooks/__tests__/useInstance.spec.tsx',
            'src/features/instances/hooks/__tests__/useInstancePlayers.spec.tsx',
            'src/features/instances/hooks/__tests__/useInstancePermissions.spec.tsx',
            'src/features/instances/hooks/__tests__/useJoinInstance.spec.tsx',
            'src/features/instances/hooks/__tests__/useLeaveInstance.spec.tsx',
            'src/features/instances/hooks/__tests__/useStartInstance.spec.tsx',
            'src/features/instances/hooks/__tests__/useCloseInstance.spec.tsx',
            'src/features/instances/hooks/__tests__/useInstancesFeatureFlag.spec.tsx',
            // TKT-5.7.G2 — instance socket and store specs require jsdom.
            'src/features/instances/hooks/__tests__/useInstanceSocket.spec.tsx',
            'src/features/instances/hooks/__tests__/useInstanceRealtimeBridge.spec.tsx',
            'src/features/instances/stores/__tests__/instanceRealtime.store.spec.ts',
            // TKT-5.7.G3 — instance component, page, and route specs require jsdom.
            'src/features/instances/components/__tests__/PlayerRoster.spec.tsx',
            'src/features/instances/components/__tests__/InstanceStatusBanner.spec.tsx',
            'src/features/instances/components/__tests__/JoinLeaveCta.spec.tsx',
            'src/features/instances/components/__tests__/HostControls.spec.tsx',
            'src/features/instances/components/__tests__/InstanceLobby.spec.tsx',
            'src/features/instances/components/__tests__/ConnectionBanner.spec.tsx',
            'src/features/instances/components/__tests__/shared/InstanceSkeleton.spec.tsx',
            'src/features/instances/components/__tests__/shared/InstanceClosedState.spec.tsx',
            'src/features/instances/pages/__tests__/InstanceRoomPage.integration.spec.tsx',
            'src/app/instances/[id]/__tests__/page.integration.spec.tsx',
            // TKT-5.6.G1 — search hook specs require jsdom (renderHook).
            'src/features/search/hooks/__tests__/useDebouncedValue.spec.ts',
            'src/features/search/hooks/__tests__/useSearch.spec.tsx',
            'src/features/search/hooks/__tests__/useSearchHistory.spec.tsx',
            'src/features/search/hooks/__tests__/useSearchUrlState.spec.tsx',
            // TKT-5.6.G2 — search component and page specs require jsdom.
            'src/features/search/components/__tests__/SearchResults.spec.tsx',
            'src/features/search/components/__tests__/SearchResultGroup.spec.tsx',
            'src/features/search/components/__tests__/SearchInput.spec.tsx',
            'src/features/search/components/__tests__/GlobalSearch.spec.tsx',
            'src/features/search/components/cards/__tests__/SocialReadResultCard.spec.tsx',
            'src/app/(public)/search/__tests__/page.spec.tsx',
          // TKT-6.1.G1 — social hook specs require jsdom (renderHook);
          // co-located with the hooks under test.
          'src/features/social/hooks/__tests__/*.spec.tsx',
          // TKT-6.2.B1 / B2 — the SocialListRouteGate component spec
          // uses @testing-library/react; co-located with the component
          // under test.
          'src/features/social/components/__tests__/*.spec.tsx',
          // TKT-6.2.E1 / E2 / E3 / F2 — the list-page component specs
          // (FollowersList, FollowingList, FriendsList,
          // BlockedUsersList) use @testing-library/react; co-located
          // with the pages under test.
          'src/features/social/lists/__tests__/*.spec.tsx',
          // TKT-6.2.D3 — the social-list-loaded-channel spec (the
          // compatibility shim re-exported by the G1 module) is
          // co-located under `features/social/__tests__/` rather
          // than under a subdirectory.
          'src/features/social/__tests__/*.spec.tsx',
          'src/features/social/__tests__/*.spec.ts',
          // TKT-6.2.B1 — the route-scaffold spec renders the App Router
          // route module via the next-router mock; co-located with the
          // route under test.
          'src/app/social/**/*.spec.tsx',
          // TKT-6.2.G1 — the social-list-loaded broadcast-channel spec
          // uses BroadcastChannel + sessionStorage; needs jsdom.
          'src/lib/social/__tests__/social-list-loaded-broadcast-channel.spec.ts',
          'src/lib/social/__tests__/social-list-loaded-broadcast-channel.spec.tsx',
          // TKT-6.2.H1 — the phase6_6_2_sentry spec uses jsdom for
          // the Sentry test transport.
          'src/lib/social/__tests__/phase6_6_2_sentry.spec.ts',
          'src/lib/social/__tests__/phase6_6_2_sentry.spec.tsx',
          // TKT-7.1.C1 — AdminRoleGuard boundary component spec;
          // uses @testing-library/react.
          'src/features/admin/components/__tests__/AdminRoleGuard.spec.tsx',
          // TKT-7.1.C2 — PermissionDeniedNotice component spec;
          // uses @testing-library/react.
          'src/features/admin/components/__tests__/PermissionDeniedNotice.spec.tsx',
          // TKT-7.1.C3 — AuditActionShell primitive spec; uses
          // @testing-library/react + render-prop pattern.
          'src/features/admin/components/__tests__/AuditActionShell.spec.tsx',
          // TKT-7.1.C4 — RequestIdBanner component spec; uses
          // @testing-library/react.
          'src/features/admin/components/__tests__/RequestIdBanner.spec.tsx',
          // TKT-7.1.C5 — TypedConfirmDialog primitive spec; uses
          // @testing-library/react.
          'src/features/admin/components/__tests__/TypedConfirmDialog.spec.tsx',
          // TKT-7.1.C6 — AdminActionPending loading layer spec; uses
          // @testing-library/react.
          'src/features/admin/components/__tests__/AdminActionPending.spec.tsx',
          // TKT-7.1.C7 — AdminBreadcrumb component spec; uses
          // @testing-library/react + next/navigation mock.
          'src/features/admin/components/__tests__/AdminBreadcrumb.spec.tsx',
          // TKT-7.1.D1 — useSelfActionGate hook spec; uses renderHook.
          'src/features/admin/hooks/__tests__/useSelfActionGate.spec.tsx',
          // TKT-7.1.D2 — useAdminRequestId hook spec; uses renderHook.
          'src/features/admin/hooks/__tests__/useAdminRequestId.spec.tsx',
          // TKT-7.1.D3 — useAdminIdentity fallback hook spec; uses
          // renderHook + fetch mock.
          'src/features/admin/hooks/__tests__/useAdminIdentity.spec.tsx',
          // TKT-7.1.B2 — usePermission selector hook spec; uses
          // renderHook + a mocked `useAdminRole`.
          'src/features/admin/hooks/__tests__/usePermission.spec.tsx',
          // TKT-7.1.B5 — useAdminFeatureFlag hook spec; uses renderHook
          // + a mocked feature-flags reader.
          'src/features/admin/hooks/__tests__/useAdminFeatureFlag.spec.tsx',
          // TKT-7.1.E9 — audit-shell-integration spec. Renders
          // AuditActionShell via @testing-library/react with a render
          // prop and walks the source tree via `node:fs`. Needs jsdom.
          'src/features/admin/services/__tests__/audit-shell-integration.spec.tsx',
          // TKT-7.2.A3 — AdminShellUnavailable component spec;
          // uses @testing-library/react + mocked feature-flag hook.
          'src/features/admin/components/__tests__/AdminShellUnavailable.spec.tsx',
          // TKT-7.2.B1 — AdminFeatureFlagBoundary spec;
          // uses @testing-library/react + mocked feature-flag hook.
          'src/features/admin/components/__tests__/AdminFeatureFlagBoundary.spec.tsx',
          // TKT-7.2.C2 — useAdminNav hook spec; uses plain unit-test style.
          'src/features/admin/hooks/__tests__/useAdminNav.spec.ts',
          // TKT-7.2.C2 — AdminNav component spec;
          // uses @testing-library/react + mocked useAdminNav and usePathname.
          'src/features/admin/components/__tests__/AdminNav.spec.tsx',
          // TKT-7.2.D2 — admin nested route integration spec;
          // uses @testing-library/react + mocked flag/role/pathname hooks.
          'src/app/admin/__tests__/admin-routes.integration.spec.tsx',
          // uses @testing-library/react + mocked flag and role hooks.
          'src/features/admin/components/__tests__/AdminLayoutShell.integration.spec.tsx',
          // TKT-7.3.A3 — tag admin route file spec; uses @testing-library/react.
          'src/app/admin/__tests__/admin-tags-page.spec.tsx',
          // TKT-7.3.F3 — tag admin tags-sub-route spec; uses @testing-library/react.
          'src/app/admin/tags/__tests__/*.spec.tsx',
          // TKT-7.3.H1 — tag admin e2e integration spec uses
          // @testing-library/react; excluded from node, discovered in jsdom.
          'src/features/admin/tag-admin/__tests__/*.spec.tsx',
          // TKT-7.3.C1–C6 — tag admin hook specs; use renderHook + jsdom.
          'src/features/admin/tag-admin/hooks/__tests__/*.spec.tsx',
          // TKT-7.3.D1–D3 — tag admin component specs; use @testing-library/react.
          'src/features/admin/tag-admin/components/__tests__/*.spec.tsx',
          // TKT-7.3.H1 — tag admin end-to-end integration spec;
          // composes the page through mocked hooks + services; uses
          // @testing-library/react + jsdom.
          'src/features/admin/tag-admin/__tests__/*.spec.tsx',
          // TKT-7.3.H2 — tag admin restore stable-codes regression spec;
          // uses @testing-library/react + jsdom for the dialog renders.
          'src/features/admin/tag-admin/__tests__/restore-stable-codes.spec.tsx',
          // TKT-7.4.A3 — category admin route file spec; uses @testing-library/react.
          'src/app/admin/__tests__/admin-categories-page.spec.tsx',
          // TKT-7.4.A3 — category admin categories-sub-route spec; uses @testing-library/react.
          'src/app/admin/categories/__tests__/*.spec.tsx',
          // TKT-7.4.C1–C6 — category admin hook specs require jsdom
          // (renderHook + SWR + @testing-library/react); discovered here.
          'src/features/admin/category-admin/hooks/__tests__/*.spec.tsx',
            // TKT-7.4.D1–D3 — category admin component specs require jsdom
            // (@testing-library/react); discovered here.
            'src/features/admin/category-admin/components/__tests__/*.spec.tsx',
            // TKT-7.5.A3 — review reports route file spec; uses
            // @testing-library/react.
            'src/app/admin/reviews/reports/__tests__/*.spec.tsx',
            // TKT-7.5.B1–B3 — review moderation type/enum/validation
            // specs; discovered here for a consistent test driver.
            'src/features/admin/review-moderation/__tests__/*.spec.ts',
            'src/features/admin/review-moderation/__tests__/*.spec.tsx',
            // TKT-7.5.C1 — useReviewReports hook spec uses renderHook +
            // mocked next/navigation + useCursorPaginated; jsdom required.
            'src/features/admin/review-moderation/hooks/__tests__/*.spec.tsx',
            // TKT-7.4.H2 — category admin restore stable-codes regression
            // spec; uses @testing-library/react + jsdom for the dialog renders.
            'src/features/admin/category-admin/__tests__/restore-stable-codes.spec.tsx',
            // TKT-7.4.H1 — category admin end-to-end integration spec;
            // composes the page through mocked hooks + services; uses
            // @testing-library/react + jsdom.
            'src/features/admin/category-admin/__tests__/category-admin-e2e.spec.tsx',
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
