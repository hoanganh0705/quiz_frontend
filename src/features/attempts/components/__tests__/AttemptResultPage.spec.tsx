

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
cleanup,
fireEvent,
render,
screen,
waitFor,
} from '@testing-library/react';

import { ToastProvider } from '@/lib/forms/useToast';
import { ApiError } from '@/lib/api';

import { AttemptResultPage } from '@/features/attempts/components/AttemptResultPage';

const useAttemptResultMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('@/features/attempts/hooks/useAttemptResult', () => ({
useAttemptResult: (params: unknown) => useAttemptResultMock(params),
}));

vi.mock('next/navigation', () => ({
useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock('@/features/attempts/components/AttemptWriteReviewCta', () => ({
AttemptWriteReviewCta: () => <div data-testid="attempt-write-review-cta" />,
}));

afterEach(() => {
cleanup();
useAttemptResultMock.mockReset();
pushMock.mockReset();
replaceMock.mockReset();
});

function renderWithToast(ui: React.ReactElement): React.ReactElement {
return <ToastProvider>{ui}</ToastProvider>;
}

function makeApiError(
status: number,
code: string,
message: string,
): ApiError {
return new ApiError({
name: 'AxiosError',
message,
isAxiosError: true,
response: {
status,
statusText: 'X',
data: {
type: 'https://api.quiz.local/problems/x',
title: 'X',
status,
detail: message,
instance: '/api/v1/x',
extensions: { code, requestId: 'req-test' },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('AttemptResultPage — loading / empty', () => {
it('renders the loading skeleton while the query is in flight', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: true,
hasResolved: false,
error: null,
refresh: vi.fn(),
    });

render(renderWithToast(<AttemptResultPage attemptId="a1" />));
expect(
screen.getByTestId('attempt-result-page-skeleton'),
    ).toBeInTheDocument();
  });

it('renders the empty-result fallback when the result resolves to null', async () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });

render(renderWithToast(<AttemptResultPage attemptId="a1" />));
expect(
screen.getByTestId('attempt-result-page-empty'),
    ).toBeInTheDocument();
  });

it('invokes the onNoResult callback when the result resolves to null', async () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });

const onNoResult = vi.fn();
render(
renderWithToast(
<AttemptResultPage attemptId="a1" onNoResult={onNoResult} />,
      ),
    );
await waitFor(() => expect(onNoResult).toHaveBeenCalledTimes(1));
  });
});

describe('AttemptResultPage — typed errors', () => {
it('renders the swap-on view for ATTEMPT_NOT_ACTIVE without a toast', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(403, 'ATTEMPT_NOT_ACTIVE', 'Not active'),
refresh: vi.fn(),
    });

render(renderWithToast(<AttemptResultPage attemptId="a1" />));
expect(
screen.getByTestId('attempt-result-page-not-active'),
    ).toBeInTheDocument();
expect(pushMock).not.toHaveBeenCalled();
  });

it('renders the inline banner for ATTEMPT_VALIDATION_FAILED', () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(422, 'ATTEMPT_VALIDATION_FAILED', 'Submit at least one answer'),
refresh: vi.fn(),
    });

render(renderWithToast(<AttemptResultPage attemptId="a1" />));
expect(
screen.getByTestId('attempt-result-page-validation'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('attempt-result-page-validation-body'),
    ).toHaveTextContent(
'You need to answer at least one question before completing the attempt.',
    );
  });

it('renders the redirect placeholder for ATTEMPT_NOT_FOUND', async () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(404, 'ATTEMPT_NOT_FOUND', 'Not found'),
refresh: vi.fn(),
    });

render(renderWithToast(<AttemptResultPage attemptId="a1" />));

await waitFor(() => {
expect(screen.getByTestId('attempt-result-page-redirecting')).toBeInTheDocument();
    });
await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/quizzes'));
  });

it('renders the redirect placeholder for ATTEMPT_FORBIDDEN', async () => {
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(403, 'ATTEMPT_FORBIDDEN', 'Forbidden'),
refresh: vi.fn(),
    });

render(renderWithToast(<AttemptResultPage attemptId="a1" />));

await waitFor(() => {
expect(screen.getByTestId('attempt-result-page-redirecting')).toBeInTheDocument();
    });
await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/quizzes'));
  });

it('renders the generic retry banner for GLOBAL_INTERNAL_ERROR', () => {
const refresh = vi.fn();
useAttemptResultMock.mockReturnValue({
result: null,
isLoading: false,
hasResolved: true,
error: makeApiError(500, 'GLOBAL_INTERNAL_ERROR', 'Server error'),
refresh,
    });

render(renderWithToast(<AttemptResultPage attemptId="a1" />));
expect(
screen.getByTestId('attempt-result-page-error'),
    ).toBeInTheDocument();
fireEvent.click(screen.getByTestId('attempt-result-page-error-retry'));
expect(refresh).toHaveBeenCalled();
  });
});

describe('AttemptResultPage — success', () => {
it('renders the hero, breakdown, feedback, and review CTA in order', () => {
const result = {
attemptId: 'a1',
quizId: 'q1',
quizTitle: 'Sample quiz',
quizSlug: 'sample-quiz',
totalQuestions: 2,
correctCount: 2,
scorePercent: 100,
xpEarned: 200,
finishedAt: '2026-01-01T00:00:00.000Z',
questions: [
{
questionId: 'q1',
position: 1,
questionText: 'Q1',
imageUrl: null,
selectedOptionId: 'opt-1',
isCorrect: { value: true },
timeTakenMs: null,
answeredAt: '2026-01-01T00:00:00.000Z',
answerOptions: [
{ optionId: 'opt-1', text: 'A', isCorrect: true },
          ],
explanation: 'Because A is correct.',
topicTags: null,
difficulty: null,
        },
{
questionId: 'q2',
position: 2,
questionText: 'Q2',
imageUrl: null,
selectedOptionId: 'opt-1',
isCorrect: { value: true },
timeTakenMs: null,
answeredAt: '2026-01-01T00:00:00.000Z',
answerOptions: [
{ optionId: 'opt-1', text: 'A', isCorrect: true },
          ],
explanation: null,
topicTags: null,
difficulty: null,
        },
      ],
    };

useAttemptResultMock.mockReturnValue({
result,
isLoading: false,
hasResolved: true,
error: null,
refresh: vi.fn(),
    });

render(renderWithToast(<AttemptResultPage attemptId="a1" />));
expect(screen.getByTestId('attempt-result-page')).toBeInTheDocument();
expect(screen.getByTestId('attempt-score-hero')).toBeInTheDocument();
expect(screen.getByTestId('attempt-breakdown')).toBeInTheDocument();
expect(screen.getByTestId('attempt-question-feedback')).toBeInTheDocument();
expect(screen.getByTestId('attempt-write-review-cta')).toBeInTheDocument();
  });
});