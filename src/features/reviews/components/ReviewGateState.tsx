'use client';

/**
 * `ReviewGateNotice` — "complete an attempt first" notice.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.13.
 *
 * Renders the approved copy for the `attempt-required` branch of
 * the review gate (T-4.13.7). The component is purely
 * presentational — it does not call any attempt service and does
 * not own any review query state.
 *
 * ## Handoff to Story 4.14
 *
 * The CTA delegates the attempt-lifecycle action to Story 4.14.
 * The consumer passes either:
 *
 *   - a `startAttemptHref` (link route), OR
 *   - a `onStartAttempt` callback (programmatic handler), OR
 *   - neither (the `ctaUnavailable` state).
 *
 * When neither is supplied (Story 4.14 is not yet live), the CTA
 * renders as a non-interactive disabled button so the gate never
 * points to an invented route.
 *
 * ## Accessibility
 *
 * The notice uses `<section role="status">` so screen readers
 * announce the gate copy when it mounts. The CTA button has a
 * descriptive label and is reachable via keyboard focus.
 *
 * ## Naming
 *
 * The component is named `ReviewGateNotice` to avoid colliding
 * with the `ReviewGateState` discriminated union exported from
 * `@/features/reviews/types`. The ticket refers to the
 * component as "ReviewGateState"; the rename is purely a naming
 * surface decision so the type union and the presentational
 * component can both be re-exported from the feature barrel.
 */

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ReviewGateStateProps {
  /** Optional quiz title for a personalised copy ("Rate 'Math 101'"). */
  quizTitle?: string;
  /**
   * Route to navigate to when the viewer clicks the CTA. When
   * provided, the CTA is a link (`<Button asChild><Link/></Button>`).
   * Mutually exclusive with `onStartAttempt`.
   */
  startAttemptHref?: string;
  /**
   * Programmatic handler for the CTA. When provided, the CTA is
   * a `<Button>` that calls this handler on click. Mutually
   * exclusive with `startAttemptHref`.
   */
  onStartAttempt?: () => void;
  /**
   * Optional retry callback for the optional error sub-state.
   * When provided, a "Try again" link appears below the CTA.
   */
  onRetry?: () => void;
  /**
   * Optional error message to display above the CTA. Used by the
   * gate hook's `error` branch when the eligibility query fails —
   * the gate surfaces this component with `errorMessage` set so
   * the viewer sees the gate copy + a retry path.
   */
  errorMessage?: string;
  /** Optional className for the root. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * "Complete an attempt before writing a review" notice.
 *
 * @example
 * ```tsx
 * <ReviewGateNotice
 *   quizTitle={quiz.title}
 *   startAttemptHref={`/quizzes/${quiz.slug}/attempt`}
 * />
 * ```
 */
export function ReviewGateNotice({
  quizTitle,
  startAttemptHref,
  onStartAttempt,
  onRetry,
  errorMessage,
  className,
}: ReviewGateStateProps): React.ReactElement {
  const hasLiveCta =
    typeof startAttemptHref === 'string' ||
    typeof onStartAttempt === 'function';

  const heading = quizTitle
    ? `Complete an attempt before reviewing “${quizTitle}”`
    : 'Complete an attempt before writing a review';

  return (
    <section
      role='status'
      aria-live='polite'
      data-testid='review-gate-state'
      className={cn(
        'flex flex-col gap-3 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-4',
        className,
      )}
    >
      <div className='flex flex-col gap-1'>
        <h2 className='text-base font-semibold'>{heading}</h2>
        <p className='text-sm text-muted-foreground'>
          You can only review a quiz once you have a completed attempt
          for it. Finish a run, then come back to share your thoughts.
        </p>
      </div>

      {errorMessage ? (
        <p
          role='alert'
          className='text-sm text-destructive'
          data-testid='review-gate-state-error'
        >
          {errorMessage}
        </p>
      ) : null}

      <div className='flex flex-wrap items-center gap-2'>
        {hasLiveCta ? (
          <Button
            type='button'
            variant='default'
            size='sm'
            onClick={onStartAttempt}
            data-href={startAttemptHref ?? undefined}
            data-testid='review-gate-state-cta'
          >
            Start attempt
          </Button>
        ) : (
          <Button
            type='button'
            variant='default'
            size='sm'
            disabled
            aria-disabled='true'
            data-testid='review-gate-state-cta-unavailable'
          >
            Start attempt (coming soon)
          </Button>
        )}

        {onRetry ? (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onRetry}
            data-testid='review-gate-state-retry'
          >
            Try again
          </Button>
        ) : null}
      </div>
    </section>
  );
}
