'use client';

/**
 * `features/admin/components/AdminFeatureFlagBoundary.tsx`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.B1.
 *
 * ## Purpose
 *
 * Composes `AdminShellUnavailable` around any admin shell content, using the
 * `admin_live` feature flag as the gate. When the flag is explicitly
 * `'placeholder'` (e.g. for a preview / staging environment) the
 * entire admin shell is replaced with the "coming soon" notice.
 * The default is now `'live'` because every Phase 7 admin surface
 * is wired and reachable from the admin shell.
 *
 * This is the outermost boundary of the admin route group — it runs before
 * `AdminRoleGuard` (TKT-7.2.B2) so that a disabled flag short-circuits
 * the entire shell before any role check fires.
 *
 * ## Ordering guarantee
 *
 * `<AdminFeatureFlagBoundary>` is rendered as the outermost wrapper in the
 * route-group layout.  Inside it sits `<AdminRoleGuard>` (TKT-7.2.B2).
 * The combined decision matrix is documented in TKT-7.2.B3.
 *
 * ## Fail-closed semantics
 *
 * The hook is synchronous and build-time-resolved.  Any unexpected runtime
 * exception is not caught by this component — it propagates to the
 * `error.tsx` boundary registered by TKT-7.2.A3.
 */

import type { ReactNode } from 'react';

import { AdminShellUnavailable } from './AdminShellUnavailable';
import { useAdminFeatureFlag } from '../hooks/useAdminFeatureFlag';

export interface AdminFeatureFlagBoundaryProps {
  children: ReactNode;
}

/**
 * Gates admin shell content with the `admin_live` feature flag.
 * Renders the "coming soon" surface when the flag is off.
 */
export function AdminFeatureFlagBoundary({
  children,
}: AdminFeatureFlagBoundaryProps) {
  const { isLive } = useAdminFeatureFlag('admin_live');

  if (!isLive) {
    return (
      <AdminShellUnavailable>{children}</AdminShellUnavailable>
    );
  }

  return <>{children}</>;
}
