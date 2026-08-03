'use client';

/**
 * `<ReadOnlyBanner />` — Phase 4 read-only-form banner.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.E1.
 *
 * ## What this atom owns
 *
 *   - **Read-only banner.** Surfaces the master-plan copy "This quiz
 *     is no longer editable" (master plan line 274) when the form is
 *     mounted with `mode: 'readonly'`. The banner is the single
 *     read-only-form surface authoring forms render when the entity
 *     they are bound to has been deleted, archived, or otherwise
 *     transitioned to a non-editable state.
 *   - **Optional `reason` prop.** The reason string is rendered as a
 *     `title` tooltip on the lock icon so consumers can pass a
 *     machine-readable reason (e.g. `'quiz-deleted'`, `'quiz-archived'`,
 *     `'version-immutable'`) without a separate string-substitution
 *     ceremony. The reason is also surfaced as a small `<span>` for
 *     accessibility (screen readers read the title attribute).
 *
 * ## What this atom does NOT own
 *
 *   - **Mode gating.** The `mode === 'readonly'` check lives in
 *     `useQuizForm` (TKT-4.2.E1). The banner is a pure presentation
 *     component; consumers render it whenever they want to surface
 *     read-only copy (the typical consumer is `useQuizForm`'s caller,
 *     which branches on `mode`).
 *   - **Form-level disabled state.** Consumers are expected to also
 *     `disabled` the master-plan form atoms (`<TextField disabled />`,
 *     `<DifficultySelect disabled />`, …) so the form is read-only
 *     everywhere — the banner explains the why, the atoms enforce the
 *     how.
 */

import * as React from 'react';
import { Lock } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

export interface ReadOnlyBannerProps {
  /**
   * Optional machine-readable reason for the read-only state. Surfaced
   * as a tooltip on the lock icon and rendered as a small `<span>` for
   * accessibility. The accepted values are documented in the master
   * plan line 274 ("quiz-deleted / version-immutable / …") — the
   * banner makes no semantic interpretation of the value; consumers
   * own the vocabulary.
   */
  reason?: string;
  /** Optional className appended to the wrapping `<div>`. */
  className?: string;
  /** Optional test id for the banner root. */
  testId?: string;
}

/**
 * `<ReadOnlyBanner reason={...} />` — renders the "This quiz is no
 * longer editable" copy with an optional reason tooltip. Pure
 * presentation; consumers gate rendering on `mode === 'readonly'`.
 */
export function ReadOnlyBanner({
  reason,
  className,
  testId = 'read-only-banner',
}: ReadOnlyBannerProps): React.ReactElement {
  const tooltipText = reason
    ? `This quiz is no longer editable (${reason}).`
    : 'This quiz is no longer editable.';
  // The lucide-react `Lock` icon does not accept a `title` prop
  // directly. Wrap the icon in a `<span title="…">` so the tooltip
  // surfaces on hover without a custom attribute on the SVG.
  return (
    <div
      role='status'
      aria-live='polite'
      data-testid={testId}
      data-read-only-banner-reason={reason ?? 'unknown'}
      className={cn(
        'flex items-start gap-2 rounded-md border border-muted-foreground/30 bg-muted/40 p-3 text-sm text-muted-foreground',
        className
      )}
    >
      <span
        className='inline-flex mt-0.5 shrink-0'
        title={tooltipText}
        aria-hidden='true'
        data-testid={`${testId}-lock`}
      >
        <Lock className='h-4 w-4' />
      </span>
      <div className='flex-1 space-y-1'>
        <p
          className='font-semibold leading-none text-foreground'
          data-testid={`${testId}-title`}
        >
          This quiz is no longer editable
        </p>
        <p className='text-xs' data-testid={`${testId}-body`}>
          The quiz has been deleted, archived, or its version is
          immutable. You can view the form, but changes cannot be
          saved.
        </p>
        {reason ? (
          <span
            className='block text-[0.7rem] font-mono text-muted-foreground/80'
            data-testid={`${testId}-reason`}
            title={tooltipText}
          >
            reason: {reason}
          </span>
        ) : null}
      </div>
    </div>
  );
}
