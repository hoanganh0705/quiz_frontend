/**
 * `app/admin/users/roles/page.tsx`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.A3.
 *
 * ## Purpose
 *
 * Thin route file. Reserves the `/admin/users/roles` slot
 * inside the Epic 7.2 admin route group ahead of the Story 7.10
 * user-role admin surface landing. This file:
 *   1. Delegates rendering to `<UserRoleAdminRouteHandoff />` from
 *      `./_components/UserRoleAdminRouteHandoff`.
 *   2. Is protected by the Epic 7.2 outer shells:
 *      - `src/proxy.ts` (route-prefix `/admin/*` guard, see `ADMIN_PREFIXES`)
 *      - `AdminLayoutShell` in the parent `admin/layout.tsx`
 *      - `AdminFeatureFlagBoundary` (the `admin_live` parent gate)
 *      - `AdminRoleGuard` (client-side role re-check, Epic 7.1)
 *   3. Is additionally gated by `admin_user_role_live` (the per-area
 *      sub-flag) inside the handoff component.
 *
 * ## What this file does NOT do
 *
 * - Does NOT call `grantUserRole`, `revokeUserRole`, `getUserRoles`,
 *   or any service directly.
 * - Does NOT manage any `useState` for user selection, loading, or dialogs.
 * - Does NOT own any mutation logic.
 * - Does NOT use axios or fetch directly (the cross-batch
 *   `admin-no-axios-or-fetch` invariant from
 *   `scripts/admin-lint-invariants.mjs` enforces this).
 *
 * All state and mutations are owned by the components inside
 * `features/admin/user-role-admin/components/`, which will be
 * implemented in Batches C–F of Epic 7.10. The F1 ticket
 * (`TKT-7.10.F1`) will extend this handoff to delegate to
 * `<UserRoleAdminPage />` once the page lands.
 */

import { UserRoleAdminRouteHandoff } from './_components/UserRoleAdminRouteHandoff';

export default function UserRoleAdminPage() {
  return <UserRoleAdminRouteHandoff />;
}
