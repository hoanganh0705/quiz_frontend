'use client';

/**
 * `app/admin/reviews/reports/_components/ReviewReportsRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.5.
 * Source tickets: TKT-7.5.A3 (placeholder) → TKT-7.5.F2
 *   (route-level wiring with dev-time observability).
 *
 * ## Purpose
 *
 * Dev-time observability component rendered by the `/admin/reviews/reports`
 * route. Calls `addReviewModerationBreadcrumb` on mount so QA can verify
 * the route passes through the Epic 7.1 Sentry helpers. Then delegates
 * to `ReviewReportsPage`.
 *
 * The breadcrumb's `action` is `review.moderation.mount` (the F2
 * documented stable string). The previous A3 placeholder used
 * `review.reports.mount`; the F2 ticket supersedes that name so the
 * observability string matches the Epic 7.5 surface vocabulary.
 *
 * No network calls; purely a diagnostic shell. The breadcrumb is purely
 * opt-in observability and never blocks rendering.
 */

import { useEffect } from 'react';

import { addReviewModerationBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import { ReviewReportsPage } from '@/features/admin/review-moderation/components/ReviewReportsPage';

export function ReviewReportsRouteHandoff() {
  useEffect(() => {
    addReviewModerationBreadcrumb({
      action: 'review.moderation.mount',
      route: 'admin-review-moderation.page',
      status: 'started',
      durationMs: 0,
    });
  }, []);

  return <ReviewReportsPage />;
}