

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