/**
 * `app/admin/audit/page.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.D1.
 *
 * Thin route file. Reserves the `/admin/audit` slot inside the
 * Epic 7.2 admin route group ahead of the Story 7.11 audit log
 * surface landing.
 *
 *   1. Delegates rendering to `<AuditLogRouteHandoff />` from
 *      `./_components/AuditLogRouteHandoff`.
 *   2. Is protected by the Epic 7.2 outer shells:
 *      - `src/proxy.ts` (route-prefix `/admin/*` guard)
 *      - `AdminLayoutShell` in the parent `admin/layout.tsx`
 *      - `AdminFeatureFlagBoundary` (the `admin_live` parent gate)
 *      - `AdminRoleGuard` (client-side role re-check, Epic 7.1)
 *   3. Is additionally gated by `admin_audit_live` (the per-area
 *      sub-flag) inside the handoff component.
 */

import { AuditLogRouteHandoff } from './_components/AuditLogRouteHandoff';

export default function AdminAuditPage() {
  return <AuditLogRouteHandoff />;
}