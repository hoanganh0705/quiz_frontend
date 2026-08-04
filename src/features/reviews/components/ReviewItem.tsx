'use client';

/**
 * `ReviewItem` — single review row in the public list.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.17.
 *
 * ## Composition
 *
 * Renders one review with:
 *   - rating (read-only 1–5 stars).
 *   - review text.
 *   - author byline (avatar + username).
 *   - formatted date.
 *   - helpful button (`ReviewHelpfulButton`, T-4.13.14).
 *   - ownership-specific actions via `ReviewEditInline` (T-4.13.16).
 *
 * ## Visibility rules
 *
 *   - Owner (`currentUserId === review.userId`):
 *     receives edit/delete affordances through `ReviewEditInline`.
 *     The helpful toggle is HIDDEN — owners cannot mark their own
 *     review helpful (server-authoritative).
 *   - Non-owner authenticated viewer: helpful toggle.
 *   - Unauthenticated viewer: helpful toggle is rendered but the
 *     hook gates the mutation.
 *
 * ## No moderation surface
 *
 * Per Story 4.13 scope, no report or moderation link is rendered
 * by this component. The ticket AC explicitly calls this out.
 */

import { Star } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils/merge-class-names';
import { formatRelativeTime } from '@/shared/utils/date-utils';

import { ReviewEditInline } from '@/features/reviews/components/ReviewEditInline';
import { ReviewHelpfulButton } from '@/features/reviews/components/ReviewHelpfulButton';
import { useHelpfulReview } from '@/features/reviews/hooks/useHelpfulReview';
import type {
  MyReviewDto,
  ReviewDto,
} from '@/features/reviews/types';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ReviewItemProps {
  review: ReviewDto;
  /**
   * The authenticated viewer's id. Used to compute ownership.
   * Pass `null` when unauthenticated.
   */
  currentUserId: string | null;
  /**
   * The reviewer's full my-review projection. Supplied ONLY when
   * the viewer is the owner AND the list happens to render the
   * owned item. When supplied, the editor opens inline. When
   * omitted for non-owners, no edit affordances appear.
   */
  ownerReview?: MyReviewDto;
  /** Optional className for the wrapping row. */
  className?: string;
  /** Notified after a successful delete (the widget refreshes). */
  onDeleted?: () => void;
}

const MAX_COMMENT_LENGTH = 2000;
const REMOVED_PLACEHOLDER = '[removed]';

// ─── Component ───────────────────────────────────────────────────────────────

export function ReviewItem({
  review,
  currentUserId,
  ownerReview,
  onDeleted,
  className,
}: ReviewItemProps): React.ReactElement {
  const isOwner =
    typeof currentUserId === 'string' &&
    currentUserId === review.userId;

  // The list endpoint returns a public projection that does not
  // carry `viewerMarkedHelpful`. Until the backend confirms the
  // shape, default to `false`. The helpful button surfaces the
  // count regardless.
  const helpfulCount = review.helpfulCount;

  const isAuthenticated = typeof currentUserId === 'string';

  // Hooks must be called unconditionally — owner-hidden is
  // enforced inside the hook and the button render.
  const helpful = useHelpfulReview({
    quizId: review.quizId,
    reviewId: review.reviewId,
    initialViewerMarkedHelpful: false,
  });

  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs',
        className,
      )}
      data-testid={`review-item-${review.reviewId}`}
      data-owner={isOwner ? 'true' : undefined}
    >
      <header className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Avatar className='size-8'>
            {review.userAvatarUrl ? (
              <AvatarImage src={review.userAvatarUrl} alt={`${review.username} avatar`} />
            ) : null}
            <AvatarFallback>{initialsFor(review.username)}</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-foreground' data-testid={`review-item-author-${review.reviewId}`}>
              {review.username}
            </span>
            <time
              dateTime={review.createdAt}
              className='text-xs text-muted-foreground tabular-nums'
              data-testid={`review-item-date-${review.reviewId}`}
            >
              {formatRelativeTime(review.createdAt)}
            </time>
          </div>
        </div>
        <div
          className='flex items-center gap-0.5 text-amber-500'
          aria-label={`${review.rating} out of 5 stars`}
          data-testid={`review-item-rating-${review.reviewId}`}
        >
          {Array.from({ length: 5 }, (_, idx) => (
            <Star
              key={idx}
              size={16}
              fill={idx < review.rating ? 'currentColor' : 'none'}
              strokeWidth={idx < review.rating ? 0 : 2}
              aria-hidden
            />
          ))}
        </div>
      </header>

      {review.comment && review.comment.trim().length > 0 ? (
        <p
          className='whitespace-pre-wrap break-words text-sm text-foreground'
          data-testid={`review-item-body-${review.reviewId}`}
        >
          {clampReviewText(review.comment, MAX_COMMENT_LENGTH)}
        </p>
      ) : null}

      <footer className='mt-1 flex items-center justify-between'>
        {isOwner ? (
          ownerReview ? (
            <ReviewEditInline review={ownerReview} onDeleted={onDeleted} />
          ) : null
        ) : (
          <ReviewHelpfulButton
            reviewId={review.reviewId}
            helpfulCount={helpfulCount}
            viewerMarkedHelpful={helpful.viewerMarkedHelpful}
            isPending={helpful.isPending}
            isOwner={isOwner}
            isAuthenticated={isAuthenticated}
            onToggle={() => {
              void helpful.toggle();
            }}
          />
        )}
      </footer>
    </article>
  );
}

// ─── Helpers (module-private) ────────────────────────────────────────────────

function initialsFor(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase();
}

function clampReviewText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

// Re-export the placeholder for tests + future consumers.
export const REVIEW_REMOVED_PLACEHOLDER = REMOVED_PLACEHOLDER;

// ─── Skeleton (exported for the list to consume) ─────────────────────────────

/**
 * A single review row skeleton. The list renders N of these while
 * the first page is loading (T-4.13.18).
 */
export function ReviewItemSkeleton({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-card/60 p-4 shadow-xs',
        className,
      )}
      data-testid='review-item-skeleton'
      aria-hidden
    >
      <div className='flex items-center gap-2'>
        <Skeleton className='size-8 rounded-full' />
        <div className='flex flex-col gap-1'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-3 w-16' />
        </div>
      </div>
      <Skeleton className='h-3 w-full' />
      <Skeleton className='h-3 w-11/12' />
      <Skeleton className='h-3 w-2/3' />
    </div>
  );
}