/**
 * `daily-challenge.helpers.ts` — shared stubbing + fixture helpers for
 * the daily-challenge acceptance suite (Story 3.12 / TKT-3.12.E2).
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source ticket: TKT-3.12.E2 — E2E Playwright spec for the live
 *                 daily-challenge.
 *
 * ## Flag-driven surface
 *
 * The page composition branches on a single flag,
 * `dailyChallengePage` (TKT-3.12.A2), read at module-init time from
 * `process.env.NEXT_PUBLIC_DAILY_CHALLENGE_PAGE`. The locked Phase 3
 * default is `'placeholder'` (per `EPIC_3_12_A1.md` §6). The flag
 * value cannot be flipped per-test in a single browser session; it
 * is baked at server build time.
 *
 * The helpers below stub the auth endpoints (so the streak-indicator
 * branch and the auth-only-history-warning branches can be exercised
 * in isolation) and document the daily-challenge endpoint stubs the
 * spec would exercise when the regenerated SDK exposes them.
 *
 * ## Why no `/api/v1/daily-challenge/**` stub is installed
 *
 * Per `EPIC_3_12_A1.md` §1.1 the regenerated SDK at this commit
 * does not expose a daily-challenge operation. The wrapper
 * (`daily-challenge.wrapper.ts`) returns `{ kind: 'missing-endpoint' }`
 * for every call. The page composition falls through to
 * `<DailyChallengePlaceholder />` regardless of the flag value
 * (when the flag is `'v1'`, the page still renders the placeholder
 * because the hooks report `isMissingEndpoint: true`).
 *
 * When the backend exposes the daily-challenge operations (a
 * follow-up commit), the helpers here should add a `stubDailyChallenge(page)`
 * function that fulfills the wire shape documented in
 * `EPIC_3_12_A1.md` §2.1 / §2.2. The acceptance spec at
 * `daily-challenge.spec.ts` documents the future cases via
 * `test.fixme(...)` so they activate as soon as the SDK lands.
 */

// ──────────────────────────────────────────────────────────────────────
// Public constants — auth/user fixture IDs.
// ──────────────────────────────────────────────────────────────────────

/**
 * The seeded self-user UUID. Mirrors the
 * `Leaderboard` / `Bookmarks` helpers convention
 * (`e2e/leaderboard/leaderboard.helpers.ts` line 36).
 */
export const SELF_USER_ID = '0192f4d8-cccc-7000-8000-00000000000d'

// ──────────────────────────────────────────────────────────────────────
// Auth helpers
// ──────────────────────────────────────────────────────────────────────

export interface StubAuthOptions {
  authenticate?: boolean
}

/**
 * Stub the `/api/v1/auth/me` endpoint so the page composition's
 * `useDailyChallengeStreakView` hook receives a `{ currentStreak: 7 }`
 * user payload (authenticated) or an unauthenticated 401 (default).
 *
 * The endpoint shape mirrors the regenerated SDK's
 * `getAuth().authControllerGetMe()` wire output — a 200 with the
 * `UserMeResponseDto` (drift A1 #3: the streak signal comes from
 * `user.currentStreak`, not a separate endpoint).
 */
export async function stubAuth(
  page: import('@playwright/test').Page,
  options: StubAuthOptions = {},
): Promise<void> {
  const { authenticate = false } = options

  await page.route('**/api/v1/auth/me**', async (route) => {
    if (!authenticate) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          extensions: { code: 'AUTH_REQUIRED' },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: SELF_USER_ID,
          email: 'self@example.test',
          displayName: 'Self User',
          currentStreak: 7,
          // Other fields zeroed out — the daily-challenge page
          // reads `currentStreak` only (drift A1 §3 — the streak
          // signal comes from `useUser().currentStreak`).
        },
      }),
    })
  })
}

// ──────────────────────────────────────────────────────────────────────
// Future stubs (TKT-3.12.E2 follow-up)
// ──────────────────────────────────────────────────────────────────────

/**
 * Stub the (future) `/api/v1/daily-challenge/today` endpoint.
 *
 * Not active at this commit — the wrapper returns
 * `kind: 'missing-endpoint'` without making a network call. When
 * the regenerated SDK exposes a daily-challenge operation, this
 * stub is enabled and the spec's `test.fixme(...)` cases flip to
 * `test(...)`. Wire shape — see `EPIC_3_12_A1.md` §2.1:
 *
 *   {
 *     "data": {
 *       "id": "challenge-1",
 *       "date": "2026-08-02T00:00:00.000Z",
 *       "quizId": "quiz-1",
 *       "category": "Science",
 *       "totalQuestions": 5,
 *       "rewardXp": 100
 *     }
 *   }
 */
export async function stubDailyChallengeToday(): Promise<void> {
  // No-op at this commit. See file header for the activation
  // plan.
  return
}

/**
 * Stub the (future) `/api/v1/daily-challenge/history` endpoint.
 *
 * Not active at this commit — same reason as `stubDailyChallengeToday`.
 * Wire shape — see `EPIC_3_12_A1.md` §2.2:
 *
 *   {
 *     "data": {
 *       "items": [
 *         {
 *           "id": "h-1",
 *           "date": "2026-08-01T00:00:00.000Z",
 *           "category": "Math",
 *           "score": 80,
 *           "rank": 5,
 *           "isTopTen": true
 *         }
 *       ],
 *       "pagination": {
 *         "nextCursor": "cursor-2",
 *         "hasNextPage": true,
 *         "limit": 5
 *       }
 *     }
 *   }
 */
export async function stubDailyChallengeHistory(): Promise<void> {
  // No-op at this commit.
  return
}
