'use client';

/**
 * `AttemptProgressBar` — accessible attempt progress bar.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.15.
 *
 * ## What this component owns
 *
 *   - Presents the current question position and the
 *     server-submitted answer count separately.
 *   - Exposes valid `aria-valuemin`, `aria-valuemax`, and
 *     `aria-valuenow` values for assistive technology.
 *   - Handles the zero-question edge case without dividing by zero
 *     or rendering an invalid percentage.
 *   - Draft answers do not count as submitted progress.
 *
 * ## What this component does NOT own
 *
 *   - No completion controls.
 *   - No score / pass / fail copy.
 *   - No service, SWR, store, or router imports.
 */

import * as React from 'react';

import { cn } from '@/shared/utils/merge-class-names';

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptProgressBarProps {
  /** Total question count. `0` is allowed (renders a stable empty bar). */
  totalQuestions: number;
  /** Current 0-based question index. */
  currentIndex: number;
  /** Server-confirmed submitted-answer count (drafts excluded). */
  submittedCount: number;
  /** Optional className for the root container. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptProgressBar(
  props: AttemptProgressBarProps,
): React.ReactElement {
  const { totalQuestions, currentIndex, submittedCount, className } = props;

  // Guard the zero-question edge case. `aria-valuenow` would be
  // invalid otherwise and assistive technology surfaces a warning.
  if (totalQuestions <= 0) {
    return (
      <div
        className={cn('w-full space-y-2', className)}
        data-testid="attempt-progress-bar"
        role="group"
        aria-label="Attempt progress"
      >
        <div
          className="h-2 w-full rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={0}
          aria-valuenow={0}
          aria-label="Question position"
        />
        <p className="text-xs text-muted-foreground">
          No questions yet.
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(Math.max(currentIndex, 0), totalQuestions - 1);
  const positionPercent = Math.round(((safeIndex + 1) / totalQuestions) * 100);
  const submittedPercent = Math.min(
    Math.max(Math.round((submittedCount / totalQuestions) * 100), 0),
    100,
  );

  return (
    <div
      className={cn('w-full space-y-2', className)}
      data-testid="attempt-progress-bar"
      role="group"
      aria-label="Attempt progress"
    >
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalQuestions}
        aria-valuenow={safeIndex + 1}
        aria-label={`Question ${safeIndex + 1} of ${totalQuestions}`}
      >
        {/* Position indicator: lighter band covering the current index. */}
        <div
          className="absolute inset-y-0 left-0 bg-primary/30"
          style={{ width: `${positionPercent}%` }}
        />
        {/* Submitted indicator: solid band up to the submitted count. */}
        <div
          className="absolute inset-y-0 left-0 bg-primary"
          style={{ width: `${submittedPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span data-testid="attempt-progress-bar-position">
          Question {safeIndex + 1} of {totalQuestions}
        </span>
        <span data-testid="attempt-progress-bar-submitted">
          {submittedCount} submitted
        </span>
      </div>
    </div>
  );
}