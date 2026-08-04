'use client';

/**
 * `ReviewHelpfulButton` — optimistic helpful-review toggle button.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.14.
 *
 * Renders a single toggle control for a non-owned review's
 * helpful state. The button is wired to `useHelpfulReview`
 * (T-4.13.11); this component is purely presentational.
 *
 * ## Visibility rules (T-4.13.14 AC #3, #5, #6)
 *
 * - `isOwner === true`           → no actionable control renders;
 *                                  only the read-only helpful count.
 * - `isAuthenticated === false`  → read-only count only.
 * - Otherwise                    → the toggle button renders with
 *                                  `aria-pressed`.
 *
 * ## Accessibility
 *
 * - `aria-pressed` reflects the viewer's current marked state.
 * - The control has an `aria-label` like "Helpful (12)" so the
 *   count is announced on focus.
 * - When the helpful count changes (optimistic or confirmed), the
 *   accessible name updates automatically.
 * - When `isPending` is true the button is `disabled` and the
 *   `aria-busy` attribute is set so screen readers announce the
 *   busy state.
 *
 * ## Owner-hidden
 *
 * `isOwner` is the consumer's signal that the viewer is the
 * author of the review. Per T-4.13.14 AC #5, the button does not
 * render at all — viewers cannot mark their own reviews
 * helpful. The defensive `REVIEW_FORBIDDEN` rollback in
 * `useHelpfulReview` covers the edge case where the consumer
 * bypasses this rule.
 */

import * as React from 'react';
import { ThumbsUp } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ReviewHelpfulButtonProps {
  /** The review being toggled. */
  reviewId: string;
  /** Current helpful count. */
  helpfulCount: number;
  /** Whether the viewer has marked this review helpful. */
  viewerMarkedHelpful: boolean;
  /** Whether a toggle request is in flight. */
  isPending: boolean;
  /**
   * Whether the viewer is the author of this review. When
   * `true`, the button is hidden — viewers cannot mark their own
   * reviews helpful.
   */
  isOwner?: boolean;
  /**
   * Whether the viewer is authenticated. Unauthenticated users
   * see the count only; the button does not render.
   */
  isAuthenticated?: boolean;
  /** Toggle handler (the `useHelpfulReview` `toggle` callback). */
  onToggle: () => void;
  /** Optional className for the root. */
  className?: string;
  /** Accessible label override (defaults to "Helpful (count)"). */
  ariaLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Optimistic helpful-review toggle button.
 *
 * @example
 * ```tsx
 * const { toggle, isPending, viewerMarkedHelpful } = useHelpfulReview({
 *   quizId: review.quizId,
 *   reviewId: review.reviewId,
 *   initialViewerMarkedHelpful: false,
 * });
 *
 * <ReviewHelpfulButton
 *   reviewId={review.reviewId}
 *   helpfulCount={review.helpfulCount}
 *   viewerMarkedHelpful={viewerMarkedHelpful}
 *   isPending={isPending}
 *   isOwner={review.userId === currentUser?.userId}
 *   isAuthenticated={Boolean(currentUser)}
 *   onToggle={toggle}
 * />
 * ```
 */
export function ReviewHelpfulButton({
  reviewId,
  helpfulCount,
  viewerMarkedHelpful,
  isPending,
  isOwner = false,
  isAuthenticated = true,
  onToggle,
  className,
  ariaLabel,
}: ReviewHelpfulButtonProps): React.ReactElement {
  // Owner-hidden: the reviewer cannot mark their own review
  // helpful. The backend enforces this too with
  // REVIEW_FORBIDDEN, but the UI hides the control entirely.
  if (isOwner) {
    return (
      <span
        aria-label={`${helpfulCount} people found this helpful`}
        data-testid={`review-helpful-count-${reviewId}`}
        className={cn(
          'inline-flex items-center gap-1 text-xs text-muted-foreground',
          className,
        )}
      >
        <ThumbsUp aria-hidden='true' className='size-3' />
        <span>{helpfulCount}</span>
      </span>
    );
  }

  // Unauthenticated viewers see the count only — the API
  // requires auth, so the button would 401 on click. Surfacing
  // the count keeps the page informative without inviting a
  // failed request.
  if (!isAuthenticated) {
    return (
      <span
        aria-label={`${helpfulCount} people found this helpful`}
        data-testid={`review-helpful-count-${reviewId}`}
        className={cn(
          'inline-flex items-center gap-1 text-xs text-muted-foreground',
          className,
        )}
      >
        <ThumbsUp aria-hidden='true' className='size-3' />
        <span>{helpfulCount}</span>
      </span>
    );
  }

  // The full toggle. `aria-pressed` reflects the viewer state;
  // `aria-busy` reflects the pending state so screen readers
  // announce the in-flight mutation.
  return (
    <Button
      type='button'
      variant={viewerMarkedHelpful ? 'secondary' : 'ghost'}
      size='sm'
      onClick={onToggle}
      disabled={isPending}
      aria-pressed={viewerMarkedHelpful}
      aria-busy={isPending || undefined}
      aria-label={ariaLabel ?? `Helpful (${helpfulCount})`}
      data-testid={`review-helpful-button-${reviewId}`}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs',
        viewerMarkedHelpful && 'bg-secondary/70',
        className,
      )}
    >
      <ThumbsUp
        aria-hidden='true'
        className={cn(
          'size-3 transition-colors',
          viewerMarkedHelpful
            ? 'fill-current text-current'
            : 'text-muted-foreground',
        )}
      />
      <span aria-hidden='true'>{helpfulCount}</span>
    </Button>
  );
}
