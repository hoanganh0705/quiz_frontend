'use client';

/**
 * `ReviewsList` — cursor-paginated public review list with
 * skeletons, empty state, and retry.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.18.
 *
 * ## What this component owns
 *
 *   - First-page skeleton (five rows) while `isLoading` is true.
 *   - Inline progress for the "load more" affordance.
 *   - "Be the first to review." empty state copy.
 *   - Section-level retry for initial and pagination failures.
 *   - Stable, opaque-cursor pagination via `useQuizReviews`
 *     (T-4.13.4). The opaque cursor never surfaces in the UI or URL.
 *   - Per-item ownership: the owner's own review renders the
 *     inline editor (`ReviewEditInline`); non-owners render the
 *     helpful toggle. The widget passes the resolved current user
 *     id down; this component only forwards it.
 *
 * ## Removed-during-interaction
 *
 * When a review is removed (e.g. via the inline editor), the
 * list re-renders without the removed item. The cursor primitive
 * de-duplicates by `reviewId`, so the slot just disappears — no
 * `[removed]` placeholder leaks into the public list.
 */

import { AlertTriangle, Loader2, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { isApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import {
  ReviewItem,
  ReviewItemSkeleton,
} from '@/features/reviews/components/ReviewItem';
import { useQuizReviews } from '@/features/reviews/hooks/useQuizReviews';
import { type MyReviewDto, type ReviewDto } from '@/features/reviews/types';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ReviewsListProps {
  quizId: string;
  /** Authenticated viewer's id (forwarded for ownership checks). */
  currentUserId: string | null;
  /** Owner's my-review projection, when the viewer is the owner. */
  ownerReview?: MyReviewDto | null;
  /** Optional callback after the owner deletes their review. */
  onOwnerDeleted?: () => void;
  /** Optional className for the wrapping section. */
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SKELETON_COUNT = 5;
const EMPTY_COPY = 'Be the first to review.';

// ─── Component ───────────────────────────────────────────────────────────────

export function ReviewsList({
  quizId,
  currentUserId,
  ownerReview,
  onOwnerDeleted,
  className,
}: ReviewsListProps): React.ReactElement {
  const { items, isLoading, isLoadingMore, hasMore, loadMore, error, refresh } =
    useQuizReviews({ quizId });

  const ownerReviewId = ownerReview?.reviewId ?? null;

  return (
    <section
      className={className}
      aria-label='Reviews'
      data-testid='reviews-list'
      data-quiz-id={quizId}
    >
      {isLoading && items.length === 0 ? (
        <SkeletonRows />
      ) : error && items.length === 0 ? (
        <ListErrorBanner error={error} onRetry={() => void refresh()} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className='flex flex-col gap-4' data-testid='reviews-list-items'>
          {(items as readonly ReviewDto[]).map((review) => (
            <ReviewItem
              key={review.reviewId}
              review={review}
              currentUserId={currentUserId}
              ownerReview={
                ownerReviewId === review.reviewId ? ownerReview ?? undefined : undefined
              }
              onDeleted={onOwnerDeleted}
            />
          ))}

          {hasMore && (
            <div className='flex justify-center pt-1'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => loadMore()}
                disabled={isLoadingMore}
                aria-busy={isLoadingMore || undefined}
                data-testid='reviews-list-load-more'
              >
                {isLoadingMore && (
                  <Loader2 className='mr-2 animate-spin motion-reduce:animate-none' size={14} aria-hidden />
                )}
                Load more reviews
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className='flex flex-col gap-4' data-testid='reviews-list-skeleton'>
      {Array.from({ length: SKELETON_COUNT }, (_, idx) => (
        <ReviewItemSkeleton key={idx} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className='flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground'
      data-testid='reviews-list-empty'
      role='status'
    >
      <MessageSquare size={28} aria-hidden className='text-muted-foreground/70' />
      <p className='font-medium text-foreground'>{EMPTY_COPY}</p>
      <p className='max-w-sm text-xs'>
        Share what you liked and what could be better — your review will appear here.
      </p>
    </div>
  );
}

function ListErrorBanner({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const copy = error && isApiError(error) ? getUserCopy(error.code) : null;
  return (
    <div
      role='alert'
      className='flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'
      data-testid='reviews-list-error'
    >
      <AlertTriangle className='mt-0.5 shrink-0' size={18} aria-hidden />
      <div className='flex-1'>
        <p className='font-medium'>{copy?.title ?? 'Reviews unavailable'}</p>
        <p className='text-xs'>{copy?.body ?? 'Please try again in a moment.'}</p>
      </div>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={onRetry}
        data-testid='reviews-list-retry'
      >
        Retry
      </Button>
    </div>
  );
}