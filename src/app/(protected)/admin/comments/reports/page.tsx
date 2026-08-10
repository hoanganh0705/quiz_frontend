/**
 * `app/admin/comments/reports/page.tsx`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.A3.
 *
 * ## Purpose
 *
 * Thin route file. Reserves the `/admin/comments/reports` slot inside the
 * Epic 7.2 admin route group ahead of the Story 7.6 comment-moderation
 * queue landing. This file:
 *   1. Delegates rendering to `<CommentReportsRouteHandoff />` from
 *      `./_components/CommentReportsRouteHandoff`.
 *   2. Is protected by the Epic 7.2 outer shells:
 *      - `src/proxy.ts` (route-prefix `/admin/*` guard, see `ADMIN_PREFIXES`)
 *      - `AdminLayoutShell` in the parent `admin/layout.tsx`
 *      - `AdminFeatureFlagBoundary` (the `admin_live` parent gate)
 *      - `AdminRoleGuard` (client-side role re-check, Epic 7.1)
 *   3. Is additionally gated by `admin_comment_moderation_live` (the
 *      per-area sub-flag) inside `CommentReportsRouteHandoff`.
 *
 * ## What this file does NOT do
 *
 * - Does NOT call `listCommentReports` or `patchCommentReport` directly.
 * - Does NOT manage any `useState` for reports, loading, or dialogs.
 * - Does NOT own any mutation logic.
 * - Does NOT use axios or fetch directly (the cross-batch
 *   `admin-no-axios-or-fetch` invariant from
 *   `scripts/admin-lint-invariants.mjs` enforces this).
 *
 * All state and mutations are owned by the components inside
 * `features/admin/comment-moderation/components/`, which are implemented
 * in Batches C–F of Epic 7.6.
 */

import { CommentReportsRouteHandoff } from './_components/CommentReportsRouteHandoff';

export default function AdminCommentReportsPage() {
  return <CommentReportsRouteHandoff />;
}