'use client';

/**
 * `features/admin/ranking-admin/components/RankingCrossUserImpactWarning.tsx`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.D3.
 *
 * ## What this component owns
 *
 * A prominent, non-dismissable warning component that renders the cross-user
 * impact notice for period reset. Rendered before the typed-confirm dialog.
 */

import { AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { RANKING_RESET_IRREVERSIBILITY_NOTICE } from '../ranking-confirm-strings';

export interface RankingCrossUserImpactWarningProps {
  /**
   * Optional affected user count. Rendered when provided.
   * May be `null` if the backend does not return this field (per A1 §2.3).
   */
  affectedUserCount?: number | null;
}

/**
 * Shared component rendering a non-dismissable cross-user impact warning.
 *
 * This component has NO close/dismiss button — it is a structural part
 * of the confirmation flow.
 */
export function RankingCrossUserImpactWarning({
  affectedUserCount,
}: RankingCrossUserImpactWarningProps) {
  return (
    <div
      data-testid="ranking-cross-user-impact-warning"
      role="alert"
      className="flex flex-col gap-3 rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
    >
      {/* Header badge */}
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="h-4 w-4 text-red-600"
          aria-hidden="true"
        />
        <Badge variant="destructive" className="bg-red-600">
          Cross-user impact
        </Badge>
      </div>

      {/* Irreversibility notice */}
      <p className="text-sm font-medium text-red-900 dark:text-red-100">
        {RANKING_RESET_IRREVERSIBILITY_NOTICE}
      </p>

      {/* Affected user count */}
      {affectedUserCount !== undefined && affectedUserCount !== null ? (
        <p
          data-testid="ranking-affected-user-count"
          className="text-sm text-red-700 dark:text-red-300"
        >
          This action affects{' '}
          <span className="font-semibold">
            {affectedUserCount.toLocaleString()}
          </span>{' '}
          user{affectedUserCount === 1 ? '' : 's'}.
        </p>
      ) : null}
    </div>
  );
}
