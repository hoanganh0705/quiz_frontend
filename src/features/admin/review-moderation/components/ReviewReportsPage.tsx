'use client';

/**
 * `features/admin/review-moderation/components/ReviewReportsPage.tsx`
 *
 * Source epic:   Epic 7.5.
 * Source ticket: TKT-7.5.A3.
 *
 * ## Purpose
 *
 * Composite page component for the `/admin/reviews/reports` route.
 * Placeholder shipped with Batch A that gates behind the per-area
 * sub-flag (`phase7_admin_review_moderation`). The documentation
 * mirrors the `TagAdminPage` pattern (TKT-7.3.F2) and `CategoryAdminPage`
 * (TKT-7.4.F2): when the flag is `'placeholder'` the page renders the
 * documented disabled notice, and when the flag is `'live'` it renders
 * a "coming soon" placeholder until the queue's full surface arrives
 * in Batches C–F.
 *
 * ## Why this file is shipped in Batch A
 *
 * The A3 ticket reserves the route boundary so QA can verify the
 * `/admin/reviews/reports` URL is reachable, gated, and breadcrumbed
 * before the heavier Batch C–F components arrive. The placeholder
 * owns no HTTP traffic and no mutation logic; later batches replace
 * the placeholder body with the full page composition.
 *
 * ## What this file does NOT do
 *
 * - Does NOT call `listReviewReports` or `patchReviewReport`.
 * - Does NOT manage any `useState` for reports, loading, or dialogs.
 * - Does NOT own any mutation logic.
 * - Does NOT use axios or fetch directly (the cross-batch
 *   `admin-no-axios-or-fetch` invariant from
 *   `scripts/phase7-lint-invariants.mjs` enforces this).
 */

import { Shield, MessageSquareWarning } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { useAdminFeatureFlag } from '@/features/admin/hooks';

function ReviewReportsComingSoon() {
  return (
    <EmptyState
      icon={MessageSquareWarning}
      title="Review moderation coming soon"
      description={
        'Review moderation surfaces are not yet enabled. ' +
        'Set NEXT_PUBLIC_PHASE7_ADMIN_REVIEW_MODERATION=live to preview the feature.'
      }
      size="md"
    />
  );
}

function ReviewReportsPlaceholder() {
  return (
    <EmptyState
      icon={Shield}
      title="Review moderation queue"
      description={
        'The review moderation queue is reserved by Epic 7.5. ' +
        'Rows, filters, and resolve actions arrive in Batches C–F.'
      }
      size="md"
    />
  );
}

/**
 * Review reports page. Gated by `phase7_admin_review_moderation`.
 *
 * ## Interface contract
 *
 * Exports:
 *   - `ReviewReportsPage` — no props required
 *   - `ReviewReportsPageProps` — the props interface (currently unused;
 *     exported for forward-compatibility)
 */
export interface ReviewReportsPageProps {
  /** @deprecated No-op; kept for forward-compatibility. */
  onResolveReport?: never;
}

export function ReviewReportsPage(_props: ReviewReportsPageProps) {
  const { isLive } = useAdminFeatureFlag('phase7_admin_review_moderation');

  if (!isLive) {
    return <ReviewReportsComingSoon />;
  }

  return <ReviewReportsPlaceholder />;
}
