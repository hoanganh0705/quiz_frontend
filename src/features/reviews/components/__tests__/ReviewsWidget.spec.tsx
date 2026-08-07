/**
 * `ReviewsWidget.spec.tsx` — RTL smoke tests for the Story 4.13
 * widget composition.
 *
 * Source epic:   Epic 4.13.
 * Source ticket: T-4.13.19.
 *
 * Verifies:
 *  - Public viewer sees the list but no write controls.
 *  - Authenticated viewer sees the gated form.
 *  - Section heading reads "Reviews".
 *  - No admin / moderation surface is imported.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReviewsWidget } from '@/features/reviews/components/ReviewsWidget';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const useAuthSessionMock = vi.fn();
const useMyQuizReviewMock = vi.fn();

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

vi.mock('@/features/reviews/hooks/useMyQuizReview', () => ({
  useMyQuizReview: (params: unknown) => useMyQuizReviewMock(params),
}));

// Stub the heavyweight children so the test focuses on the
// widget's composition.
vi.mock('@/features/reviews/components/ReviewForm', () => ({
  ReviewForm: () => <div data-testid='review-form-stub' />,
}));

vi.mock('@/features/reviews/components/ReviewsList', () => ({
  ReviewsList: ({
    quizId,
    currentUserId,
  }: {
    quizId: string;
    currentUserId: string | null;
  }) => (
    <div
      data-testid='reviews-list-stub'
      data-quiz-id={quizId}
      data-current-user-id={currentUserId ?? ''}
    />
  ),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const QUIZ_ID = 'quiz-1';

function setBootstrap(
  state: 'idle' | 'bootstrapping' | 'authenticated' | 'unauthenticated',
  currentUserId: string | null = null,
): void {
  useAuthSessionMock.mockReturnValue({
    bootstrapState: state,
    isAuthenticated: state === 'authenticated' || state === 'bootstrapping',
    currentUser:
      state === 'authenticated' && currentUserId
        ? { id: currentUserId, userId: currentUserId }
        : null,
  });
}

function setMyReview(review: unknown): void {
  useMyQuizReviewMock.mockReturnValue({
    review,
    isLoading: false,
    hasResolved: review !== undefined,
    error: null,
    retry: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReviewsWidget — composition', () => {
  it('renders the public list with the canonical quiz id', () => {
    setBootstrap('unauthenticated');
    setMyReview(null);

    render(<ReviewsWidget quizId={QUIZ_ID} />);

    const list = screen.getByTestId('reviews-list-stub');
    expect(list).toBeInTheDocument();
    expect(list.getAttribute('data-quiz-id')).toBe(QUIZ_ID);
  });

  it('does not render the gated form for unauthenticated viewers', () => {
    setBootstrap('unauthenticated');
    setMyReview(null);

    render(<ReviewsWidget quizId={QUIZ_ID} />);

    expect(screen.queryByTestId('review-form-stub')).not.toBeInTheDocument();
  });

  it('renders the gated form for authenticated viewers', () => {
    setBootstrap('authenticated', 'user-1');
    setMyReview(null);

    render(<ReviewsWidget quizId={QUIZ_ID} />);

    expect(screen.getByTestId('review-form-stub')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    setBootstrap('unauthenticated');
    setMyReview(null);

    render(<ReviewsWidget quizId={QUIZ_ID} />);

    expect(screen.getByRole('heading', { name: 'Reviews' })).toBeInTheDocument();
  });

  it('forwards the resolved current user id to the list', () => {
    setBootstrap('authenticated', 'user-1');
    setMyReview(null);

    render(<ReviewsWidget quizId={QUIZ_ID} />);

    const list = screen.getByTestId('reviews-list-stub');
    expect(list.getAttribute('data-current-user-id')).toBe('user-1');
  });

  it('does not render any moderation surface', () => {
    setBootstrap('authenticated', 'user-1');
    setMyReview(null);

    render(<ReviewsWidget quizId={QUIZ_ID} />);

    expect(screen.queryByText(/report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/moderation/i)).not.toBeInTheDocument();
  });
});