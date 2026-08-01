/**
 * `quiz-player-view.spec.ts` — locks the player-view projection contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.A3.
 *
 * Six cases per the ticket AC #1–6:
 *
 *   (a) Already-safe player payload projects without emitting an
 *       observability event.
 *   (b) Malicious / contract-broken option containing `isCorrect`
 *       is stripped to the player-safe output AND a single
 *       `captureException` call is emitted with tags and quizId.
 *   (c) Deep input equality before / after projection — input is
 *       not mutated.
 *   (d) Shuffled questions and shuffled options are emitted in
 *       ascending `position` order.
 *   (e) Null / missing published version normalizes to a safe
 *       empty `questions` array without synthesizing author data.
 *   (f) Null / missing questions normalizes to an empty list.
 *
 * The projection module is pure; no SWR / jsdom setup is needed.
 * The vitest node project picks this file up because it lives
 * under the src tree as a spec file.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as sentryCapture from '@/lib/observability/sentry-capture'
import {
  CAPTURE_REASONS,
  CAPTURE_SURFACES,
} from '@/lib/observability/sentry-capture'

import type { QuizResponseDto } from '@/lib/api/generated/schemas/quizResponseDto'
import {
  projectQuizToPlayerView,
} from '@/features/quizzes/lib/quiz-player-view'

function makeBaseQuizResponse(): QuizResponseDto {
  return {
    quizId: '0192d2b0-7c1a-7abc-9aaa-000000000abc',
    creatorId: '0192d2b0-7c1a-7abc-9aaa-000000000bbb',
    title: 'World Capitals',
    description: 'A short quiz about capitals.',
    slug: 'world-capitals',
    requirements: null,
    imageUrl: null,
    categoryId: '0192d2b0-7c1a-7abc-9aaa-000000000ccc',
    isFeatured: false,
    isHidden: false,
    isVerified: true,
    publishedVersionId: '0192d2b0-7c1a-7abc-9aaa-000000000ddd',
    publishedVersion: {
      quizVersionId: '0192d2b0-7c1a-7abc-9aaa-000000000ddd',
      quizId: '0192d2b0-7c1a-7abc-9aaa-000000000abc',
      versionNumber: 1,
      status: 'published',
      difficulty: 'medium',
      durationMs: 60_000,
      passingScorePercent: 70,
      rewardXp: 50,
      creatorId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      publishedAt: '2026-01-02T00:00:00.000Z',
      archivedAt: null,
      updatedAt: '2026-01-02T00:00:00.000Z',
      questions: [],
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    tags: [],
  }
}

function makeSafeQuestion(position: number) {
  return {
    questionId: `q-${position}`,
    quizVersionId: '0192d2b0-7c1a-7abc-9aaa-000000000ddd',
    position,
    questionText: `Question ${position}?`,
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    answerOptions: [
      {
        optionId: `o-${position}-a`,
        position: 1,
        value: 'A',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        optionId: `o-${position}-b`,
        position: 2,
        value: 'B',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }
}

beforeEach(() => {
  captureExceptionSpy = vi
    .spyOn(sentryCapture, 'captureException')
    .mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

let captureExceptionSpy: ReturnType<typeof vi.spyOn>

describe('projectQuizToPlayerView — safe payload', () => {
  it('returns a player-safe shape and does not emit any observability event', () => {
    const quiz = makeBaseQuizResponse()
    quiz.publishedVersion = {
      ...quiz.publishedVersion!,
      questions: [makeSafeQuestion(1), makeSafeQuestion(2)],
    } as unknown as typeof quiz.publishedVersion

    const projected = projectQuizToPlayerView(quiz)

    expect(projected.quizId).toBe(quiz.quizId)
    expect(projected.publishedVersion).not.toBeNull()
    expect(projected.publishedVersion?.questions).toHaveLength(2)
    for (const question of projected.publishedVersion?.questions ?? []) {
      for (const option of question.answerOptions) {
        expect(
          Object.prototype.hasOwnProperty.call(option, 'isCorrect'),
        ).toBe(false)
      }
    }
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })
})

describe('projectQuizToPlayerView — isCorrect leak', () => {
  it('strips isCorrect from a contract-broken option and emits a single capture event', () => {
    const quiz = makeBaseQuizResponse()
    const brokenQuestion = makeSafeQuestion(1)
    const brokenOption = {
      ...brokenQuestion.answerOptions[0],
      // Malicious backend regression: an answer option leaked onto
      // the public detail endpoint.
      isCorrect: true,
    }
    quiz.publishedVersion = {
      ...quiz.publishedVersion!,
      questions: [
        {
          ...brokenQuestion,
          answerOptions: [brokenOption, brokenQuestion.answerOptions[1]],
        },
      ],
    } as unknown as typeof quiz.publishedVersion

    const projected = projectQuizToPlayerView(quiz)

    const firstOption = projected.publishedVersion?.questions[0]
      .answerOptions[0]
    expect(firstOption).toBeDefined()
    expect(
      Object.prototype.hasOwnProperty.call(firstOption, 'isCorrect'),
    ).toBe(false)
    expect(firstOption).toMatchObject({
      optionId: brokenOption.optionId,
      position: brokenOption.position,
      value: brokenOption.value,
    })

    expect(captureExceptionSpy).toHaveBeenCalledTimes(1)
    const call = captureExceptionSpy.mock.calls[0]
    expect(call?.[1]).toEqual({
      tags: {
        surface: CAPTURE_SURFACES.useQuizByIdOrSlug,
        reason: CAPTURE_REASONS.isCorrectLeak,
      },
      contexts: {
        quizId: quiz.quizId,
        optionId: brokenOption.optionId,
      },
    })
  })

  it('emits one event per corrupted option, not per question', () => {
    const quiz = makeBaseQuizResponse()
    const q1 = makeSafeQuestion(1)
    const q2 = makeSafeQuestion(2)
    const broken1 = {
      ...q1.answerOptions[0],
      isCorrect: false,
    }
    const broken2 = {
      ...q2.answerOptions[1],
      isCorrect: true,
    }
    quiz.publishedVersion = {
      ...quiz.publishedVersion!,
      questions: [
        { ...q1, answerOptions: [broken1, q1.answerOptions[1]] },
        { ...q2, answerOptions: [q2.answerOptions[0], broken2] },
      ],
    } as unknown as typeof quiz.publishedVersion

    projectQuizToPlayerView(quiz)

    expect(captureExceptionSpy).toHaveBeenCalledTimes(2)
  })
})

describe('projectQuizToPlayerView — input immutability', () => {
  it('does not mutate the input DTO, the published version, or any nested array', () => {
    const quiz = makeBaseQuizResponse()
    const question = makeSafeQuestion(1)
    quiz.publishedVersion = {
      ...quiz.publishedVersion!,
      questions: [question],
    } as unknown as typeof quiz.publishedVersion
    const snapshot = JSON.parse(JSON.stringify(quiz))

    const projected = projectQuizToPlayerView(quiz)

    expect(quiz).toEqual(snapshot)
    expect(quiz.publishedVersion?.questions).toHaveLength(1)
    expect(
      quiz.publishedVersion?.questions?.[0].answerOptions,
    ).toHaveLength(2)
    expect(projected.publishedVersion).not.toBe(quiz.publishedVersion)
    expect(projected.publishedVersion?.questions).not.toBe(
      quiz.publishedVersion?.questions,
    )
  })
})

describe('projectQuizToPlayerView — ordering', () => {
  it('emits questions and options sorted ascending by position even when the input is shuffled', () => {
    const quiz = makeBaseQuizResponse()
    const q3 = makeSafeQuestion(3)
    const q1 = makeSafeQuestion(1)
    const q2 = makeSafeQuestion(2)
    // Reverse-order questions and reverse-order options within q2.
    const q2Reversed = {
      ...q2,
      answerOptions: [q2.answerOptions[1], q2.answerOptions[0]],
    }
    quiz.publishedVersion = {
      ...quiz.publishedVersion!,
      questions: [q3, q1, q2Reversed],
    } as unknown as typeof quiz.publishedVersion

    const projected = projectQuizToPlayerView(quiz)

    expect(
      projected.publishedVersion?.questions.map((q) => q.position),
    ).toEqual([1, 2, 3])
    const question2 = projected.publishedVersion?.questions[1]
    expect(question2?.answerOptions.map((o) => o.position)).toEqual([1, 2])
  })
})

describe('projectQuizToPlayerView — empty / null boundaries', () => {
  it('returns a quiz with `publishedVersion: null` when the input has no published version', () => {
    const quiz = makeBaseQuizResponse()
    quiz.publishedVersion = null
    quiz.publishedVersionId = null

    const projected = projectQuizToPlayerView(quiz)

    expect(projected.publishedVersion).toBeNull()
    expect(projected.publishedVersionId).toBeNull()
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })

  it('returns an empty question list when the published version has null questions', () => {
    const quiz = makeBaseQuizResponse()
    quiz.publishedVersion = {
      ...quiz.publishedVersion!,
      questions: null,
    } as unknown as typeof quiz.publishedVersion

    const projected = projectQuizToPlayerView(quiz)

    expect(projected.publishedVersion).not.toBeNull()
    expect(projected.publishedVersion?.questions).toEqual([])
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })

  it('returns an empty question list when the published version has no questions array', () => {
    const quiz = makeBaseQuizResponse()
    quiz.publishedVersion = {
      ...quiz.publishedVersion!,
      questions: [],
    } as unknown as typeof quiz.publishedVersion

    const projected = projectQuizToPlayerView(quiz)

    expect(projected.publishedVersion?.questions).toEqual([])
    expect(captureExceptionSpy).not.toHaveBeenCalled()
  })
})
