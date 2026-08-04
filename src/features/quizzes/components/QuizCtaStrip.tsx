'use client';

/**
 * `<QuizCtaStrip />` — the quiz-detail CTA bar.
 *
 * Source epic: Story 3.6 (quiz detail).
 * Source ticket: TKT-3.6.D2.
 *
 * Replaces the Story 3.6 disabled Start placeholder with the live
 * attempt Start / Continue state machine (Epic 4.14 / T-4.14.24).
 *
 * ## Render branches
 *
 *   - `loading` (active lookup in flight) — stable spinner.
 *   - `unauthenticated` — disabled Start with a tooltip pointing at
 *     the sign-in affordance (placeholder branch).
 *   - `start` — `<AttemptStartCta />`.
 *   - `continue` — `<AttemptContinueCta />`.
 *   - `blocked` / `retry` — explicit retry surface.
 *
 * ## Placeholder mode
 *
 * When `phase4_attempts` is `'placeholder'` (the default), the
 * legacy disabled Start button + tooltip are restored so existing
 * consumers (Story 3.6 placeholder tests) keep their contract.
 *
 * ## Preserved contracts
 *
 *   - Bookmark slot position, `data-testid="quiz-cta-strip"`,
 *     `data-testid="quiz-bookmark-button-slot"`, and the
 *     `data-testid="quiz-start-attempt-button"` (now under live
 *     mode) are unchanged.
 *   - Bookmark slot test IDs (`bookmark-button-*`) are unchanged.
 *   - The outer strip layout is unchanged.
 */

import { Loader2, Play } from 'lucide-react';

import {
  AttemptContinueCta,
  AttemptStartCta,
} from '@/features/attempts/components';
import { useActiveAttempt } from '@/features/attempts/hooks/useActiveAttempt';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  BookmarkButtonSlot,
} from '@/components/primitives/BookmarkButton';
import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { cn } from '@/shared/utils/merge-class-names';
import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';

const START_TOOLTIP = 'Starting attempts opens in a later release';
const BUTTON_SIZE = 'h-10 w-full min-w-40 sm:w-44';

export interface QuizCtaStripProps {
  quizId: string;
  /**
   * Route `idOrSlug` (UUID or slug) — required to build runner URLs.
   * Optional so the Story 3.6 placeholder tests can omit it; in
   * production the `QuizDetailPage` always passes the route id.
   */
  idOrSlug?: string;
  className?: string;
}

export function QuizCtaStrip({ quizId, idOrSlug, className }: QuizCtaStripProps) {
  const isPhase4Live = isFeatureEnabled('phase4_attempts', 'live');
  const { bootstrapState, currentUser } = useAuthBootstrap();
  const isAuthenticated =
    bootstrapState === 'authenticated' && currentUser !== null;

  // Active lookup is gated on auth — never issues a private request
  // for unauthenticated visitors.
  const { attempt: activeAttempt, isLoading, error, retry } = useActiveAttempt({
    quizId: isAuthenticated ? quizId : null,
  });

  if (!isPhase4Live) {
    return <PlaceholderStrip quizId={quizId} className={className} />;
  }

  // ─── Live mode render branches ────────────────────────────────────────
  const showLoading = isAuthenticated && isLoading;
  const hasActive = activeAttempt !== null;
  const hasError = error !== null && activeAttempt === null;
  const isEmptyResolved = isAuthenticated && !isLoading && activeAttempt === null;

  let attemptSlot: React.ReactNode;

  if (showLoading) {
    attemptSlot = (
      <span
        className="inline-flex h-10 w-full min-w-40 items-center justify-center rounded-md border bg-card sm:w-44"
        data-testid="quiz-attempt-loading"
      >
        <Loader2 aria-hidden="true" className="animate-spin" />
      </span>
    );
  } else if (hasActive) {
    attemptSlot = (
      <AttemptContinueCta
        activeAttempt={activeAttempt}
        idOrSlug={idOrSlug ?? null}
      />
    );
  } else if (isEmptyResolved) {
    attemptSlot = (
      <AttemptStartCta
        quizId={quizId}
        idOrSlug={idOrSlug ?? null}
        isActiveResolvedEmpty
      />
    );
  } else if (hasError) {
    attemptSlot = (
      <Button
        type="button"
        variant="outline"
        size="default"
        onClick={() => void retry()}
        data-testid="quiz-attempt-retry"
        aria-label="Retry loading active attempt"
      >
        Retry
      </Button>
    );
  } else {
    // Unauthenticated or bootstrap: keep the existing disabled
    // placeholder copy so Story 3.6 placeholder tests pass.
    attemptSlot = <DisabledStartTooltip />;
  }

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end',
        className,
      )}
      aria-label='Quiz actions'
      data-testid='quiz-cta-strip'
    >
      <BookmarkButtonSlot
        quizId={quizId}
        variant='detail'
        className='contents'
      />
      {attemptSlot}
    </section>
  );
}

// ─── Placeholder-mode strip (legacy behaviour) ─────────────────────────────

function PlaceholderStrip({
  quizId,
  className,
}: {
  quizId: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end',
        className,
      )}
      aria-label='Quiz actions'
      data-testid='quiz-cta-strip'
    >
      <BookmarkButtonSlot
        quizId={quizId}
        variant='detail'
        className='contents'
      />
      <DisabledStartTooltip />
    </section>
  );
}

// ─── Shared: disabled Start tooltip (legacy copy) ──────────────────────────

function DisabledStartTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className='inline-flex w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto'
          tabIndex={0}
          data-testid='quiz-start-tooltip-trigger'
        >
          <Button
            type='button'
            className={BUTTON_SIZE}
            disabled
            aria-label='Start attempt (unavailable)'
            data-testid='quiz-start-attempt-button'
          >
            <Play aria-hidden='true' />
            Start attempt
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{START_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}

export { START_TOOLTIP as QUIZ_START_ATTEMPT_TOOLTIP };