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
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]

export default eslintConfig