/**
 * `useDailyChallengePlay.spec.tsx` — locks the state machine of the
 * in-page play surface hook (step4-play).
 *
 * Cases per the ticket's testing checklist:
 *
 *   (a) Submits each question in sequence; the `submitAnswer` SDK
 *       call fires once per question with the correct
 *       `questionIndex`.
 *   (b) Advances to `'completed'` when the response
 *       `nextQuestionIndex === totalQuestions`, and surfaces
 *       `finalScore`.
 *   (c) On a 409 conflict, the hook sets `status: 'error'` and
 *       invokes `onTodayRefresh()` exactly once.
 *   (d) When the user calls `advance()` after a non-terminal
 *       response, `currentIndex` advances to the
 *       `nextQuestionIndex` and `status` returns to `'idle'`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { ApiError } from '@/lib/api'

import { useDailyChallengePlay } from '@/features/daily-challenge/hooks/useDailyChallengePlay'
import { submitDailyChallengeAnswer } from '@/features/daily-challenge/services/daily-challenge.service'
import type { DailyChallengeAnswerResponseView } from '@/features/daily-challenge/services/daily-challenge.service'

const useQuizByIdOrSlugMock = vi.fn()

vi.mock(
  '@/features/quizzes/hooks/useQuizByIdOrSlug',
  () => ({
    useQuizByIdOrSlug: () => useQuizByIdOrSlugMock(),
  }),
)

vi.mock(
  '@/features/daily-challenge/services/daily-challenge.service',
  () => ({
    submitDailyChallengeAnswer: vi.fn(),
  }),
)

afterEach(() => {
  vi.clearAllMocks()
})

const PLAYER_QUIZ_FIXTURE = {
  quizId: 'quiz-1',
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
        questionId: 'q-1',
        quizVersionId: 'version-1',
        position: 1,
        questionText: 'Which planet is closest to the Sun?',
        imageUrl: null,
        answerOptions: [
          {
            optionId: 'opt-a',
            position: 1,
            value: 'Mercury',
            createdAt: '2026-08-02T00:00:00.000Z',
          },
          {
            optionId: 'opt-b',
            position: 2,
            value: 'Venus',
            createdAt: '2026-08-02T00:00:00.000Z',
          },
        ],
      },
      {
        questionId: 'q-2',
        quizVersionId: 'version-1',
        position: 2,
        questionText: 'Which planet is the largest?',
        imageUrl: null,
        answerOptions: [
          {
            optionId: 'opt-c',
            position: 1,
            value: 'Jupiter',
            createdAt: '2026-08-02T00:00:00.000Z',
          },
          {
            optionId: 'opt-d',
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
}

const submitSpy = vi.mocked(submitDailyChallengeAnswer)
const onTodayRefreshSpy = vi.fn()

function makeApiError(status: number): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code: `CODE_${status}`,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: { code: `CODE_${status}`, detail: 'fixture' },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0])
}

function successAnswer(
  overrides: Partial<DailyChallengeAnswerResponseView> = {},
): Awaited<ReturnType<typeof submitDailyChallengeAnswer>> {
  return {
    kind: 'ok',
    data: {
      correct: true,
      nextQuestionIndex: 1,
      totalQuestions: 2,
      completed: false,
      scorePercent: null,
      ...overrides,
    },
  }
}

beforeEach(() => {
  useQuizByIdOrSlugMock.mockReturnValue({
    quiz: PLAYER_QUIZ_FIXTURE,
    notFound: false,
    isLoading: false,
    error: null,
    retry: async () => {},
    isRetrying: false,
  })
  submitSpy.mockReset()
  onTodayRefreshSpy.mockReset()
  submitSpy.mockResolvedValue(successAnswer())
})

describe('useDailyChallengePlay — state machine', () => {
  it('(a) submitAnswer fires the SDK once with the correct questionIndex + selectedOptionId', async () => {
    const { result } = renderHook(() =>
      useDailyChallengePlay({ quizId: 'quiz-1' }),
    )

    expect(result.current.questions).toHaveLength(2)
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.submitAnswer('opt-a')
    })

    expect(submitSpy).toHaveBeenCalledTimes(1)
    expect(submitSpy).toHaveBeenCalledWith({
      questionIndex: 0,
      selectedOptionId: 'opt-a',
    })
  })

  it('(b) advances to completed when nextQuestionIndex === totalQuestions and surfaces finalScore', async () => {
    submitSpy.mockResolvedValue(
      successAnswer({
        correct: true,
        nextQuestionIndex: 2,
        totalQuestions: 2,
        completed: true,
        scorePercent: 100,
      }),
    )
    const { result } = renderHook(() =>
      useDailyChallengePlay({ quizId: 'quiz-1' }),
    )

    await act(async () => {
      await result.current.submitAnswer('opt-c')
    })

    expect(result.current.status).toBe('completed')
    expect(result.current.finalScore).toBe(100)
    expect(result.current.lastRevealCorrect).toBe(true)
  })

  it('(c) on a 409 conflict, status becomes "error" and onTodayRefresh is invoked exactly once', async () => {
    submitSpy.mockResolvedValue({
      kind: 'error',
      error: makeApiError(409),
    })
    const { result } = renderHook(() =>
      useDailyChallengePlay({
        quizId: 'quiz-1',
        onTodayRefresh: onTodayRefreshSpy,
      }),
    )

    await act(async () => {
      await result.current.submitAnswer('opt-a')
    })

    expect(result.current.status).toBe('error')
    expect(result.current.lastError).not.toBeNull()
    expect(onTodayRefreshSpy).toHaveBeenCalledTimes(1)
  })

  it('(d) advance() moves currentIndex to the server-confirmed nextQuestionIndex and resets status', async () => {
    const { result } = renderHook(() =>
      useDailyChallengePlay({ quizId: 'quiz-1' }),
    )

    await act(async () => {
      await result.current.submitAnswer('opt-a')
    })
    expect(result.current.status).toBe('reveal')
    expect(result.current.lastRevealCorrect).toBe(true)

    act(() => {
      result.current.advance()
    })

    expect(result.current.currentIndex).toBe(1)
    expect(result.current.status).toBe('idle')
    expect(result.current.lastRevealCorrect).toBeNull()
  })

  it('reset() returns the hook to the initial state', async () => {
    const { result } = renderHook(() =>
      useDailyChallengePlay({ quizId: 'quiz-1' }),
    )

    await act(async () => {
      await result.current.submitAnswer('opt-a')
    })
    act(() => {
      result.current.reset()
    })

    expect(result.current.currentIndex).toBe(0)
    expect(result.current.status).toBe('idle')
    expect(result.current.finalScore).toBeNull()
  })
})