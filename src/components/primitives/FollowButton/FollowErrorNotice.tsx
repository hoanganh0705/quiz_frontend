'use client';

/**
 * `<FollowErrorNotice />` — the inline copy surfaced above the
 * `<FollowButton />` whenever the most recent toggle attempt failed.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B2.
 *
 * The notice is rendered in the same DOM region (the same flex column
 * wrapper owned by `<FollowButton />`) so it does NOT introduce CLS
 * (Story 3.9 line 983). The notice uses `role='status'` and
 * `aria-live='polite'` so screen readers announce the change without
 * interrupting the user's current task.
 *
 * The mapping from `errorKind` to copy is the single source of truth
 * for follow / unfollow inline messaging in Phase 3. The per-feature
 * slot (B5) and the page composition (D1 / D2) read the same kind —
 * this notice is the only place the UI copy lives.
 *
 * `unknown` is intentionally rendered as `null` (Story 3.9 line 998
 * says "the B2 primitive owns the disabled / aria / `data-testid`
 * shape" — the global Sentry / captureException discipline from B1
 * AC #11 means `unknown` is rare and does not warrant copy).
 */

import type { OptimisticToggleErrorKind } from '@/lib/api';

export interface FollowErrorNoticeProps {
  /**
   * The discriminated error kind from `useOptimisticToggle`'s
   * `lastError.kind`. `null` renders nothing.
   */
  errorKind: OptimisticToggleErrorKind | null;
  /**
   * Optional className applied to the notice wrapper. Used by the
   * page composition (D1 / D2) to align the notice with the slot's
   * typography scale.
   */
  className?: string;
  /**
   * Optional test id override. Defaults to
   * `'follow-error-notice-${kind}'` so the four branches are
   * individually assertable.
   */
  testId?: string;
}

const COPY: Record<
  Exclude<OptimisticToggleErrorKind, 'unknown'>,
  string
> = {
  http_429: 'Slow down — try again in a minute',
  http_4xx: "Couldn't update — try again",
  http_5xx: "Couldn't update — retry",
  http_404: 'This tag / category is no longer available',
};

export function FollowErrorNotice({
  errorKind,
  className,
  testId,
}: FollowErrorNoticeProps) {
  if (errorKind === null || errorKind === 'unknown') {
    return null;
  }

  return (
    <p
      role='status'
      aria-live='polite'
      data-testid={testId ?? `follow-error-notice-${errorKind}`}
      className={className ?? 'text-xs text-destructive'}
    >
      {COPY[errorKind]}
    </p>
  );
}