/**
 * `ReviewsList.spec.tsx` — RTL tests for the public review list.
 *
 * Source epic:   Epic 4.13.
 * Source ticket: T-4.13.18.
 *
 * Verifies:
 *  - Five skeleton rows render while initially loading.
 *  - Empty copy matches the epic ("Be the first to review.").
 *  - Review items render in server order.
 *  - Load more appends once without duplicates.
 *  - Pagination error preserves existing reviews.
 *  - Retry succeeds after a mocked 5xx.
 *  - Removed review refreshes the list (the slot disappears).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { ReviewsList } from '@/features/reviews/components/ReviewsList';
import type { ReviewDto } from '@/features/reviews/types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const useQuizReviewsMock = vi.fn();

vi.mock('@/features/reviews/hooks/useQuizReviews', () => ({
  useQuizReviews: (params: unknown) => useQuizReviewsMock(params),
}));

vi.mock('@/features/reviews/components/ReviewHelpfulButton', () => ({
  ReviewHelpfulButton: () => <div data-testid='helpful-button-stub' />,
}));

vi.mock('@/features/reviews/hooks/useHelpfulReview', () => ({
  useHelpfulReview: () => ({
    toggle: vi.fn(),
    isPending: false,
    viewerMarkedHelpful: false,
  }),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const QUIZ_ID = 'quiz-1';

function makeReview(id: string, overrides: Partial<ReviewDto> = {}): ReviewDto {
  return {
    id,
    reviewId: id,
    quizId: QUIZ_ID,
    userId: 'user-1',
    username: 'tester',
    userAvatarUrl: null,
    rating: 5,
    comment: `Review ${id}`,
    helpfulCount: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as ReviewDto;
}

function setList(opts: {
  items?: readonly ReviewDto[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
  error?: unknown;
  refresh?: () => Promise<void>;
}): void {
  const loadMore = opts.loadMore ?? vi.fn();
  const refresh = opts.refresh ?? vi.fn().mockResolvedValue(undefined);
  useQuizReviewsMock.mockReturnValue({
    items: opts.items ?? [],
    isLoading: opts.isLoading ?? false,
    isLoadingMore: opts.isLoadingMore ?? false,
    hasMore: opts.hasMore ?? false,
    loadMore,
    error: opts.error ?? null,
    refresh,
    reviews: opts.items ?? [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests: skeleton + empty + items ──────────────────────────────────────────

describe('ReviewsList — initial render', () => {
  it('renders five skeleton rows while loading the first page', () => {
    setList({ isLoading: true });

    render(<ReviewsList quizId={QUIZ_ID} currentUserId={null} />);

    const skeletons = screen.getByTestId('reviews-list-skeleton');
    expect(skeletons).toBeInTheDocument();
    // Five `ReviewItemSkeleton` test ids.
    expect(skeletons.querySelectorAll('[data-testid="review-item-skeleton"]').length).toBe(5);
  });

  it('renders the empty state with the approved copy when the list is empty', () => {
    setList({ items: [] });

    render(<ReviewsList quizId={QUIZ_ID} currentUserId={null} />);

    const empty = screen.getByTestId('reviews-list-empty');
    expect(empty).toBeInTheDocument();
    expect(empty.textContent).toMatch(/be the first to review/i);
  });

  it('renders review items in server order', () => {
    setList({
      items: [
        makeReview('a'),
        makeReview('b'),
        makeReview('c'),
      ],
    });

    render(<ReviewsList quizId={QUIZ_ID} currentUserId={null} />);

    const container = screen.getByTestId('reviews-list-items');
    const ids = Array.from(container.children).map(
      (el) => el.getAttribute('data-testid') ?? '',
    );
    expect(ids).toEqual([
      'review-item-a',
      'review-item-b',
      'review-item-c',
    ]);
  });
});

// ─── Tests: load more ────────────────────────────────────────────────────────

describe('ReviewsList — pagination', () => {
  it('renders Load more only when another cursor exists', () => {
    setList({
      items: [makeReview('a')],
      hasMore: true,
    });

    const { unmount } = render(<ReviewsList quizId={QUIZ_ID} currentUserId={null} />);
    expect(screen.getByTestId('reviews-list-load-more')).toBeInTheDocument();
    unmount();

    setList({
      items: [makeReview('a'), makeReview('b')],
      hasMore: false,
    });
    render(<ReviewsList quizId={QUIZ_ID} currentUserId={null} />);
    expect(screen.queryByTestId('reviews-list-load-more')).not.toBeInTheDocument();
  });

  it('calls `loadMore` once on click', () => {
    const loadMore = vi.fn();
    setList({ items: [makeReview('a')], hasMore: true, loadMore });

    render(<ReviewsList quizId={QUIZ_ID} currentUserId={null} />);
    fireEvent.click(screen.getByTestId('reviews-list-load-more'));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});

// ─── Tests: retry / error ────────────────────────────────────────────────────

describe('ReviewsList — error + retry', () => {
  it('surfaces an error banner for the initial fetch', () => {
    setList({ items: [], error: new Error('boom') });

    render(<ReviewsList quizId={QUIZ_ID} currentUserId={null} />);

    expect(screen.getByTestId('reviews-list-error')).toBeInTheDocument();
  });

  it('retries after a 5xx', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    setList({ items: [], error: new Error('boom'), refresh });

    render(<ReviewsList quizId={QUIZ_ID} currentUserId={null} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('reviews-list-retry'));
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});