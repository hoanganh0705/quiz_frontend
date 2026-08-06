'use client';

/**
 * `features/admin/hooks/usePermission.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.B2.
 *
 * ## Purpose
 *
 * Selector hook exposing whether the current user holds a specific
 * Phase 7 admin permission. Backed by the runtime role-grant lookup
 * (`useAdminRole` → `useEffectivePermissions`, TKT-7.1.B3) so a
 * `true` here means a real-time, role-document-derived boolean —
 * never a stale cached flag.
 *
 * ## Cross-batch invariants
 *
 *   - **No identity in hooks**: this hook returns a boolean only. The
 *     user's role string is read from `useAdminRole`, never surfaced.
 *   - **Stable reference**: the returned boolean is recomputed every
 *     render, but consumers should treat this as a primitive. Do not
 *     destructure into objects (per Phase 4 selector rule — see the
 *     note in `useUserStore`).
 *
 * ## Loading semantics
 *
 *   - `isLoading: true` while `useAdminRole` has not resolved
 *     (identity bootstrap).
 *   - `false` once the role document is loaded. A `false` value is
 *     authoritative; a `true` value is also authoritative (the user's
 *     role document has the permission).
 *   - `error` exposes the role-fetch error, if any.
 *
 * ## SSR-safety
 *
 *   Returns the same primitives during SSR (`false`, `isLoading: true`,
 *   `error: null`) that it does on first render. Server-side rendering
 *   never calls `localStorage` or `window`.
 */

import { useAdminRole } from './useAdminRole';
import type { AdminPermission } from '../permissions';

export interface UsePermission {
  isLoading: boolean;
  error: Error | null;
  hasPermission: boolean;
}

export function usePermission(name: AdminPermission): UsePermission {
  const role = useAdminRole();
  const isLoading = role.isLoading;
  const error = role.error;
  const hasPermission = role.permissions.includes(name);
  return { isLoading, error, hasPermission };
}
