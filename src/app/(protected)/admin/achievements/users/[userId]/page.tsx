'use client';

/**
 * `app/admin/achievements/users/[userId]/page.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.A3.
 *
 * ## Purpose
 *
 * Thin route file. Reserves the `/admin/achievements/users/:userId` slot
 * inside the Epic 7.2 admin route group ahead of the Story 7.8
 * achievement-admin surface landing. This file:
 *   1. Delegates rendering to `<AchievementAdminUserRouteHandoff />` from
 *      `./_components/AchievementAdminUserRouteHandoff`.
 *   2. Is protected by the Epic 7.2 outer shells:
 *      - `src/proxy.ts` (route-prefix `/admin/*` guard, see `ADMIN_PREFIXES`)
 *      - `AdminLayoutShell` in the parent `admin/layout.tsx`
 *      - `AdminFeatureFlagBoundary` (the `admin_live` parent gate)
 *      - `AdminRoleGuard` (client-side role re-check, Epic 7.1)
 *   3. Is additionally gated by `admin_achievement_live` (the per-area
 *      sub-flag) inside the handoff component.
 *
 * ## What this file does NOT do
 *
 * - Does NOT call `getUserBadges`, `reevaluateUserAchievements`,
 *   `revokeUserBadge`, or `getUserAchievementHistory` directly.
 * - Does NOT manage any `useState` for badges, loading, or dialogs.
 * - Does NOT own any mutation logic.
 * - Does NOT use axios or fetch directly (the cross-batch
 *   `admin-no-axios-or-fetch` invariant from
 *   `scripts/admin-lint-invariants.mjs` enforces this).
 *
 * All state and mutations are owned by the components inside
 * `features/admin/achievement-admin/components/`, which will be
 * implemented in Batches C–F of Epic 7.8. The F2 ticket
 * (`TKT-7.8.F2`) will extend this handoff to delegate to
 * `<AchievementAdminUserPage />` once the page lands.
 */

import { AchievementAdminUserRouteHandoff } from './_components/AchievementAdminUserRouteHandoff';

export default function AdminAchievementUserPage({
  params,
}: {
  params: { userId: string };
}) {
  return <AchievementAdminUserRouteHandoff userId={params.userId} />;
}
