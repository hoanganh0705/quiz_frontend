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
 * in isolation) and the daily-challenge endpoints so the live
 * branch (Branch 4) and the in-page play surface can be driven end
 * to end.
 *
 * ## Phase 3 (S-14) — full backend integration
 *
 * The regenerated SDK now exposes the four daily-challenge operations
 * (today / history / leaderboard / answer) under
 * `getDailyChallenge()`. The wrapper at
 * `src/features/daily-challenge/services/daily-challenge.service.ts`
 * translates the canonical envelope `{ data, meta: { timestamp, ... } }`
 * into the planning-intent views. The helpers in this file fulfill
 * the SAME envelope shape so the wire-shape contract is locked at
 * the e2e layer.
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

export const SELF_QUIZ_ID = '0192f4d8-cccc-7000-8000-000000000111'

export const SELF_QUESTION_ID_1 = '0192f4d8-cccc-7000-8000-000000000211'
export const SELF_QUESTION_ID_2 = '0192f4d8-cccc-7000-8000-000000000212'

export const SELF_OPTION_ID_A = '0192f4d8-cccc-7000-8000-000000000311'
export const SELF_OPTION_ID_B = '0192f4d8-cccc-7000-8000-000000000312'
export const SELF_OPTION_ID_C = '0192f4d8-cccc-7000-8000-000000000321'
export const SELF_OPTION_ID_D = '0192f4d8-cccc-7000-8000-000000000322'

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
        },
      }),
    })
  })
}

// ──────────────────────────────────────────────────────────────────────
// Daily-challenge stubs
// ──────────────────────────────────────────────────────────────────────

/**
 * Stub the `/api/v1/daily-challenge/today` endpoint with the
 * canonical envelope. The default fixture is a `status: 'pending'`
 * challenge with the seeded quiz so the in-page play surface is
 * mounted.
 */
export async function stubDailyChallengeToday(
  page: import('@playwright/test').Page,
  overrides: {
    status?: 'pending' | 'completed' | 'expired'
    scorePercent?: number | null
    rank?: number | null
    quizTitle?: string
    difficulty?: 'easy' | 'medium' | 'hard'
  } = {},
): Promise<void> {
  const {
    status = 'pending',
    scorePercent = null,
    rank = null,
    quizTitle = 'Solar System Trivia',
    difficulty = 'medium',
  } = overrides
  await page.route('**/api/v1/daily-challenge/today**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          date: '2026-08-02T00:00:00.000Z',
          quizId: SELF_QUIZ_ID,
          quizTitle,
          slug: 'solar-system-trivia',
          difficulty,
          questionCount: 2,
          rewardXp: 100,
          expiresAt: '2026-08-03T00:00:00.000Z',
          status,
          scorePercent,
          rank,
        },
      }),
    })
  })
}

/**
 * Stub the `/api/v1/daily-challenge/history` endpoint. The wire
 * shape is `WrappedPaginatedDto` with `data: [DailyChallengeHistoryResponseDto]`
 * — the loader adapter surfaces the FIRST element only (see
 * `daily-challenge.service.ts` `getDailyChallengeHistoryPage`).
 */
export async function stubDailyChallengeHistory(
  page: import('@playwright/test').Page,
  options: {
    items?: Array<{
      date: string
      quizId: string
      quizTitle: string
      difficulty: 'easy' | 'medium' | 'hard'
      score: number
      rank: number
    }>
    hasNextPage?: boolean
    nextCursor?: string | null
  } = {},
): Promise<void> {
  const {
    items = [
      {
        date: '2026-08-01T00:00:00.000Z',
        quizId: SELF_QUIZ_ID,
        quizTitle: 'Solar System Trivia',
        difficulty: 'easy',
        score: 80,
        rank: 1,
      },
    ],
    hasNextPage = false,
    nextCursor = null,
  } = options

  await page.route('**/api/v1/daily-challenge/history**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            items,
            pagination: {
              nextCursor,
              hasNextPage,
              limit: 5,
            },
          },
        ],
      }),
    })
  })
}

/**
 * Stub the `/api/v1/daily-challenge/answer` endpoint. The default
 * fixture is a non-terminal success: `correct: true` and the next
 * question index is 1 of 2.
 */
