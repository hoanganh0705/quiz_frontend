'use client';

/**
 * `features/admin/review-moderation/components/ReviewReportsPage.tsx`
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source tickets: TKT-7.5.A3 (placeholder) → TKT-7.5.F1
 *   (full composition).
 *
 * ## What this component renders
 *
 * The full `/admin/reviews/reports` page composition. It owns:
 *
 *   - the page-level feature-flag gate
 *     (`useAdminFeatureFlag('admin_review_moderation_live')`).
 *   - the documented page header (`AdminPageHeader`).
 *   - the `ReviewReportsList` (the only list rendered here).
 *
 * The placeholder shipped with Batch A has been replaced with the
 * full composition; the flag gate and the documented disabled
 * notice remain identical so the route-level wiring is stable
 * across the upgrade.
 *
 * ## Why the page is split from the route file
 *
 * The route file (`app/admin/reviews/reports/page.tsx`) is a thin
 * pass-through to `ReviewReportsRouteHandoff`, which emits a
 * `admin:7.1` breadcrumb on mount and delegates here. This
 * three-layer pattern (route file → handoff → page) keeps the
 * diagnostic affordances on the boundary and the visible page
 * logic free of side-effects.
 *
 * ## Cross-batch invariants
 *
 *   - The page never calls services or fetches data. Every effect
 *     reads from `useReviewReports` (E3) or props.
 *   - No `axios` / `fetch` call originates from this file.
 *   - The page renders nothing additional — all action affordances
 *     live inside the list (E3).
 */

import { Shield, MessageSquareWarning } from 'lucide-react';

import { AdminPageHeader } from '@/app/(protected)/admin/_components/AdminPageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

import { useAdminFeatureFlag } from '@/features/admin/hooks';
import { ReviewReportsList } from '@/features/admin/review-moderation/components/ReviewReportsList';

// ─── Subcomponents ──────────────────────────────────────────────────────────

function ReviewReportsComingSoon(): React.ReactElement {
  return (
    <EmptyState
      icon={MessageSquareWarning}
      title="Review moderation coming soon"
      description={
        'Review moderation surfaces are not yet enabled. ' +
        'Set NEXT_PUBLIC_ADMIN_REVIEW_MODERATION_LIVE=live to preview the feature.'
      }
      size="md"
    />
  );
}

function ReviewReportsDisabled(): React.ReactElement {
  return (
    <EmptyState
      icon={Shield}
      title="Review moderation is disabled"
      description={
        'The admin_review_moderation_live feature flag is currently set ' +
        'to a value other than "enabled". Toggle the flag to live to render ' +
        'the moderation queue.'
      }
      size="md"
    />
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Review reports page. Gated by `admin_review_moderation_live`.
 *
 * ## Interface contract
 *
 * Exports:
 *   - `ReviewReportsPage` — no props required.
 *   - `ReviewReportsPageProps` — the props interface (currently
 *     unused; exported for forward-compatibility).
 */
export interface ReviewReportsPageProps {
  /** @deprecated No-op; kept for forward-compatibility. */
  onResolveReport?: never;
}

export function ReviewReportsPage(
  _props: ReviewReportsPageProps = {},
): React.ReactElement {
  const { isLive, value } = useAdminFeatureFlag('admin_review_moderation_live');

  // The default placeholder shipped with Batch A is replaced by
  // the full composition when the flag is `'enabled'`. The
  // `'live'` value is documented as an alias for the full surface
  // (see `useAdminFeatureFlag`); the two branches are equivalent.
  if (!isLive) {
    // When the flag is `'placeholder'` the documented "coming soon"
    // notice is shown (it is the discoverable dev affordance). Any
    // other non-live value (e.g. `'disabled'`) renders the
    // "disabled" notice so QA can distinguish the two.
    if (value === 'placeholder') {
      return <ReviewReportsComingSoon />;
    }
    return <ReviewReportsDisabled />;
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="review-reports-page"
    >
      <AdminPageHeader
        title="Review moderation"
        description="Triage and resolve reports filed against quiz reviews."
      />
      <ReviewReportsList />
    </div>
  );
}