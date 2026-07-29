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
      // Legacy: uses axios.isAxiosError for narrowing. Tracked for migration
      // to the barrel's `isApiError` in a follow-up ticket.
      'src/app/(public)/login/page.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]

export default eslintConfig