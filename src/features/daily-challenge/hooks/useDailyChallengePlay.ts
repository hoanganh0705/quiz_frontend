'use client'

/**
 * `useDailyChallengePlay` — state machine for the in-page daily-challenge
 * play surface.
 *
 * Source epic:   Daily-challenge full backend integration.
 * Source ticket: step4-play.
 *
 * ## Why a separate hook
 *
 * The play surface owns a small state machine that drives the question
 * loop end-to-end:
 *
 *   1. Fetch the day's published quiz via `useQuizByIdOrSlug(quizId)`
 *      (player-safe projection — no `isCorrect` leak).
 *   2. Render one question at a time; on submit, POST the answer.
 *   3. Advance the local `currentIndex` to the server-confirmed
 *      `nextQuestionIndex`; the server is authoritative for the cursor.
 *   4. On `completed === true`, freeze the surface and store
 *      `finalScore`.
 *   5. On 409 (out-of-sync), invalidate the today hook via `refresh()`
 *      and surface a "challenge state drifted" inline alert.
 *
 * The hook never owns the SDK mutation directly — it delegates the
 * snapshot/revert/cooldown discipline to `useOptimisticMutation`. The
 * network fires exactly once per question because the SWR key is
 * derived from the question index.
 *
 * ## Cross-tab contract
 *
 * Submitting an answer for the day's quiz is per-attempt and per-tab —
 * the attempt is server-tracked, not shared across tabs. The hook does
 * NOT broadcast cross-tab invalidations on submit success; the parent
 * surface invalidates the today hook (which carries the post-completion
 * `status: 'completed'`) explicitly on the success path so the day's
 * card updates.
 *
 * ## Public surface
 *
 *   - `questions`           — the player-safe question list (length
 *                             equals `totalQuestions`).
 *   - `currentIndex`        — 0-based position of the current question.
 *   - `totalQuestions`      — mirror of `questions.length` for render.
 *   - `status`              — discriminated play lifecycle:
 *                               - `'idle'`       — no submit yet.
 *                               - `'submitting'` — a submit is in
 *                                                 flight.
 *                               - `'reveal'`     — the most recent
 *                                                 submit resolved;
 *                                                 the next question
 *                                                 is briefly shown
 *                                                 with a correctness
 *                                                 hint before
 *                                                 advancing.
 *                               - `'completed'`  — the day is done;
 *                                                 `finalScore` is
 *                                                 populated.
 *                               - `'error'`      — the most recent
 *                                                 submit rejected
 *                                                 (e.g. 409 out-of-
 *                                                 sync, 5xx).
 *   - `finalScore`          — score percentage; populated when
 *                             `status === 'completed'`.
 *   - `lastError`           — typed `ApiError`; populated when
 *                             `status === 'error'`.
 *   - `submitAnswer`        — fires the SDK mutation for the current
 *                             question.
 *   - `advance`             — explicitly moves `currentIndex` to the
 *                             server-confirmed `nextQuestionIndex`
 *                             (used by the surface after the
 *                             reveal-toast timer).
 *   - `reset`               — clears the state machine back to
 *                             `'idle'` and `currentIndex: 0`.
 *
 * The hook is read-only at the network boundary — it never persists to
 * local storage or the user store. The parent surface owns the
 * `refresh()` of the today hook after completion.
 */

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
  /**
   * The day's quiz id (UUID). When `null`, the hook is disabled.
   * The page composition passes the day's `challenge.quizId` from
   * `useDailyChallengeToday()`.
   */
  quizId: string | null
  /**
   * Revalidation hook for the today hook. Called on 409 (out-of-sync)
   * to recover the correct `nextQuestionIndex` and `status`.
   */
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

/**
 * Build the SWR key for a submit at the given index. The key is used
 * by `useOptimisticMutation` for the snapshot/revert bookkeeping only —
 * the actual cache key in the today hook is owned by the today hook.
 * We key by `(prefix, quizId, currentIndex)` so consecutive submits
 * never share a snapshot.
 */
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
  // Tracks the server-confirmed next question index for advance().
  const nextIndexRef = useRef<number | null>(null)

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
      // The result object drives the hook's lifecycle above; the
      // success / error side-effects have already been applied via
      // the `onSuccess` / `onError` callbacks. Guard for the
      // cooldown / cancelled branches so the surface does not
      // regress into `'submitting'` if the call was dropped.
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

// Re-export so consumers don't need to reach into the service module.
export type { DailyChallengeAnswerResponseView }