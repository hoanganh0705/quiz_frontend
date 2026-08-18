

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
cleanup,
fireEvent,
render,
screen,
waitFor,
} from '@testing-library/react';

import { ToastProvider } from '@/lib/forms/useToast';

import { AttemptResultPage } from '@/features/attempts/components/AttemptResultPage';
import type { AttemptResultDto } from '@/features/attempts/types/attempt-result.types';

const useAttemptResultMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('@/features/attempts/hooks/useAttemptResult', () => ({
useAttemptResult: () => useAttemptResultMock(),
}));

vi.mock('next/navigation', () => ({
useRouter: () => ({
push: pushMock,
replace: replaceMock,
  }),
}));

vi.mock('@/features/attempts/components/AttemptWriteReviewCta', () => ({
AttemptWriteReviewCta: () => (
<div data-testid='attempt-write-review-cta' />
  ),
}));

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

function makeApiError(status: number, code: string) {
return Object.assign(new Error('API error'), {
code,
isAxiosError: true,
toJSON: () => ({}),
name: 'AxiosError',
status,
response: { data: null, status },
message: 'API error',
config: {},
  });
}

function renderPage(props?: { attemptId?: string | null }) {
return render(
<ToastProvider>
<AttemptResultPage attemptId={props?.attemptId ?? 'a1'} />
</ToastProvider>,
  );
}

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
pushMock.mockReset();
replaceMock.mockReset();
});

describe('AttemptResultPage - runner handoff composition', () => {
it('renders score hero, breakdown, feedback, and review CTA in order on success', () => {
useAttemptResultMock.mockReturnValue({
result: makeResult(),
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });

renderPage();

expect(screen.getByTestId('attempt-result-page')).toBeInTheDocument();
expect(screen.getByTestId('attempt-score-hero')).toBeInTheDocument();
expect(screen.getByTestId('attempt-breakdown')).toBeInTheDocument();
expect(
screen.getAllByTestId('attempt-question-feedback').length,
    ).toBe(2);
expect(screen.getByTestId('attempt-write-review-cta')).toBeInTheDocument();
  });

it('renders the loading skeleton while the result query loads', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: true,
hasResolved: false,
error: null,
refresh: vi.fn(),
    });

renderPage();

expect(
screen.getByTestId('attempt-result-page-skeleton'),
    ).toBeInTheDocument();
  });

it('renders the empty-result fallback when the result is null', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });

renderPage();

expect(
screen.getByTestId('attempt-result-page-empty'),
    ).toBeInTheDocument();
  });
});

describe('AttemptResultPage - ATTEMPT_NOT_ACTIVE swap-on', () => {
it('renders the swap-on view without a toast for ATTEMPT_NOT_ACTIVE', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(403, 'ATTEMPT_NOT_ACTIVE'),
refresh: vi.fn(),
    });

renderPage();

expect(
screen.getByTestId('attempt-result-page-not-active'),
    ).toBeInTheDocument();
expect(pushMock).not.toHaveBeenCalled();
  });
});

describe('AttemptResultPage - redirect signals', () => {
it('toasts and redirects to /quizzes on ATTEMPT_NOT_FOUND', async () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(404, 'ATTEMPT_NOT_FOUND'),
refresh: vi.fn(),
    });

renderPage();

await waitFor(() => {
expect(
screen.getByTestId('attempt-result-page-redirecting'),
      ).toBeInTheDocument();
    });
await waitFor(() => {
expect(replaceMock).toHaveBeenCalledWith('/quizzes');
    });
  });

it('toasts and redirects to /quizzes on ATTEMPT_FORBIDDEN', async () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(403, 'ATTEMPT_FORBIDDEN'),
refresh: vi.fn(),
    });

renderPage();

await waitFor(() => {
expect(
screen.getByTestId('attempt-result-page-redirecting'),
      ).toBeInTheDocument();
    });
await waitFor(() => {
expect(replaceMock).toHaveBeenCalledWith('/quizzes');
    });
  });
});

describe('AttemptResultPage - ATTEMPT_VALIDATION_FAILED inline banner', () => {
it('renders the inline banner for ATTEMPT_VALIDATION_FAILED', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(422, 'ATTEMPT_VALIDATION_FAILED'),
refresh: vi.fn(),
    });

renderPage();

expect(
screen.getByTestId('attempt-result-page-validation'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('attempt-result-page-validation-body'),
    ).toHaveTextContent(
'You need to answer at least one question before completing the attempt.',
    );
  });

it('retry refreshes the result query', () => {
const refresh = vi.fn();
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(422, 'ATTEMPT_VALIDATION_FAILED'),
refresh,
    });

renderPage();

fireEvent.click(screen.getByTestId('attempt-result-page-retry'));
expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('AttemptResultPage - 429 and 5xx', () => {
it('renders the generic retry banner for 5xx', () => {
const refresh = vi.fn();
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
refresh,
    });

renderPage();

expect(screen.getByTestId('attempt-result-page-error')).toBeInTheDocument();
fireEvent.click(screen.getByTestId('attempt-result-page-error-retry'));
expect(refresh).toHaveBeenCalledTimes(1);
  });
});
