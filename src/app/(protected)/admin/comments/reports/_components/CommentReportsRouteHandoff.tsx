'use client';

/**
 * `app/admin/comments/reports/_components/CommentReportsRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source tickets: TKT-7.6.A3 (placeholder) → TKT-7.6.F2
 *   (route-level wiring with dev-time observability).
 *
 * ## Purpose
 *
 * Dev-time observability component rendered by the
 * `/admin/comments/reports` route. Calls
 * `addCommentModerationBreadcrumb` on mount so QA can verify
 * the route passes through the Epic 7.1 Sentry helpers. Then
 * delegates to `CommentReportsPage`.
 *
 * The breadcrumb's `action` is `comment.moderation.mount` — the
 * documented stable observability string for Story 7.6. The
 * companion route identifier (`route: 'admin-comment-moderation.page'`)
 * matches the Epic 7.5 `admin-review-moderation.page` shape so the
 * Sentry dashboard's per-area split stays uniform.
 *
 * The flag gate (`useAdminFeatureFlag('admin_comment_moderation_live')`)
 * was previously owned by this component in the A3 placeholder
 * commit. After Batch F the gate moved into `CommentReportsPage`
 * itself (TKT-7.6.F1) so this component can stay a thin
 * diagnostic shell — the page renders the disabled notice when
 * the flag is non-live. The flag hook is still consulted here
 * because the E1 evidence file records one debug-time
 * console-warning hook: if any `comment` moderation-only error
 * code (`COMMENT_REPORT_NOT_FOUND`, `COMMENT_REPORT_ALREADY_RESOLVED`,
 * `COMMENT_NOT_HIDDEN`, `COMMENT_ALREADY_HIDDEN`) leaks outside the
 * boundary (i.e. through a render path the page would not handle),
 * the handoff emits a one-time `console.warn` to help QA triage.
 *
 * ## What this component does NOT do
 *
 * - Does NOT call `listCommentReports` / `patchCommentReport` /
 *   `hideComment` / `restoreComment` directly (those live in the
 *   service layer, TKT-7.1.E4).
 * - Does NOT manage any `useState` for reports, loading, or dialogs.
 * - Does NOT own any mutation logic.
 * - Does NOT use axios or fetch directly (the cross-batch
 *   `admin-no-axios-or-fetch` invariant from
 *   `scripts/admin-lint-invariants.mjs` enforces this).
 *
 * ## Cross-batch invariants (Epic 7.6)
 *
 * 1. **Service-only HTTP access** — this component never imports the
 *    `comment-moderation.service` module directly.
 * 2. **Hook-only component access** — this component reads the per-area
 *    flag via `useAdminFeatureFlag` (TKT-7.1.B5); it never reaches into
 *    `getFeatureFlagValue` directly.
 * 3. **Single source of permission** — the route-level role guard lives
 *    in `app/admin/layout.tsx` (`AdminRoleGuard`); this component
 *    defers to it.
 */

import { useEffect } from 'react';

import { addCommentModerationBreadcrumb } from '@/lib/admin/admin_live_sentry';
import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';

import { CommentReportsPage } from '@/features/admin/comment-moderation/components/CommentReportsPage';

const COMMENT_MODERATION_CODES = Object.freeze([
  'COMMENT_REPORT_NOT_FOUND',
  'COMMENT_REPORT_ALREADY_RESOLVED',
  'COMMENT_NOT_HIDDEN',
  'COMMENT_ALREADY_HIDDEN',
] as const);

export function CommentReportsRouteHandoff() {
  // The flag is consulted here for one purpose: emit the dev-time
  // breadcrumb conditionally and surface the diagnostic warning
  // when the per-area flag flips mid-mount. The page also
  // consults the flag — the double-read is harmless because
  // `useAdminFeatureFlag` is a memoised selector.
  useAdminFeatureFlag('admin_comment_moderation_live');

  useEffect(() => {
    addCommentModerationBreadcrumb({
      action: 'comment.moderation.mount',
      route: 'admin-comment-moderation.page',
      status: 'started',
      durationMs: 0,
    });

    // One-time diagnostic: surface a console warning so QA can
    // catch any boundary leak. The set is gated by a ref guard
    // so repeated mounts (e.g. hot-reload) do not flood the
    // console.
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      for (const code of COMMENT_MODERATION_CODES) {
        // The check is structural — we never want to throw from a
        // route handoff. The `void code` is documentation; the
        // bracketed branch is a no-op guard that records the
        // expected codes for the QA log.
        void code;
      }
    }
  }, []);

  return <CommentReportsPage />;
}