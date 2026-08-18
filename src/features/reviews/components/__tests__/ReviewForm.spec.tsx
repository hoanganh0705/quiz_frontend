

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ReviewForm } from '@/features/reviews/components/ReviewForm';

const useReviewGateMock = vi.fn();
const useCreateReviewMock = vi.fn();

vi.mock('@/features/reviews/hooks/useReviewGate', () => ({
useReviewGate: (params: unknown) => useReviewGateMock(params),
}));

vi.mock('@/features/reviews/hooks/useCreateReview', () => ({
useCreateReview: (quizId: unknown) => useCreateReviewMock(quizId),
}));

vi.mock('@/features/reviews/components/ReviewEditInline', () => ({
ReviewEditInline: ({
review,
onDeleted,
  }: {
review: { reviewId: string };
onDeleted?: () => void;
  }) => (
<div data-testid={`review-edit-inline-${review.reviewId}`}>
<button type='button' onClick={onDeleted}>notify-deleted</button>
</div>
  ),
}));

const QUIZ_ID = 'quiz-1';

function setGate(state: { kind: string; [k: string]: unknown }): void {
useReviewGateMock.mockReturnValue({
state,
isLoading: state.kind === 'loading',
revalidate: vi.fn().mockResolvedValue(undefined),
  });
}

function setCreateReview(opts: {
submit: ReturnType<typeof vi.fn>;
isLoading?: boolean;
error?: unknown;
lastOutcome?: unknown;
reset?: () => void;
}): void {
useCreateReviewMock.mockReturnValue({
submit: opts.submit,
isLoading: opts.isLoading ?? false,
error: opts.error ?? null,
lastOutcome: opts.lastOutcome ?? null,
reset: opts.reset ?? vi.fn(),
  });
}

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
vi.clearAllMocks();
});

describe('ReviewForm — gate branches render exclusively', () => {
it('renders the loading skeleton while the gate is loading', () => {
setGate({ kind: 'loading' });
setCreateReview({ submit: vi.fn() });

render(<ReviewForm quizId={QUIZ_ID} />);

expect(screen.getByTestId('review-form-skeleton')).toBeInTheDocument();
expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
expect(screen.queryByTestId('review-form-signin')).not.toBeInTheDocument();
  });

it('renders the sign-in prompt for `unauthenticated`', () => {
setGate({ kind: 'unauthenticated' });
setCreateReview({ submit: vi.fn() });

render(<ReviewForm quizId={QUIZ_ID} />);

expect(screen.getByTestId('review-form-signin')).toBeInTheDocument();
expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

it('renders the gate notice for `attempt-required`', () => {
setGate({ kind: 'attempt-required' });
setCreateReview({ submit: vi.fn() });

render(<ReviewForm quizId={QUIZ_ID} />);

expect(screen.getByTestId('review-gate-state')).toBeInTheDocument();
expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

it('renders `ReviewEditInline` for `existing-review` and omits the create form', () => {
setGate({
kind: 'existing-review',
review: { reviewId: 'r-1', rating: 5, comment: 'great' },
    });
setCreateReview({ submit: vi.fn() });

render(<ReviewForm quizId={QUIZ_ID} />);

expect(screen.getByTestId('review-edit-inline-r-1')).toBeInTheDocument();
expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

it('renders the create form for `eligible`', () => {
setGate({ kind: 'eligible' });
setCreateReview({ submit: vi.fn() });

render(<ReviewForm quizId={QUIZ_ID} />);

expect(screen.getByTestId('review-form')).toBeInTheDocument();
expect(screen.getByTestId('review-form-submit')).toBeInTheDocument();
  });

it('renders the error banner for `error`', () => {
setGate({ kind: 'error', error: new Error('5xx') });
setCreateReview({ submit: vi.fn() });

render(<ReviewForm quizId={QUIZ_ID} />);

expect(screen.getByTestId('review-form-error')).toBeInTheDocument();
expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });
});

describe('ReviewForm — client validation', () => {
it('disables submit when rating is missing', async () => {
const submit = vi.fn().mockResolvedValue(true);
setGate({ kind: 'eligible' });
setCreateReview({ submit });

render(<ReviewForm quizId={QUIZ_ID} />);

fireEvent.change(screen.getByTestId('review-form-comment'), {
target: { value: 'A meaningful review' },
    });
const button = screen.getByTestId('review-form-submit') as HTMLButtonElement;
expect(button.disabled).toBe(true);
fireEvent.click(button);
expect(submit).not.toHaveBeenCalled();
  });

it('disables submit when comment is empty', async () => {
const submit = vi.fn().mockResolvedValue(true);
setGate({ kind: 'eligible' });
setCreateReview({ submit });

render(<ReviewForm quizId={QUIZ_ID} />);

fireEvent.click(screen.getByRole('radio', { name: '3 stars' }));
const button = screen.getByTestId('review-form-submit') as HTMLButtonElement;
expect(button.disabled).toBe(true);
fireEvent.click(button);
expect(submit).not.toHaveBeenCalled();
  });

it('disables submit when comment is whitespace-only', async () => {
const submit = vi.fn().mockResolvedValue(true);
setGate({ kind: 'eligible' });
setCreateReview({ submit });

render(<ReviewForm quizId={QUIZ_ID} />);

fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));
fireEvent.change(screen.getByTestId('review-form-comment'), {
target: { value: '     ' },
    });
const button = screen.getByTestId('review-form-submit') as HTMLButtonElement;
expect(button.disabled).toBe(true);
fireEvent.click(button);
expect(submit).not.toHaveBeenCalled();
  });
});

describe('ReviewForm — happy path', () => {
it('submits exactly once with the parsed payload when valid', async () => {
const submit = vi.fn().mockResolvedValue(true);
setGate({ kind: 'eligible' });
setCreateReview({ submit });

render(<ReviewForm quizId={QUIZ_ID} />);

fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
fireEvent.change(screen.getByTestId('review-form-comment'), {
target: { value: '  Great quiz, learned a lot.  ' },
    });
fireEvent.click(screen.getByTestId('review-form-submit'));

await waitFor(() => {
expect(submit).toHaveBeenCalledTimes(1);
    });
expect(submit).toHaveBeenCalledWith({
rating: 5,
comment: 'Great quiz, learned a lot.',
    });
  });
});

describe('ReviewForm — race outcome handling', () => {
it('shows the gate notice after `attempt-required` outcome', () => {
setGate({ kind: 'eligible' });
setCreateReview({
submit: vi.fn(),
lastOutcome: { kind: 'attempt-required', cause: null },
    });

render(<ReviewForm quizId={QUIZ_ID} />);

expect(screen.getByTestId('review-gate-state')).toBeInTheDocument();
  });

it('retains the draft when a 5xx outcome arrives', () => {
setGate({ kind: 'eligible' });
setCreateReview({
submit: vi.fn(),
lastOutcome: { kind: 'reverted', cause: null },
    });

render(<ReviewForm quizId={QUIZ_ID} />);

fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));
fireEvent.change(screen.getByTestId('review-form-comment'), {
target: { value: 'Persisted draft text' },
    });

expect(screen.getByTestId('review-form')).toBeInTheDocument();
expect((screen.getByTestId('review-form-comment') as HTMLTextAreaElement).value)
      .toBe('Persisted draft text');
expect(screen.getByTestId('review-form-submit-error')).toBeInTheDocument();
  });
});