export async function stubDailyChallengeAnswer(
  page: import('@playwright/test').Page,
  options: {
    correct?: boolean
    completed?: boolean
    nextQuestionIndex?: number
    scorePercent?: number | null
    status?: number
  } = {},
): Promise<void> {
  const {
    correct = true,
    completed = false,
    nextQuestionIndex = 1,
    scorePercent = null,
    status = 200,
  } = options

  await page.route('**/api/v1/daily-challenge/answer**', async (route) => {
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Conflict',
          status,
          extensions: { code: 'DAILY_CHALLENGE_OUT_OF_SYNC' },
        }),
      })
      return
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          correct,
          nextQuestionIndex,
          totalQuestions: 2,
          completed,
          scorePercent,
        },
      }),
    })
  })
}

/**
 * Stub `GET /api/v1/quizzes/:id` so the play surface can resolve the
 * day's quiz questions. The fixture carries two player-safe
 * questions; each question carries two player-safe options
 * (no `isCorrect` leak — the public detail endpoint enforces the
 * no-spoiler invariant at the wire level).
 */
export async function stubDailyChallengeQuiz(
  page: import('@playwright/test').Page,
  options: {
    quizId?: string
  } = {},
): Promise<void> {
  const { quizId = SELF_QUIZ_ID } = options
  await page.route(`**/api/v1/quizzes/${quizId}**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          quizId,
          creatorId: null,
          title: 'Solar System Trivia',
          description: null,
          slug: 'solar-system-trivia',
          requirements: null,
          imageUrl: null,
          categoryId: null,
          isFeatured: false,
          isHidden: false,
          isVerified: false,
          publishedVersionId: 'version-1',
          publishedVersion: {
            quizVersionId: 'version-1',
            versionNumber: 1,
            difficulty: 'medium',
            durationMs: 60_000,
            passingScorePercent: 50,
            rewardXp: 100,
            questions: [
              {
                questionId: SELF_QUESTION_ID_1,
                quizVersionId: 'version-1',
                position: 1,
                questionText: 'Which planet is closest to the Sun?',
                imageUrl: null,
                answerOptions: [
                  {
                    optionId: SELF_OPTION_ID_A,
                    position: 1,
                    value: 'Mercury',
                    createdAt: '2026-08-02T00:00:00.000Z',
                  },
                  {
                    optionId: SELF_OPTION_ID_B,
                    position: 2,
                    value: 'Venus',
                    createdAt: '2026-08-02T00:00:00.000Z',
                  },
                ],
              },
              {
                questionId: SELF_QUESTION_ID_2,
                quizVersionId: 'version-1',
                position: 2,
                questionText: 'Which planet is the largest?',
                imageUrl: null,
                answerOptions: [
                  {
                    optionId: SELF_OPTION_ID_C,
                    position: 1,
                    value: 'Jupiter',
                    createdAt: '2026-08-02T00:00:00.000Z',
                  },
                  {
                    optionId: SELF_OPTION_ID_D,
                    position: 2,
                    value: 'Mars',
                    createdAt: '2026-08-02T00:00:00.000Z',
                  },
                ],
              },
            ],
          },
          tags: [],
          createdAt: '2026-08-02T00:00:00.000Z',
          updatedAt: '2026-08-02T00:00:00.000Z',
        },
      }),
    })
  })
}

/**
 * Install the full daily-challenge stub set (auth + today + history
 * + quiz + answer) with the defaults that drive the live branch.
 */
export async function stubDailyChallengeLive(
  page: import('@playwright/test').Page,
  options: StubAuthOptions & {
    today?: Parameters<typeof stubDailyChallengeToday>[1]
    history?: Parameters<typeof stubDailyChallengeHistory>[1]
    answer?: Parameters<typeof stubDailyChallengeAnswer>[1]
    quiz?: Parameters<typeof stubDailyChallengeQuiz>[1]
  } = {},
): Promise<void> {
  const {
    today,
    history,
    answer,
    quiz,
    ...authOptions
  } = options
  await stubAuth(page, authOptions)
  await stubDailyChallengeToday(page, today)
  await stubDailyChallengeHistory(page, history)
  await stubDailyChallengeQuiz(page, quiz)
  await stubDailyChallengeAnswer(page, answer)
}