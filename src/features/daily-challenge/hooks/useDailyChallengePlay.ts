'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import {
ApiError,
isApiError,
useOptimisticMutation,
} from '@/lib/api'
import type {
OptimisticMutationCall,
OptimisticMutationResult,
} from '@/lib/api'

import { submitDailyChallengeAnswer } from '@/features/daily-challenge/services/daily-challenge.service'
import type {
DailyChallengeAnswerResponseView,
} from '@/features/daily-challenge/services/daily-challenge.service'
import type { PlayerQuestion } from '@/features/quizzes/lib/quiz-player-view'
import { useQuizByIdOrSlug } from '@/features/quizzes/hooks/useQuizByIdOrSlug'

export type DailyChallengePlayStatus =
| 'idle'
  | 'submitting'
  | 'reveal'
  | 'completed'
  | 'error'

export interface UseDailyChallengePlayParams {

quizId: string | null

onTodayRefresh?: () => Promise<void> | void
}

export interface UseDailyChallengePlayResult {
questions: readonly PlayerQuestion[]
currentIndex: number
totalQuestions: number
status: DailyChallengePlayStatus
lastRevealCorrect: boolean | null
finalScore: number | null
lastError: ApiError | null
isQuizLoading: boolean
submitAnswer: (selectedOptionId: string | null) => Promise<void>
advance: () => void
reset: () => void
}

const SWR_KEY_PREFIX = 'daily-challenge-play'

function submitKey(
quizId: string,
currentIndex: number,
): readonly unknown[] {
return [SWR_KEY_PREFIX, quizId, currentIndex]
}

export function useDailyChallengePlay(
params: UseDailyChallengePlayParams,
): UseDailyChallengePlayResult {
const { quizId, onTodayRefresh } = params

const [currentIndex, setCurrentIndex] = useState(0)
const [status, setStatus] = useState<DailyChallengePlayStatus>('idle')
const [finalScore, setFinalScore] = useState<number | null>(null)
const [lastError, setLastError] = useState<ApiError | null>(null)
const [lastRevealCorrect, setLastRevealCorrect] = useState<boolean | null>(null)

const nextIndexRef = useRef<number | null>(null)

// `useQuizByIdOrSlug` is called with `quizId` so the question list is
// fetched eagerly. This is intentional: the play surface renders the
// first question immediately on mount. A future optimization is to have
// the daily-challenge today endpoint include the day's question list
// (the backend already knows which questions belong to the day), so the
// quiz endpoint fetch is dropped entirely.
const { quiz, isLoading: isQuizLoading } = useQuizByIdOrSlug(quizId)

const questions: PlayerQuestion[] = useMemo(() => {
return quiz?.publishedVersion?.questions ?? []
  }, [quiz])

const totalQuestions = questions.length

const mutation = useOptimisticMutation()

const submitAnswer = useCallback(
async (selectedOptionId: string | null): Promise<void> => {
if (!quizId) return
if (status === 'submitting' || status === 'completed') return

setStatus('submitting')
setLastError(null)

const optimisticKey = submitKey(quizId, currentIndex)
const payload: Parameters<typeof submitDailyChallengeAnswer>[0] = {
questionIndex: currentIndex,
selectedOptionId,
      }

const call: OptimisticMutationCall<
DailyChallengeAnswerResponseView,
DailyChallengeAnswerResponseView
      > = {
key: optimisticKey,
optimisticData: (current) => current,
run: async () => {
const result = await submitDailyChallengeAnswer(payload)
if (result.kind === 'ok') {
return result.data
          }
if (result.kind === 'missing-endpoint') {
throw ApiError.fromInput({
status: 501,
code: 'DAILY_CHALLENGE_NOT_IMPLEMENTED',
message: 'Daily challenge answer endpoint unavailable',
            })
          }
throw result.error
        },
onSuccess: (data) => {
nextIndexRef.current = data.nextQuestionIndex
setLastRevealCorrect(data.correct)
if (data.completed) {
setFinalScore(data.scorePercent ?? 0)
setStatus('completed')
          } else {
setStatus('reveal')
          }
        },
onError: (apiError) => {
const typed = isApiError(apiError) ? apiError : null
setLastError(typed)
setStatus('error')
if (typed?.status === 409 && onTodayRefresh) {
void onTodayRefresh()
          }
        },
      }

const result: OptimisticMutationResult<DailyChallengeAnswerResponseView> =
await mutation.mutate(call)

if (result.status === 'cooldown' || result.status === 'cancelled') {
setStatus('idle')
      }
    },
[quizId, currentIndex, status, mutation, onTodayRefresh],
  )

const advance = useCallback((): void => {
const next = nextIndexRef.current
if (next === null) return
setCurrentIndex(next)
setLastRevealCorrect(null)
setStatus('idle')
nextIndexRef.current = null
  }, [])

const reset = useCallback((): void => {
setCurrentIndex(0)
setStatus('idle')
setFinalScore(null)
setLastError(null)
setLastRevealCorrect(null)
nextIndexRef.current = null
  }, [])

return {
questions,
currentIndex,
totalQuestions,
status,
lastRevealCorrect,
finalScore,
lastError,
isQuizLoading,
submitAnswer,
advance,
reset,
  }
}

export type { DailyChallengeAnswerResponseView }