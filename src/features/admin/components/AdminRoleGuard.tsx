'use client';

/**
 * `features/admin/components/AdminRoleGuard.tsx`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.C1.
 *
 * Boundary component that wraps any admin surface (or the entire
 * admin shell) and re-checks `useAdminRole` before rendering. This
 * is the canonical client-side auth boundary for Phase 7 admin
 * surfaces. The existing route-prefix middleware
 * (`src/middleware.ts`) gates `/admin/*` at the request level;
 * `AdminRoleGuard` is the parallel runtime gate so each admin
 * surface inside `/admin/*` always renders nothing privileged
 * before the role resolves.
 *
 * Branch behaviour:
 *
 *   - `status === 'unknown'`    → skeleton (or supplied `fallback`)
 *                                 while the role is hydrating.
 *   - `status === 'non-admin'`  → `PermissionDeniedNotice`. The
 *                                 children are never rendered.
 *   - `status === 'admin'`      → children are rendered.
 *
 * Status derivation:
 *
 *   - `isLoading` from `useAdminRole` → `'unknown'`.
 *   - `role === 'admin'`             → `'admin'`.
 *   - any other role (or `null`)     → `'non-admin'`.
 *
 * Consumers should treat this component as the single gate; do not
 * inline `useAdminRole()` checks at the surface level when the
 * surface already wraps in `AdminRoleGuard`.
 */

import type { ReactNode } from 'react';

import { Loader2 } from 'lucide-react';

import { useAdminRole } from '../hooks/useAdminRole';
import { PermissionDeniedNotice } from './PermissionDeniedNotice';

export type AdminRoleStatus = 'unknown' | 'non-admin' | 'admin';

export interface AdminRoleGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminRoleGuard({ children, fallback }: AdminRoleGuardProps) {
  const role = useAdminRole();

  let status: AdminRoleStatus;
  if (role.isLoading) {
    status = 'unknown';
  } else if (role.role === 'admin') {
    status = 'admin';
  } else {
    status = 'non-admin';
  }

  if (status === 'unknown') {
    return (
      <>
        {fallback ?? (
          <div
            data-testid="admin-role-guard-skeleton"
            aria-busy="true"
            className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
          >
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            <span>Checking admin access…</span>
          </div>
        )}
      </>
    );
  }

  if (status === 'non-admin') {
    return (
      <div data-testid="admin-role-guard-denied">
        <PermissionDeniedNotice variant="route" />
      </div>
    );
  }

  return (
    <div data-testid="admin-role-guard-allowed" data-status={status}>
      {children}
    </div>
  );
}
