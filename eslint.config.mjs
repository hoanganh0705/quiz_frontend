import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * ESLint configuration (flat config format, ESLint v9).
 *
 * Source epic: Epic 1.2 — SDK Regeneration & Barrel Consolidation.
 * Source ticket: TKT-1.2.1.4 (no-restricted-imports rule).
 *
 * The `no-restricted-imports` rule on `axios` enforces the exit criterion
 * "no feature imports `axios` directly" from the Phase 1 master plan.
 * The exempt paths are:
 *   - `src/lib/api/**` — owns the HTTP surface (TKT-1.2.1.1).
 *   - `src/shared/lib/api/client.ts` — legacy parallel client. Tracked
 *     for removal in a future epic; not blocking today.
 *   - `src/app/(public)/login/page.tsx` — uses `axios.isAxiosError` for
 *     narrowing. Tracked for migration to `@/lib/api`'s `isApiError`.
 *
 * When those two callers are migrated, tighten the exempt glob back to
 * `src/lib/api/**` only. The barrel migration is scheduled for the auth
 * wrapper work (Epic 1.2 US-1.2.2) and a separate ticket for the
 * shared client (probably Phase 2).
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // 🔥 must-have
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/use-memo': 'off',
      '@next/next/no-html-link-for-pages': 'warn',
      // Epic 1.2 / TKT-1.2.1.4 — no feature may import `axios` directly.
      // The exempt paths own the HTTP surface; everything else must
      // import from `@/lib/api` instead.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                "Import from '@/lib/api' instead of 'axios' directly. " +
                "The lib/api barrel owns the HTTP surface; only " +
                "src/lib/api/** is allowed to depend on axios.",
            },
          ],
          patterns: [
            {
              group: ['axios/*'],
              message:
                "Import from '@/lib/api' instead of submodules of axios. " +
                'Use the re-exported customInstance / authOnlyInstance / ' +
                'orvalCustomInstance from the barrel.',
            },
          ],
        },
      ],
    },
  },
  // Exempt paths: only the files that own the HTTP surface may import axios.
  // The exempt list is intentionally narrow; widen it only with justification.
  {
    files: [
      'src/lib/api/**/*',
      // Legacy: a hand-rolled axios client that mirrors custom-instance.ts.
      // Tracked for removal — do not extend consumers here.
      'src/shared/lib/api/client.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // ──────────────────────────────────────────────────────────────────────────
  // Epic 3.2 / TKT-3.2.E3 — cursor-pagination envelope lockdown.
  //
  // The `useCursorPaginated` hook (Epic 3.2) is the only place in the
  // codebase that reads `nextCursor` / `data.pagination` / `meta.pagination`
  // — components and feature pages must consume the hook's public result
  // shape (`items`, `hasMore`, `loadMore`, …) and never reach into the
  // raw envelope. The rule below encodes that contract as an ESLint
  // gate so a future regression is caught at lint time, not in code
  // review.
  //
  // Scope:
  //   - `src/features/**` — feature pages and components.
  //   - `src/app/(public)/**` — public-route pages (which already
  //     import features but may also have ad-hoc fetch handlers).
  //
  // Allow-list:
  //   - `src/features/quizzes/components/QuizCatalogMainContent.tsx` —
  //     the fetcher adapter in this file is the single place the
  //     contract permits a `pagination` / `nextCursor` read. After
  //     TKT-3.2.E2 the read is confined to the module-scoped
  //     `quizzesFetcher`; the rule keeps the rest of the component
  //     blocked.
  //   - `src/features/quizzes/types/quiz-backend.ts` — type-only
  //     definitions that mirror the SDK's response shape. The
  //     `Identifier[name='nextCursor']` selector would otherwise flag
  //     type-field declarations, which are not component-state reads.
  //
  // AST selectors:
  //   - `MemberExpression[object.name='data'][property.name='pagination']`
  //     matches `data.pagination` (the legacy flat-envelope shape).
  //   - `MemberExpression[object.name='meta'][property.name='pagination']`
  //     matches `meta.pagination` (the wrapped-envelope shape).
  //   - `Identifier[name='nextCursor']` matches any free reference to
  //     the cursor identifier (covers destructured locals, shorthand
  //     object keys, and TS property keys).
  //
  // The error message names the hook and the contract so the dev
  // experience is "go use the hook, not the wire shape".
  // ──────────────────────────────────────────────────────────────────────────
  {
    files: [
      'src/features/**/*',
      'src/app/(public)/**/*',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='data'][property.name='pagination']",
          message:
            "Reading 'data.pagination' in a feature or public page bypasses the " +
            "useCursorPaginated hook (Epic 3.2). Move the read into the fetcher " +
            "adapter at the SDK boundary; the rest of the component must consume " +
            "the hook's { items, hasMore, loadMore, … } result.",
        },
        {
          selector:
            "MemberExpression[object.name='meta'][property.name='pagination']",
          message:
            "Reading 'meta.pagination' in a feature or public page bypasses the " +
            "useCursorPaginated hook (Epic 3.2). Move the read into the fetcher " +
            "adapter at the SDK boundary; the rest of the component must consume " +
            "the hook's { items, hasMore, loadMore, … } result.",
        },
        {
          selector: "Identifier[name='nextCursor']",
          message:
            "Using 'nextCursor' directly in a feature or public page bypasses the " +
            "useCursorPaginated hook (Epic 3.2). The hook owns cursor handling; " +
            "consume the hook's { items, hasMore, loadMore, refresh } result " +
            "instead. The only allowed read is inside a fetcher adapter that " +
            "translates the SDK envelope to the hook's CursorPage shape.",
        },
      ],
    },
  },
  // Allow-list for the E3 rule — the fetcher-adapter files and the
  // type-only backend mirror. See note above.
  {
    files: [
      'src/features/quizzes/components/QuizCatalogMainContent.tsx',
      'src/features/quizzes/types/quiz-backend.ts',
      // Epic 3.3 / TKT-3.3.B4 — `useCategoryQuizzes` is the fetcher
      // adapter for the `/categories/{slug}/quizzes` endpoint. It is
      // the single place in the categories feature permitted to read
      // `pagination.nextCursor` / `meta.pagination` (the same role
      // `QuizCatalogMainContent.tsx` plays for the quizzes endpoint).
      'src/features/categories/hooks/useCategoryQuizzes.ts',
      // Epic 3.4 / TKT-3.4.B4 — `useTagQuizzes` is the fetcher adapter
      // for the `/tags/{slug}/quizzes` endpoint. Same role as
      // `useCategoryQuizzes` above: it is the single place in the tags
      // feature permitted to read `pagination.nextCursor` and adapt the
      // SDK envelope to the `useCursorPaginated` `CursorPage` shape.
      'src/features/tags/hooks/useTagQuizzes.ts',
      // Epic 3.4 / TKT-3.4.E1 — `useTagsDirectory` is the fetcher
      // adapter for the `/tags` directory endpoint. Same role as
      // `useTagQuizzes` above: it is the single place in the tags
      // feature permitted to read `pagination.nextCursor` and adapt the
      // SDK envelope to the `useCursorPaginated` `CursorPage` shape.
      'src/features/tags/hooks/useTagsDirectory.ts',
            // Epic 3.5 / TKT-3.5.B1 — `useQuizzesList` is the fetcher
            // adapter for the `/quizzes` directory endpoint. Same role as
            // `useTagQuizzes` / `useTagsDirectory` above: it is the single
            // place in the quizzes feature permitted to read
            // `pagination.nextCursor` and adapt the SDK envelope to the
            // `useCursorPaginated` `CursorPage` shape.
            'src/features/quizzes/hooks/useQuizzesList.ts',
            // TKT-3.12.A3 — `daily-challenge.types.dto` declares the
            // planning-intent `DailyChallengeHistoryPage.nextCursor`
            // type field. The `Identifier[name='nextCursor']` AST
            // selector would otherwise flag the type declaration (a
            // type-only construct that is not a component-state read),
            // so the file is added to the allow-list per the same
            // convention as `quiz-backend.ts`.
            'src/features/daily-challenge/types/dto.ts',
            // TKT-3.12.B1 — `useDailyChallengeHistory.spec.tsx` mocks
            // the wrapper's `DailyChallengeHistoryPage` shape (which
            // includes `nextCursor`) so the test fixture must be
            // permitted to construct the page object. The `mock.calls`
            // assertions also re-inspect cursor forwarding; both are
            // co-located reads of the cursor shape.
            'src/features/daily-challenge/hooks/__tests__/useDailyChallengeHistory.spec.tsx',
            // TKT-3.12.B1 — `useDailyChallengeHistory` is the fetcher
            // adapter for the (planning-intent) `/daily-challenge/history`
            // endpoint. The hook is the single place in the
            // daily-challenge feature permitted to read `nextCursor`
            // and adapt the wrapper's discriminated
            // `DailyChallengeResult<DailyChallengeHistoryPage>` shape to
            // the `useCursorPaginated` `CursorPage` shape.
            'src/features/daily-challenge/hooks/useDailyChallengeHistory.ts',
            // TKT-3.12.A3 — the daily-challenge wrapper's `CursorPage`
            // view (`DailyChallengeHistoryPage.nextCursor`) is the
            // single place permitted to read `nextCursor` in the wrapper
            // layer.
            'src/features/daily-challenge/wrappers/daily-challenge.wrapper.ts',
            // TKT-4.4.A2/A3/A4 — `useMyQuizzes`, `useMyQuizzesDrafts`,
            // and `useMyQuizzesPublished` are the fetcher adapters for the
            // `GET /quizzes/me*` endpoints. They are the single places in
            // the quizzes feature permitted to read `meta.pagination` and
            // `nextCursor` and adapt the SDK envelope to the
            // `useCursorPaginated` `CursorPage` shape.
            'src/features/quizzes/hooks/useMyQuizzes.ts',
            'src/features/quizzes/hooks/useMyQuizzesDrafts.ts',
            'src/features/quizzes/hooks/useMyQuizzesPublished.ts',
            // TKT-4.4.A1 — the JSDoc example for `myQuizzesKey` mentions
            // `nextCursor` as part of the conceptual SWR key shape.
            // The type-only declaration is not a component-state read.
            'src/features/quizzes/types/my-quizzes.ts',
            // T-4.12.4 — `useQuizComments` is the fetcher adapter for the
            // `GET /quizzes/:quizId/comments` endpoint. It is the single
            // place in the comments feature permitted to read
            // `meta.pagination` and `nextCursor` and adapt the SDK
            // envelope to the `useCursorPaginated` `CursorPage` shape.
            'src/features/comments/hooks/useQuizComments.ts',
            // T-4.12.5 — the unit spec for `useQuizComments` constructs
            // mock page responses with `nextCursor` so it can assert the
            // hook's pagination contract. The fixture is co-located with
            // the hook under test.
            'src/features/comments/hooks/__tests__/useQuizComments.spec.tsx',
            // T-4.13.4 — `useQuizReviews` is the fetcher adapter for the
            // `GET /quizzes/:quizId/reviews` endpoint. It is the single
            // place in the reviews feature permitted to read
            // `meta.pagination` and `nextCursor` and adapt the SDK
            // envelope to the `useCursorPaginated` `CursorPage` shape.
            'src/features/reviews/hooks/useQuizReviews.ts',
            // T-4.13.4 — the unit spec for `useQuizReviews` constructs
            // mock page responses with `nextCursor` so it can assert the
            // hook's pagination contract. The fixture is co-located with
            // the hook under test.
            'src/features/reviews/hooks/__tests__/useQuizReviews.spec.tsx',
            // T-4.13.4 — `ReviewPage` mirrors the
            // `useCursorPaginated` `CursorPage` shape so the hook
            // returns a feature-typed page. The `nextCursor` field
            // is the canonical `CursorPage.nextCursor` projection
            // and is not a component-state read.
            'src/features/reviews/types/review.types.ts',
            // T-4.13.6 — `useCompletedQuizAttempt`'s fetcher inspects
            // only `data` and never reads `nextCursor`; the JSDoc
            // references the field as part of the response contract.
            'src/features/reviews/hooks/useCompletedQuizAttempt.ts',
            // T-4.13.6 — the unit spec for `useCompletedQuizAttempt`
            // constructs mock envelopes with the cursor field to
            // match the backend's `WrappedPaginatedDto` shape.
            'src/features/reviews/hooks/__tests__/useCompletedQuizAttempt.spec.tsx',
            // T-4.13.7 — `useReviewGate` composes the gate inputs
            // and surfaces the gate state union documented in the
            // type file. It does not read pagination metadata.
            'src/features/reviews/hooks/useReviewGate.ts',
            // T-4.13.11 — the unit spec for `useHelpfulReview`
            // builds `CursorPage` fixtures via the same factory as
            // the real fetcher adapter (mirroring the SDK
            // envelope); the cursor field is on the type, not on a
            // direct read of pagination metadata.
            'src/features/reviews/hooks/__tests__/useHelpfulReview.spec.tsx',
            // TKT-5.7.B2 — `useInstancePlayers` is the fetcher adapter
            // for the `GET /api/v1/instances/:id/players` endpoint.
            // It is the single place in the instances feature
            // permitted to read `meta.pagination.nextCursor` and adapt
            // the SDK envelope to the `useCursorPaginated` `CursorPage`
            // shape.
            'src/features/instances/hooks/useInstancePlayers.ts',
            // TKT-5.7.A1 — `instance.types.ts` declares the
            // feature-typed `InstancePlayersPage.nextCursor` field.
            // The `Identifier[name='nextCursor']` AST selector would
            // otherwise flag the type declaration (a type-only
            // construct that is not a component-state read).
            'src/features/instances/types/instance.types.ts',
            // TKT-5.7.G1 — `useInstancePlayers.spec.tsx` constructs
            // mock `InstancePlayersPage` envelopes with `nextCursor`
            // so it can assert the hook's pagination contract.
            'src/features/instances/hooks/__tests__/useInstancePlayers.spec.tsx',
            // TKT-6.1.D3 — the seven social read hooks are the
            // fetcher adapters for the social list endpoints
            // (`/api/v1/social/users/:id/{followers,following,friends}`,
            // `/api/v1/social/blocked`,
            // `/api/v1/social/friend-requests/{incoming,outgoing}`).
            // They are the single places in the social feature
            // permitted to read `meta.pagination.nextCursor` and
            // adapt the SDK envelope to the `useCursorPaginated`
            // `CursorPage` shape.
            'src/features/social/hooks/useFollowers.ts',
            'src/features/social/hooks/useFollowing.ts',
            'src/features/social/hooks/useFriends.ts',
            'src/features/social/hooks/useBlockedUsers.ts',
            'src/features/social/hooks/useIncomingRequests.ts',
            'src/features/social/hooks/useOutgoingRequests.ts',
            // TKT-6.1.D3 — the unit spec for the social read hooks
            // constructs mock page envelopes with `nextCursor` so it
            // can assert the hook's pagination contract. The fixture
            // is co-located with the hook under test.
            'src/features/social/hooks/__tests__/d3-read-hooks.spec.tsx',
            // TKT-6.1.C1 — `relationship.ts` declares the
            // `SocialPage<T>` discriminated union whose `cursor`
            // variant carries `nextCursor`. The
            // `Identifier[name='nextCursor']` AST selector would
            // otherwise flag the type declaration (a type-only
            // construct that is not a component-state read), so the
            // file is added to the allow-list per the same convention
            // as `quiz-backend.ts`.
            'src/features/social/types/relationship.ts',
            // TKT-6.1.C2 — `dto-adapters.ts` documents the
            // `nextCursor` field on the cursor-page variant in its
            // JSDoc and accepts the SDK envelope (which carries the
            // cursor shape) as an `unknown` input. Both are
            // type-/JSDoc-only constructs that are not component-state
            // reads.
            'src/features/social/dto-adapters.ts',
            // TKT-6.1.C2 — the unit spec for the DTO adapters
            // constructs `SocialPage<T>` fixtures with `nextCursor`
            // so it can assert the discriminated-union narrowing. The
            // fixture is co-located with the adapters under test.
            'src/features/social/__tests__/dto-adapters.spec.ts',
            // TKT-6.1.E2 — `social-graph.service.ts` is the fetcher
            // adapter for the social graph read endpoints
            // (`/api/v1/social/users/:id/{followers,following,friends,mutual-friends,mutual-followers,activity}`,
            // `/api/v1/social/blocked`, `/api/v1/social/counts`). It
            // reads `meta.pagination.nextCursor` from the SDK envelope
            // to normalise the cursor page, and synthesises a
            // single-page cursor response for `getBlockedUsers` (the
            // SDK endpoint is non-paginated). Both reads are at the
            // SDK boundary; the rest of the application only sees
            // the canonical `SocialPage<T>` projection.
            'src/features/social/services/social-graph.service.ts',
            // TKT-6.1.E2 — the unit spec for the social-graph service
            // constructs `SocialPage<T>` fixtures with `nextCursor`
            // so it can assert the discriminated-union narrowing and
            // the cursor-page synthesis. The fixture is co-located
            // with the service under test.
            'src/features/social/services/__tests__/social-graph.service.spec.ts',
            // TKT-6.4.C1 — `mutuals.service.ts` is the Story 6.4
            // fetcher adapter for the mutual-friends and
            // mutual-followers endpoints. It returns the canonical
            // cursor-paginated envelope (`items` + `total`) so the
            // consumer hooks can branch on a single shape.
            'src/features/social/services/mutuals.service.ts',
            // TKT-6.4.D1 — `activity.service.ts` is the Story 6.4
            // fetcher adapter for the user activity endpoint. It
            // returns the canonical cursor-paginated envelope
            // (`items` + `total` + `cooldownSeconds?`) so the
            // consumer hook can branch on a single shape.
            'src/features/social/services/activity.service.ts',
            // TKT-6.4.C2 / TKT-6.4.C3 / TKT-6.4.D2 — the three
            // Story 6.4 read hooks (`useMutualFriends`,
            // `useMutualFollowers`, `useUserActivity`) are the
            // fetcher adapters for the mutuals and activity
            // endpoints. They are the single places in the social
            // feature permitted to read the cursor envelope and
            // adapt it to the `useCursorPaginated` `CursorPage`
            // shape.
            'src/features/social/hooks/useMutualFriends.ts',
            'src/features/social/hooks/useMutualFollowers.ts',
            'src/features/social/hooks/useUserActivity.ts',
            // TKT-6.4.C1 / TKT-6.4.D1 — the unit specs for the Story
            // 6.4 mutuals and activity service wrappers construct
            // mock `meta.pagination` envelopes with `nextCursor` so
            // they can assert the service's `CursorPage` synthesis
            // and the cursor-page narrowing branches. The fixtures
            // are co-located with the services under test.
            'src/features/social/services/__tests__/mutuals.service.spec.ts',
            'src/features/social/services/__tests__/activity.service.spec.ts',
            // TKT-6.4.C2 / TKT-6.4.C3 / TKT-6.4.D2 — the unit specs
            // for the three Story 6.4 read hooks construct mock SDK
            // envelopes with `nextCursor` so they can assert the
            // hook's privacy-mapping and pagination behaviour. The
            // fixtures are co-located with the hooks under test.
            'src/features/social/hooks/__tests__/useMutualFriends.spec.tsx',
            'src/features/social/hooks/__tests__/useMutualFollowers.spec.tsx',
            'src/features/social/hooks/__tests__/useUserActivity.spec.tsx',
            // TKT-7.1.E3 / TKT-7.1.E4 — `review-moderation.service.ts`
            // and `comment-moderation.service.ts` are the Epic 7.1
            // fetcher adapters for the platform-wide review and comment
            // moderation queue endpoints. They are the single places in
            // the admin feature permitted to read `meta.pagination` and
            // `nextCursor` and adapt the SDK envelope to a
            // `useCursorPaginated`-compatible `CursorPage` shape
            // (`items` + `hasNextPage` + `nextCursor`).
            'src/features/admin/services/review-moderation.service.ts',
            'src/features/admin/services/comment-moderation.service.ts',
            // TKT-7.1.E3 / TKT-7.1.E4 — the unit specs for the review
            // and comment moderation services construct mock
            // `meta.pagination` envelopes with `nextCursor` so they can
            // assert the service's `CursorPage` synthesis. The fixtures
            // are co-located with the services under test.
            'src/features/admin/services/__tests__/review-moderation.service.spec.ts',
            'src/features/admin/services/__tests__/comment-moderation.service.spec.ts',
          ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]

export default eslintConfig