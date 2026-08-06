'use client';

/**
 * `app/admin/reviews/reports/_components/ReviewReportsRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.5.
 * Source ticket: TKT-7.5.A3.
 *
 * ## Purpose
 *
 * Dev-time observability component rendered by the `/admin/reviews/reports`
 * route. Calls `addReviewModerationBreadcrumb` on mount so QA can verify
 * the route passes through the Epic 7.1 Sentry helpers. Then delegates
 * to `ReviewReportsPage`.
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
      action: 'review.reports.mount',
      route: 'review-reports.page',
      status: 'started',
      durationMs: 0,
    });
  }, []);

  return <ReviewReportsPage />;
}
