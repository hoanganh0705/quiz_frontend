

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AttemptDetailPage } from '@/features/attempts/components/AttemptDetailPage';
import type { AttemptResultDto } from '@/features/attempts/types/attempt-result.types';

const useAttemptResultMock = vi.fn();

vi.mock(
'@/features/attempts/hooks/useAttemptResult',
() => ({
useAttemptResult: (...args: unknown[]) =>
useAttemptResultMock(...args),
  }),
);

afterEach(() => {
cleanup();
useAttemptResultMock.mockReset();
});

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
questionText: 'What is 2+2?',
selectedOptionId: 'o1',
isCorrect: { correct: false } as unknown as null,
answeredAt: '2026-01-01T11:00:00.000Z',
answerOptions: [
{ optionId: 'o1', position: 1, value: '3', isCorrect: false },
{ optionId: 'o2', position: 2, value: '4', isCorrect: true },
        ],
explanation: '2+2 always equals 4.',
      },
{
questionId: 'q2',
position: 2,
questionText: 'What is 3+3?',
selectedOptionId: 'o4',
isCorrect: { correct: true } as unknown as null,
answeredAt: '2026-01-01T11:30:00.000Z',
answerOptions: [
{ optionId: 'o3', position: 1, value: '5', isCorrect: false },
{ optionId: 'o4', position: 2, value: '6', isCorrect: true },
        ],
explanation: '3+3 always equals 6.',
      },
    ],
...overrides,
  };
}

function makeApiError(code: string) {
return Object.assign(new Error('API error'), {
code,
isAxiosError: true,
toJSON: () => ({}),
name: 'AxiosError',
status: code === 'ATTEMPT_NOT_FOUND' ? 404 : 403,
response: { data: null, status: code === 'ATTEMPT_NOT_FOUND' ? 404 : 403 },
message: 'API error',
config: {},
  });
}

describe('AttemptDetailPage — loading skeleton', () => {
it('renders the skeleton while loading', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: true,
hasResolved: false,
error: null,
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId="a1" />);
expect(
screen.getByTestId('attempt-detail-page-skeleton'),
    ).toBeInTheDocument();
  });

it('renders the skeleton when attemptId is null', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId={null} />);
expect(
screen.getByTestId('attempt-detail-page-skeleton'),
    ).toBeInTheDocument();
  });
});

describe('AttemptDetailPage — success', () => {
it('renders the score hero, breakdown, and feedback in order', () => {
useAttemptResultMock.mockReturnValue({
result: makeResult(),
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId="a1" />);
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
render(<AttemptDetailPage attemptId="a1" />);
expect(
screen.queryByTestId('attempt-write-review-cta'),
    ).not.toBeInTheDocument();
  });
});

describe('AttemptDetailPage — empty result', () => {
it('renders the no-result fallback', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId="a1" />);
expect(screen.getByTestId('attempt-detail-page-empty')).toBeInTheDocument();
expect(screen.getByText('No result yet')).toBeInTheDocument();
  });

it('renders a back-to-history link in the empty state', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId="a1" />);
const link = screen.getByRole('link', { name: 'Back to history' });
expect(link).toHaveAttribute('href', '/quiz-history');
  });
});

describe('AttemptDetailPage — ATTEMPT_NOT_FOUND', () => {
it('renders the redirecting placeholder', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError('ATTEMPT_NOT_FOUND'),
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId="a1" />);
expect(
screen.getByTestId('attempt-detail-page-redirecting'),
    ).toBeInTheDocument();
  });
});

describe('AttemptDetailPage — ATTEMPT_FORBIDDEN', () => {
it('renders the redirecting placeholder', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError('ATTEMPT_FORBIDDEN'),
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId="a1" />);
expect(
screen.getByTestId('attempt-detail-page-redirecting'),
    ).toBeInTheDocument();
  });
});

describe('AttemptDetailPage — ATTEMPT_VALIDATION_FAILED', () => {
it('renders the validation error banner', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError('ATTEMPT_VALIDATION_FAILED'),
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId="a1" />);
expect(
screen.getByTestId('attempt-detail-page-validation'),
    ).toBeInTheDocument();
  });

it('renders retry and back-to-history buttons', () => {
const refreshMock = vi.fn();
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError('ATTEMPT_VALIDATION_FAILED'),
refresh: refreshMock,
    });
render(<AttemptDetailPage attemptId="a1" />);
expect(screen.getByTestId('attempt-detail-page-retry')).toBeInTheDocument();
const backLink = screen.getByRole('link', { name: 'Back to history' });
expect(backLink).toHaveAttribute('href', '/quiz-history');
fireEvent.click(screen.getByTestId('attempt-detail-page-retry'));
expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});

describe('AttemptDetailPage — generic 5xx error', () => {
it('renders the error banner', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError('INTERNAL_SERVER_ERROR'),
refresh: vi.fn(),
    });
render(<AttemptDetailPage attemptId="a1" />);
expect(screen.getByTestId('attempt-detail-page-error')).toBeInTheDocument();
  });

it('renders retry and back-to-history buttons and calls refresh', () => {
const refreshMock = vi.fn();
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError('INTERNAL_SERVER_ERROR'),
refresh: refreshMock,
    });
render(<AttemptDetailPage attemptId="a1" />);
const retryBtn = screen.getByTestId('attempt-detail-page-error-retry');
expect(retryBtn).toBeInTheDocument();
fireEvent.click(retryBtn);
expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
