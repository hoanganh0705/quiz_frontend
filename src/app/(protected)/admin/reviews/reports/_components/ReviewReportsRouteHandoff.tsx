'use client';

import { useEffect } from 'react';

import { addReviewModerationBreadcrumb } from '@/lib/admin/admin_live_sentry';

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