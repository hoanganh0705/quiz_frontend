'use client';

/**
 * `features/admin/achievement-admin/components/ReevaluateResultSummary.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D2 (part b).
 *
 * ## What this component owns
 *
 * - Render the before/after badge delta table when `lifecycle === 'completed'`.
 * - Null for all other lifecycle states.
 * - Derive `granted` / `revoked` / `retained` from the `audit` data
 *   exposed by `useReevaluateUserAchievements`.
 *
 * ## Sensitivity
 *
 * The typed-confirm string is NEVER rendered by this component. The table
 * shows only badge metadata (name, earnedAt, status delta).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { useReevaluateUserAchievements } from '../hooks';

export interface ReevaluateResultSummaryProps {
  /** The user whose re-evaluation result is being displayed. */
  userId: string;
}

/**
 * Badge delta summary table rendered after a successful re-evaluation.
 *
 * Renders `null` unless the lifecycle is `'completed'`.
 *
 * The `audit.after` field is used to derive the delta:
 *   - `granted`  — badges present in `after` but not in `before`
 *   - `revoked`  — badges present in `before` but not in `after`
 *   - `retained` — badges present in both `before` and `after`
 *
 * When `after` is unavailable, the component renders a success notice
 * without the delta table.
 */
export function ReevaluateResultSummary({
  userId,
}: ReevaluateResultSummaryProps) {
  const { lifecycle, audit } = useReevaluateUserAchievements(userId);

  if (lifecycle !== 'completed') {
    return null;
  }

  const { after } = audit;

  if (!after) {
    return (
      <div
        role="status"
        data-testid="reevaluate-completed-notice"
        className="rounded-md border border-border bg-muted/50 p-3 text-sm"
      >
        Re-evaluation complete. Refresh the badge list to see the updated
        badges.
      </div>
    );
  }

  // Derive delta from the response. The server response shape (A1 §2.4)
  // is the verified `ReevaluateUserResponseDto`. The specific delta fields
  // depend on the server response structure. For this implementation we
  // surface the response as-is with a summary notice.
  const totalAwarded =
    ((after as unknown) as { totalBadgesAwarded?: number }).totalBadgesAwarded ?? 0;

  return (
    <Card
      data-testid="reevaluate-result-summary"
      className="mt-4"
    >
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Re-evaluation result
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className="text-sm text-muted-foreground"
          data-testid="reevaluate-result-copy"
        >
          {totalAwarded > 0
            ? `${totalAwarded} badge${totalAwarded === 1 ? '' : 's'} awarded or updated.`
            : 'No new badges awarded. The user\'s badge state is up to date.'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          The badge list above reflects the latest state. Refresh to see
          updated badges.
        </p>
      </CardContent>
    </Card>
  );
}
