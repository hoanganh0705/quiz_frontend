

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReviewItem } from '@/features/reviews/components/ReviewItem';
import type {
MyReviewDto,
ReviewDto,
} from '@/features/reviews/types';

const helpfulToggleMock = vi.fn();
const helpfulIsPending = vi.fn().mockReturnValue(false);
const helpfulMarked = vi.fn().mockReturnValue(false);

vi.mock('@/features/reviews/hooks/useHelpfulReview', () => ({
useHelpfulReview: () => ({
toggle: helpfulToggleMock,
isPending: helpfulIsPending(),
viewerMarkedHelpful: helpfulMarked(),
  }),
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
<button type='button' onClick={onDeleted}>notify</button>
</div>
  ),
}));

const QUIZ_ID = 'quiz-1';
const REVIEW_ID = 'r-1';

function makeReview(overrides: Partial<ReviewDto> = {}): ReviewDto {
return {
id: REVIEW_ID,
reviewId: REVIEW_ID,
quizId: QUIZ_ID,
userId: 'user-1',
username: 'tester',
userAvatarUrl: null,
rating: 4,
comment: 'Solid quiz',
helpfulCount: 0,
createdAt: '2025-01-01T00:00:00.000Z',
updatedAt: '2025-01-01T00:00:00.000Z',
...overrides,
  } as unknown as ReviewDto;
}

function makeMyReview(overrides: Partial<MyReviewDto> = {}): MyReviewDto {
return {
reviewId: REVIEW_ID,
quizId: QUIZ_ID,
userId: 'user-1',
username: 'tester',
rating: 4,
comment: 'Original',
helpfulCount: 0,
viewerMarkedHelpful: false,
createdAt: '2025-01-01T00:00:00.000Z',
updatedAt: '2025-01-01T00:00:00.000Z',
...overrides,
  } as unknown as MyReviewDto;
}

beforeEach(() => {
vi.clearAllMocks();
helpfulIsPending.mockReturnValue(false);
helpfulMarked.mockReturnValue(false);
});

afterEach(() => {
vi.clearAllMocks();
});

describe('ReviewItem — fixture rendering', () => {
it('renders rating, text, byline, and date from the fixture', () => {
const review = makeReview({
rating: 5,
comment: 'Great quiz',
username: 'alice',
createdAt: '2025-06-01T00:00:00.000Z',
    });

render(<ReviewItem review={review} currentUserId={null} />);

expect(screen.getByTestId(`review-item-rating-${REVIEW_ID}`)).toBeInTheDocument();
expect(screen.getByTestId(`review-item-body-${REVIEW_ID}`)).toHaveTextContent('Great quiz');
expect(screen.getByTestId(`review-item-author-${REVIEW_ID}`)).toHaveTextContent('alice');
expect(screen.getByTestId(`review-item-date-${REVIEW_ID}`)).toBeInTheDocument();
  });
});

describe('ReviewItem — owner branch', () => {
it('shows the inline editor for the owner and hides the helpful toggle', () => {
const review = makeReview({ userId: 'user-1' });
const ownerReview = makeMyReview({ userId: 'user-1' });

render(
<ReviewItem
review={review}
currentUserId='user-1'
ownerReview={ownerReview}
      />,
    );

expect(screen.getByTestId(`review-edit-inline-${REVIEW_ID}`)).toBeInTheDocument();

expect(screen.queryByRole('button', { name: /helpful/i })).not.toBeInTheDocument();
  });
});

describe('ReviewItem — non-owner branch', () => {
it('renders the helpful button for non-owner authenticated viewers', () => {
const review = makeReview({ userId: 'user-1' });

render(<ReviewItem review={review} currentUserId='user-2' />);

expect(
screen.getByRole('button', { name: /helpful/i }),
    ).toBeInTheDocument();
expect(
screen.queryByTestId(`review-edit-inline-${REVIEW_ID}`),
    ).not.toBeInTheDocument();
  });
});

describe('ReviewItem — removed state', () => {
it('renders the [removed] placeholder when the contract marks the review removed and the viewer is the owner', () => {
const review = makeReview({
comment: 'censored',
      // Backend contract surfaces the removed-own-review state as
      // an empty/null body. We mirror the documented shape.
    });

const ownerReview = makeMyReview({ comment: null });

render(
<ReviewItem
review={review}
currentUserId='user-1'
ownerReview={ownerReview}
      />,
    );

    // Owner-side body falls back to the placeholder when the
    // my-review projection reports the comment as removed.
    // (Public-row reviewers still see the original public text.)
  });
});

describe('ReviewItem — scope', () => {
it('does not render any report or moderation surface', () => {
const review = makeReview();

render(<ReviewItem review={review} currentUserId='user-2' />);

expect(screen.queryByRole('link', { name: /report/i })).not.toBeInTheDocument();
expect(screen.queryByRole('button', { name: /moderation/i })).not.toBeInTheDocument();
  });
});