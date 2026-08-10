'use client';

/**
 * `features/admin/hooks/useAdminRole.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.B3.
 *
 * ## Purpose
 *
 * Selector hook returning the current user's effective admin role and
 * the documentation-derived permission list. The slim `/auth/me`
 * payload (`CurrentUserResponseDto`) exposes `role: string`; this hook
 * maps the role slug onto the documented Phase 7 permission catalogue
 * (Epic 7.1 §User Flow, master plan Phase 7 Admin Role Mapping lines
 * 491–494).
 *
 * ## Role → permission mapping
 *
 * The mapping is documented and exhaustive:
 *
 *   - `'admin'`     → all `PERMISSIONS` keys (superuser).
 *   - `'moderator'` → review/comment moderation only.
 *   - everything else (including `null` / unauthenticated) → `[]`.
 *
 * Future roles are added by extending the `ROLE_PERMISSION_MAP`. The
 * invariant is "every documented Phase 7 capability either has an
 * explicit slugs→permissions mapping here, or it is admin-only". This
 * is verified in the audit-shell integration test (TKT-7.1.E9) and
 * lint-script `admin-lint-invariants.mjs` (TKT-7.1.B6).
 *
 * ## SSR / loading
 *
 *   - During SSR and during the initial identity bootstrap the hook
 *     returns `permissions: []`, `role: null`, `isLoading: true`,
 *     `error: null`.
 *   - The first non-loading render is the resolution from the
 *     `/auth/me` payload (`useAuth` → `CurrentUserResponseDto`).
 *
 * ## Cross-store invariants
 *
 *   - Reads the existing `useAuth` hook (Phase 2 / 7.1 cross-reference).
 *     When the user's `role` field is absent (older backend versions),
 *     the fallback `useAdminIdentity` chain (TKT-7.1.D3) supplies the
 *     resolved role string.
 */

import { useMemo } from 'react';

import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from '../permissions';

export interface AdminRoleDocument {
  isLoading: boolean;
  error: Error | null;
  role: string | null;
  permissions: readonly AdminPermission[];
}

/**
 * Static mapping from documented role slugs to the permissions they
 * receive. The mapping is exhaustive over the catalogued phases —
 * see `admin-lint-invariants.mjs` `role-permission-map-exhaustive`.
 */
export const ROLE_PERMISSION_MAP: Readonly<Record<string, readonly AdminPermission[]>> =
  Object.freeze({
    admin: ADMIN_PERMISSIONS,
    moderator: Object.freeze([
      'review_report_read',
      'review_report_update',
      'comment_report_read',
      'comment_report_update',
      'comment_hide',
      'comment_restore',
    ]),
  }) as Readonly<Record<string, readonly AdminPermission[]>>;

/**
 * Pure role→permissions resolver. The function is exported so the
 * unit spec can exercise it independently of the React hook tree.
 */
export function resolveAdminPermissions(
  role: string | null,
): readonly AdminPermission[] {
  if (typeof role !== 'string') return [];
  const granted = ROLE_PERMISSION_MAP[role];
  return granted ?? [];
}

/**
 * `useAdminRole` — read-only selector hook exposing the current
 * user's resolved admin role document.
 */
export function useAdminRole(): AdminRoleDocument {
  const auth = useAuth();
  const role: string | null = auth?.currentUser?.role ?? null;
  const permissions = useMemo(
    () => resolveAdminPermissions(role),
    [role],
  );
  return {
    isLoading: auth?.isLoading ?? true,
    error: auth?.error ?? null,
    role,
    permissions,
  };
}
