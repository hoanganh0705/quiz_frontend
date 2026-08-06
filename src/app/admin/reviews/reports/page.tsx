'use client';

/**
 * `app/admin/reviews/reports/page.tsx`
 *
 * Source epic:   Epic 7.5.
 * Source ticket: TKT-7.5.A3.
 *
 * ## Purpose
 *
 * Thin route file. Reserves the `/admin/reviews/reports` slot inside the
 * Epic 7.2 admin route group ahead of the Story 7.5 review-moderation
 * queue landing. This file:
 *   1. Delegates rendering to `<ReviewReportsRouteHandoff />` from
 *      `./_components/ReviewReportsRouteHandoff`.
 *   2. Is protected by the Epic 7.2 outer shells:
 *      - `src/proxy.ts` (route-prefix `/admin/*` guard, see `ADMIN_PREFIXES`)
 *      - `AdminLayoutShell` in the parent `admin/layout.tsx`
 *      - `AdminFeatureFlagBoundary` (the `phase7_admin` parent gate)
 *      - `AdminRoleGuard` (client-side role re-check, Epic 7.1)
 *   3. Is additionally gated by `phase7_admin_review_moderation` (the
 *      per-area sub-flag) inside `ReviewReportsPage`.
 *
 * ## What this file does NOT do
 *
 * - Does NOT call `listReviewReports` or `patchReviewReport` directly.
 * - Does NOT manage any `useState` for reports, loading, or dialogs.
 * - Does NOT own any mutation logic.
 * - Does NOT use axios or fetch directly (the cross-batch
 *   `admin-no-axios-or-fetch` invariant from
 *   `scripts/phase7-lint-invariants.mjs` enforces this).
 *
 * All state and mutations are owned by the components inside
 * `features/admin/review-moderation/components/`, which are implemented
 * in Batches C–F of Epic 7.5.
 */

import { ReviewReportsRouteHandoff } from './_components/ReviewReportsRouteHandoff';

export default function AdminReviewReportsPage() {
  return <ReviewReportsRouteHandoff />;
}
