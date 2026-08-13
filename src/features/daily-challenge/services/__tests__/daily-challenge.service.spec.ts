/**
 * `daily-challenge.service.spec.ts` — locks the wrapper's wire-shape
 * unwrap for `getDailyChallengeHistoryPage`, the today narrow for the
 * new fields, and the `submitDailyChallengeAnswer` wrapper (step1-service).
 *
 * Three cases:
 *
 *   (a) The history unwrap maps `WrappedPaginatedDto → CursorPage`
 *       correctly (single-page and multi-page). Locks the
 *       `data: DailyChallengeHistoryResponseDto[]` of-pages contract.
 *   (b) The today narrow maps every new field from
 *       `DailyChallengeResponseDto` (quizTitle, slug, difficulty,
 *       expiresAt, status, scorePercent, rank).
 *   (c) The answer wrapper returns the inner
 *       `DailyChallengeAnswerResponseView` on `kind: 'ok'` and the
 *       typed `ApiError` on `kind: 'error'`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api'

const getDailyChallengeMock = vi.fn()

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    getDailyChallenge: () => getDailyChallengeMock(),
    isApiError: actual.isApiError,
    ApiError: actual.ApiError,
  }
})

import {
  getDailyChallengeHistoryPage,
  getDailyChallengeToday,
  submitDailyChallengeAnswer,
} from '@/features/daily-challenge/services/daily-challenge.service'

beforeEach(() => {
  getDailyChallengeMock.mockReset()
})

describe('daily-challenge.service — getDailyChallengeToday', () => {
  it('(b) narrows every new field from the backend DTO', async () => {
    getDailyChallengeMock.mockReturnValue({
      dailyChallengeControllerGetToday: async () => ({
        data: {
          date: '2026-08-02T00:00:00.000Z',
          quizId: 'quiz-1',
          quizTitle: 'Solar System Trivia',
          slug: 'solar-system-trivia',
          difficulty: 'hard',
          questionCount: 5,
          rewardXp: 100,
          expiresAt: '2026-08-03T00:00:00.000Z',
          status: 'pending',
          scorePercent: null,
          rank: null,
        },
      }),
    })

    const result = await getDailyChallengeToday()
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') throw new Error('expected ok')
    expect(result.data).toEqual({
      id: 'quiz-1',
      date: '2026-08-02T00:00:00.000Z',
      quizId: 'quiz-1',
      quizTitle: 'Solar System Trivia',
      slug: 'solar-system-trivia',
      difficulty: 'hard',
      category: 'hard',
      totalQuestions: 5,
      rewardXp: 100,
      expiresAt: '2026-08-03T00:00:00.000Z',
      status: 'pending',
      scorePercent: null,
      rank: null,
    })
  })

  it('(b) returns kind=error when the envelope is missing the payload', async () => {
    getDailyChallengeMock.mockReturnValue({
      dailyChallengeControllerGetToday: async () => ({ data: undefined }),
    })

    const result = await getDailyChallengeToday()
    expect(result.kind).toBe('error')
  })
})

describe('daily-challenge.service — getDailyChallengeHistoryPage', () => {
  it('(a) unwraps a single-page envelope to the page items', async () => {
    getDailyChallengeMock.mockReturnValue({
      dailyChallengeControllerGetHistory: async () => ({
        data: [
          {
            items: [
              {
                date: '2026-08-01T00:00:00.000Z',
                quizId: 'quiz-1',
                quizTitle: 'Solar System Trivia',
                slug: 'solar-system-trivia',
                difficulty: 'easy',
                score: 80,
                rank: 1,
              },
            ],
            pagination: {
              nextCursor: null,
              hasNextPage: false,
              limit: 5,
            },
          },
        ],
      }),
    })

    const result = await getDailyChallengeHistoryPage({ limit: 5 })
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') throw new Error('expected ok')
    expect(result.data.items).toHaveLength(1)
    expect(result.data.items[0]?.quizTitle).toBe('Solar System Trivia')
    expect(result.data.items[0]?.isTopTen).toBe(true)
    expect(result.data.nextCursor).toBeNull()
    expect(result.data.hasNextPage).toBe(false)
    expect(result.data.limit).toBe(5)
  })

  it('(a) unwraps a multi-page envelope by surfacing the FIRST page only', async () => {
    getDailyChallengeMock.mockReturnValue({
      dailyChallengeControllerGetHistory: async () => ({
        data: [
          {
            items: [
              {
                date: '2026-08-01T00:00:00.000Z',
                quizId: 'quiz-1',
                quizTitle: 'Solar System Trivia',
                slug: 'solar-system-trivia',
                difficulty: 'easy',
                score: 80,
                rank: 1,
              },
            ],
            pagination: {
              nextCursor: 'cursor-2',
              hasNextPage: true,
              limit: 1,
            },
          },
        ],
      }),
    })

    const result = await getDailyChallengeHistoryPage({ limit: 1 })
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') throw new Error('expected ok')
    expect(result.data.items).toHaveLength(1)
    expect(result.data.nextCursor).toBe('cursor-2')
    expect(result.data.hasNextPage).toBe(true)
  })

  it('(a) returns kind=error when the SDK throws', async () => {
    const thrown = new ApiError({
      isAxiosError: true,
      name: 'AxiosError',
      message: 'fail',
      code: 'CODE_500',
      config: undefined,
      request: undefined,
      response: {
        status: 500,
        data: { code: 'CODE_500', detail: 'fixture' },
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0])

    getDailyChallengeMock.mockReturnValue({
      dailyChallengeControllerGetHistory: async () => {
        throw thrown
      },
    })

    const result = await getDailyChallengeHistoryPage({ limit: 5 })
    expect(result.kind).toBe('error')
    if (result.kind !== 'error') throw new Error('expected error')
    expect(result.error.status).toBe(500)
  })
})

describe('daily-challenge.service — submitDailyChallengeAnswer', () => {
  it('(c) returns kind=ok with the narrowed answer view on success', async () => {
    getDailyChallengeMock.mockReturnValue({
      dailyChallengeControllerSubmitAnswer: async () => ({
        data: {
          correct: true,
          nextQuestionIndex: 1,
          totalQuestions: 5,
          completed: false,
          scorePercent: null,
        },
      }),
    })

    const result = await submitDailyChallengeAnswer({
      questionIndex: 0,
      selectedOptionId: 'opt-1',
    })
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') throw new Error('expected ok')
    expect(result.data).toEqual({
      correct: true,
      nextQuestionIndex: 1,
      totalQuestions: 5,
      completed: false,
      scorePercent: null,
    })
  })

  it('(c) returns kind=ok with scorePercent when completed=true', async () => {
    getDailyChallengeMock.mockReturnValue({
      dailyChallengeControllerSubmitAnswer: async () => ({
        data: {
          correct: true,
          nextQuestionIndex: 5,
          totalQuestions: 5,
          completed: true,
          scorePercent: 80,
        },
      }),
    })

    const result = await submitDailyChallengeAnswer({
      questionIndex: 4,
      selectedOptionId: 'opt-final',
    })
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') throw new Error('expected ok')
    expect(result.data.completed).toBe(true)
    expect(result.data.scorePercent).toBe(80)
  })

  it('(c) returns kind=error with the typed ApiError on 409', async () => {
    const thrown = new ApiError({
      isAxiosError: true,
      name: 'AxiosError',
      message: 'conflict',
      code: 'CODE_409',
      config: undefined,
      request: undefined,
      response: {
        status: 409,
        data: { code: 'CODE_409', detail: 'out of sync' },
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0])

    getDailyChallengeMock.mockReturnValue({
      dailyChallengeControllerSubmitAnswer: async () => {
        throw thrown
      },
    })

    const result = await submitDailyChallengeAnswer({
      questionIndex: 2,
      selectedOptionId: null,
    })
    expect(result.kind).toBe('error')
    if (result.kind !== 'error') throw new Error('expected error')
    expect(result.error.status).toBe(409)
  })
})