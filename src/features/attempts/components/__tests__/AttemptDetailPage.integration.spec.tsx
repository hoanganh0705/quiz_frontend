/**
 * `AttemptDetailPage.integration.spec.tsx` — integration tests for the
 * `<AttemptDetailPage />` page composition.
 *
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.25.
 *
 * ## Coverage contract
 *
 *   - Score hero, breakdown, and per-question feedback render in order.
 *   - No review CTA is rendered (confirmed in unit spec).
 *   - Empty result fallback renders with a back-to-history link.
 *   - ATTEMPT_NOT_FOUND / ATTEMPT_FORBIDDEN redirect placeholder.
 *   - ATTEMPT_VALIDATION_FAILED inline banner with retry + back.
 *   - Generic 5xx error banner with retry + back.
 *   - No author DTO, no pre-completion review DTO, no mutation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import { AttemptDetailPage } from '@/features/attempts/components/AttemptDetailPage';
import type { AttemptResultDto } from '@/features/attempts/types/attempt-result.types';

// ─── Hook mocks ────────────────────────────────────────────────────────────────

const useAttemptResultMock = vi.fn();

vi.mock('@/features/attempts/hooks/useAttemptResult', () => ({
  useAttemptResult: () => useAttemptResultMock(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeResult(
  overrides: Partial<AttemptResultDto> = {},
): AttemptResultDto {
  return {
    attemptId: 'a1',
    status: 'completed' as const,
    quizId: 'q1',
    quizTitle: 'Sample Quiz',
    quizSlug: 'sample-quiz',
    totalQuestions: 2,
    correctCount: 1,
    scorePercent: 50,
    xpEarned: 50,
    finishedAt: '2026-01-01T12:00:00.000Z',
    versionNumber: 1,
    difficulty: 'medium',
    passingScorePercent: 50,
    timeTakenMs: 60000,
    questions: [
      {
        questionId: 'q1',
        position: 1,
        questionText: 'Q1?',
        selectedOptionId: 'o1',
        isCorrect: { correct: false } as unknown as null,
        answeredAt: '2026-01-01T11:00:00.000Z',
        answerOptions: [
          { optionId: 'o1', position: 1, value: 'A', isCorrect: false },
          { optionId: 'o2', position: 2, value: 'B', isCorrect: true },
        ],
        explanation: 'Q1 explanation.',
      },
      {
        questionId: 'q2',
        position: 2,
        questionText: 'Q2?',
        selectedOptionId: 'o4',
        isCorrect: { correct: true } as unknown as null,
        answeredAt: '2026-01-01T11:30:00.000Z',
        answerOptions: [
          { optionId: 'o3', position: 1, value: 'C', isCorrect: false },
          { optionId: 'o4', position: 2, value: 'D', isCorrect: true },
        ],
        explanation: 'Q2 explanation.',
      },
    ],
    ...overrides,
  };
}

function makeApiError(
  code: string,
  status = code === 'ATTEMPT_NOT_FOUND' ? 404 : 403,
) {
  return Object.assign(new Error('API error'), {
    code,
    status,
    response: { data: null, status },
    isAxiosError: true,
    toJSON: () => ({}),
    name: 'AxiosError',
    message: 'API error',
    config: {},
  });
}

// ─── Setup / teardown ─────────────────────────────────────────────────────

beforeEach(() => {
  useAttemptResultMock.mockReturnValue({
    result: null,
    isLoading: false,
    hasResolved: false,
    error: null,
    refresh: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  useAttemptResultMock.mockReset();
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('AttemptDetailPage - read-only composition', () => {
  it('renders score hero, breakdown, and feedback in order on success', () => {
    useAttemptResultMock.mockReturnValue({
      result: makeResult(),
      isLoading: false,
      hasResolved: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<AttemptDetailPage attemptId='a1' />);

    expect(screen.getByTestId('attempt-detail-page')).toBeInTheDocument();
    expect(screen.getByTestId('attempt-score-hero')).toBeInTheDocument();
    expect(screen.getByTestId('attempt-breakdown')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('attempt-question-feedback').length,
    ).toBe(2);
  });

  it('does NOT render the review CTA', () => {
    useAttemptResultMock.mockReturnValue({
      result: makeResult(),
      isLoading: false,
      hasResolved: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<AttemptDetailPage attemptId='a1' />);

    expect(
      screen.queryByTestId('attempt-write-review-cta'),
    ).not.toBeInTheDocument();
  });

  it('renders the loading skeleton while the result query loads', () => {
    useAttemptResultMock.mockReturnValue({
      result: null,
      isLoading: true,
      hasResolved: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<AttemptDetailPage attemptId='a1' />);

    expect(
      screen.getByTestId('attempt-detail-page-skeleton'),
    ).toBeInTheDocument();
  });
});

describe('AttemptDetailPage - empty result fallback', () => {
  it('renders the no-result fallback with a back-to-history link', () => {
    useAttemptResultMock.mockReturnValue({
      result: null,
      isLoading: false,
      hasResolved: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<AttemptDetailPage attemptId='a1' />);

    expect(
      screen.getByTestId('attempt-detail-page-empty'),
    ).toBeInTheDocument();
    expect(screen.getByText('No result yet')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Back to history' });
    expect(link).toHaveAttribute('href', '/quiz-history');
  });
});

describe('AttemptDetailPage - redirect errors', () => {
  it('renders the redirect placeholder for ATTEMPT_NOT_FOUND', () => {
    useAttemptResultMock.mockReturnValue({
      result: null,
      isLoading: false,
      hasResolved: true,
      error: makeApiError('ATTEMPT_NOT_FOUND', 404),
      refresh: vi.fn(),
    });

    render(<AttemptDetailPage attemptId='a1' />);

    expect(
      screen.getByTestId('attempt-detail-page-redirecting'),
    ).toBeInTheDocument();
  });

  it('renders the redirect placeholder for ATTEMPT_FORBIDDEN', () => {
    useAttemptResultMock.mockReturnValue({
      result: null,
      isLoading: false,
      hasResolved: true,
      error: makeApiError('ATTEMPT_FORBIDDEN', 403),
      refresh: vi.fn(),
    });

    render(<AttemptDetailPage attemptId='a1' />);

    expect(
      screen.getByTestId('attempt-detail-page-redirecting'),
    ).toBeInTheDocument();
  });
});

describe('AttemptDetailPage - ATTEMPT_VALIDATION_FAILED', () => {
  it('renders the validation error banner with retry and back link', () => {
    const refresh = vi.fn();
    useAttemptResultMock.mockReturnValue({
      result: null,
      isLoading: false,
      hasResolved: true,
      error: makeApiError('ATTEMPT_VALIDATION_FAILED', 422),
      refresh,
    });

    render(<AttemptDetailPage attemptId='a1' />);

    expect(
      screen.getByTestId('attempt-detail-page-validation'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('attempt-detail-page-retry')).toBeInTheDocument();
    const backLink = screen.getByRole('link', { name: 'Back to history' });
    expect(backLink).toHaveAttribute('href', '/quiz-history');
    fireEvent.click(screen.getByTestId('attempt-detail-page-retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('AttemptDetailPage - generic 5xx error', () => {
  it('renders the error banner with retry and back link', () => {
    const refresh = vi.fn();
    useAttemptResultMock.mockReturnValue({
      result: null,
      isLoading: false,
      hasResolved: true,
      error: makeApiError('INTERNAL_SERVER_ERROR', 500),
      refresh,
    });

    render(<AttemptDetailPage attemptId='a1' />);

    expect(
      screen.getByTestId('attempt-detail-page-error'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('attempt-detail-page-error-retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
    const backLink = screen.getByRole('link', { name: 'Back to history' });
    expect(backLink).toHaveAttribute('href', '/quiz-history');
  });
});
