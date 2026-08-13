/**
 * `DailyChallengePlaySurface.spec.tsx` — locks the in-page question
 * surface (step4-play).
 *
 * Cases per the ticket's testing checklist:
 *
 *   (1) Renders a `region` landmark with
 *       `aria-label="Daily challenge question"` and a stable
 *       `data-testid="daily-challenge-play-surface"`.
 *   (2) Renders the current question text and option buttons; the
 *       selected option announces `aria-pressed="true"`.
 *   (3) Clicking "Submit" calls the play hook's `submitAnswer`
 *       exactly once with the selected option id.
 *   (4) When the play hook reports `status=completed`, the recap
 *       panel renders with the `finalScore` and the XP reward.
 *
 * The mock uses `vi.hoisted` so each test can swap the play-hook
 * return value via `mockReturnValue` without re-importing the
 * component (which would defeat the `vi.mock` factory).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const { useDailyChallengePlayMock } = vi.hoisted(() => ({
  useDailyChallengePlayMock: vi.fn(),
}))

vi.mock(
  '@/features/daily-challenge/hooks/useDailyChallengePlay',
  () => ({
    useDailyChallengePlay: useDailyChallengePlayMock,
  }),
)

import { DailyChallengePlaySurface } from '@/features/daily-challenge/components/DailyChallengePlaySurface'

function idleReturn() {
  return {
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
    ],
    currentIndex: 0,
    totalQuestions: 1,
    status: 'idle',
    lastRevealCorrect: null,
    finalScore: null,
    lastError: null,
    isQuizLoading: false,
    submitAnswer: vi.fn(),
    advance: vi.fn(),
    reset: vi.fn(),
  }
}

function completedReturn() {
  return {
    questions: [],
    currentIndex: 1,
    totalQuestions: 1,
    status: 'completed',
    lastRevealCorrect: true,
    finalScore: 100,
    lastError: null,
    isQuizLoading: false,
    submitAnswer: vi.fn(),
    advance: vi.fn(),
    reset: vi.fn(),
  }
}

beforeEach(() => {
  useDailyChallengePlayMock.mockReset()
  useDailyChallengePlayMock.mockReturnValue(idleReturn())
})

afterEach(() => {
  cleanup()
})

describe('DailyChallengePlaySurface — render', () => {
  it('(1) renders with role="region" and aria-label="Daily challenge question"', () => {
    render(
      <DailyChallengePlaySurface
        quizId='quiz-1'
        totalQuestions={1}
        rewardXp={100}
      />,
    )
    const surface = screen.getByTestId('daily-challenge-play-surface')
    expect(surface).toHaveAttribute('role', 'region')
    expect(surface).toHaveAttribute(
      'aria-label',
      'Daily challenge question',
    )
  })

  it('(2) renders the current question text and option buttons; selected option is announced', () => {
    render(
      <DailyChallengePlaySurface
        quizId='quiz-1'
        totalQuestions={1}
        rewardXp={100}
      />,
    )
    expect(
      screen.getByText('Which planet is closest to the Sun?'),
    ).toBeInTheDocument()

    const options = screen.getAllByTestId('daily-challenge-play-option')
    expect(options).toHaveLength(2)

    fireEvent.click(options[0] as HTMLElement)
    expect(options[0]).toHaveAttribute('aria-checked', 'true')
    expect(options[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('(3) clicking Submit calls the play hook submitAnswer exactly once with the selected option id', () => {
    const submitAnswer = vi.fn()
    useDailyChallengePlayMock.mockReturnValue({
      ...idleReturn(),
      submitAnswer,
    })
    render(
      <DailyChallengePlaySurface
        quizId='quiz-1'
        totalQuestions={1}
        rewardXp={100}
      />,
    )

    fireEvent.click(
      screen.getAllByTestId('daily-challenge-play-option')[0] as HTMLElement,
    )
    fireEvent.click(screen.getByTestId('daily-challenge-play-submit'))

    expect(submitAnswer).toHaveBeenCalledTimes(1)
    expect(submitAnswer).toHaveBeenCalledWith('opt-a')
  })

  it('(4) renders the recap panel when the play hook reports status=completed', () => {
    useDailyChallengePlayMock.mockReturnValue(completedReturn())
    render(
      <DailyChallengePlaySurface
        quizId='quiz-1'
        totalQuestions={1}
        rewardXp={100}
      />,
    )
    expect(
      screen.getByTestId('daily-challenge-play-completion'),
    ).toHaveTextContent(/You scored 100%/)
    expect(
      screen.getByTestId('daily-challenge-play-completion'),
    ).toHaveTextContent(/\+100 XP/)
  })
})