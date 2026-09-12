

import type { ApiError } from '@/lib/api/core/ApiError'

export interface DailyChallengeView {
id: string
date: string
quizId: string
quizTitle: string
slug: string
category: string
difficulty: 'easy' | 'medium' | 'hard'
totalQuestions: number
rewardXp: number
expiresAt: string
status: 'pending' | 'completed' | 'expired'
scorePercent: number | null
rank: number | null
}

export interface DailyChallengeHistoryItemView {
id: string
date: string
quizId: string
quizTitle: string
slug: string
difficulty: 'easy' | 'medium' | 'hard'
category: string
score: number
rank: number
isTopTen: boolean
}

export interface DailyChallengeHistoryPage {
items: readonly DailyChallengeHistoryItemView[]

nextCursor: string | null
hasNextPage: boolean
limit: number
}

export interface DailyChallengeAnswerResponseView {
correct: boolean
nextQuestionIndex: number
totalQuestions: number
completed: boolean
scorePercent: number | null
}

/**
 * Phase 4 (F-2): one row in the per-category distribution surfaced
 * by `<ChallengePieChart />`.
 *
 * `attemptCount` is the number of completed daily-challenge attempts
 * the viewer has in this category; `averageScorePercent` is the
 * mean of every attempt's `scorePercent` (0–100). Both are
 * computed on the server (`dailyChallengeAttempt` joined to
 * `quizzes.categoryId` and grouped by `categories.category_id`).
 */
export interface DailyChallengeCategoryBreakdownItemView {
categoryId: string
categoryName: string
categorySlug: string
attemptCount: number
averageScorePercent: number
}

export interface DailyChallengeCategoryBreakdownPage {
items: readonly DailyChallengeCategoryBreakdownItemView[]
}

/**
 * Discriminated union — mirrors `DailyChallengeResult<T>` so callers
 * handle `missing-endpoint` and `error` shapes the same way as the
 * other daily-challenge service methods.
 */
export type DailyChallengeCategoryBreakdownResult =
  | { kind: 'ok'; data: DailyChallengeCategoryBreakdownPage }
  | { kind: 'missing-endpoint' }
  | { kind: 'error'; error: ApiError }

export type DailyChallengeResult<T> =
| { kind: 'ok'; data: T }
  | { kind: 'missing-endpoint' }
  | { kind: 'error'; error: ApiError }

export interface GetDailyChallengeHistoryParams {
cursor?: string
offset?: number
limit?: number
}

export interface SubmitDailyChallengeAnswerParams {
questionIndex: number
selectedOptionId: string | null
}