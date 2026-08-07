'use client';

/**
 * `features/admin/achievement-admin/components/ReevaluateRunningIndicator.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D2 (part a).
 *
 * ## What this component owns
 *
 * - Render the running indicator when `lifecycle === 'running'`.
 * - Null for all other lifecycle states.
 * - Accessible `role="status"` with `aria-live="polite"`.
 */

import { LoadingSpinner } from '@/components/ui/loading-states/LoadingSpinner';

import { useReevaluateUserAchievements } from '../hooks';

export interface ReevaluateRunningIndicatorProps {
  /** The user whose re-evaluation is being tracked. */
  userId: string;
}

/**
 * Accessible running indicator for the achievement re-evaluation lifecycle.
 *
 * Renders `null` unless the lifecycle is `'running'`.
 */
export function ReevaluateRunningIndicator({
  userId,
}: ReevaluateRunningIndicatorProps) {
  const { lifecycle } = useReevaluateUserAchievements(userId);

  if (lifecycle !== 'running') {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Re-evaluation in progress"
      data-testid="reevaluate-running-indicator"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <LoadingSpinner size="sm" />
      <span>Re-evaluation running…</span>
    </div>
  );
}
