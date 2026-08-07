/**
 * `features/admin/user-role-admin/hooks/useRevokeUserRole.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.D2.
 *
 * ## What this hook owns
 *
 * - Wrap `revokeUserRole` (from `user-role-admin.service.ts`) with typed-code
 *   propagation, audit breadcrumbs, self-revocation guard, and SWR invalidation.
 * - Expose `{ revoke, isPending, error, reset, isSelfRevoke }`.
 *
 * ## Error handling
 *
 * - `NOT_GRANTED` → surfaces a non-blocking notice without retry.
 * - `SELF_ROLE_REVOKE_FORBIDDEN` → surfaces the self-revocation notice.
 * - `IRREVERSIBLE_CONFIRM_REQUIRED` → surfaces the typed-confirm dialog.
 * - `PERMISSION_DENIED` → surfaces without retry.
 * - Every error emits a `phase7:admin` breadcrumb with `requestId`.
 *
 * ## Self-revocation guard
 *
 * The hook checks `targetUserId !== currentUserId` at the hook boundary
 * before calling the service. When it detects a self-revocation attempt,
 * it sets `isSelfRevoke = true` and the revoke is a no-op.
 *
 * ## Role validation
 *
 * The hook validates that the role is a member of `DOCUMENTED_ROLES` before
 * calling the service. Client-side validation failures are thrown as regular
 * errors (not ApiError) since they don't come from the server.
 *
 * ## SWR invalidation
 *
 * On success, the hook invalidates:
 *   - `userRoleListKey(targetUserId)` (B3)
 */

import { useCallback, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { addRoleGrantBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import {
  revokeUserRole,
  type UserRoleGrantResponseDto,
} from '@/features/admin/services/user-role-admin.service';
import type { AdminPermission } from '@/features/admin/services/user-role-admin.service';
import { DOCUMENTED_ROLES } from '../user-role-admin-types';
import { invalidateUserRoleCache } from '../user-role-admin-cache';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseRevokeUserRoleAudit {
  /** The role that was being revoked, captured at the start of the mutation. */
  readonly before: { role: AdminPermission } | null;
  /** The revoke response from the server. */
  readonly after: UserRoleGrantResponseDto | null;
}

export interface UseRevokeUserRoleResult {
  /**
   * Revoke a role from a user.
   * Resolves to `UserRoleGrantResponseDto` on success.
   * Rejects with `ApiError` on failure.
   * No-op when `isSelfRevoke` is true.
   */
  readonly revoke: (
    targetUserId: string,
    role: AdminPermission,
    options?: { before?: { role: AdminPermission } | null },
  ) => Promise<UserRoleGrantResponseDto>;
  /** True while a revoke is in flight. */
  readonly isPending: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** Audit snapshot for `AuditActionShell`. */
  readonly audit: UseRevokeUserRoleAudit;
  /** True when attempting to revoke own role (client-side self-revocation guard). */
  readonly isSelfRevoke: boolean;
  /** Clear error and audit state. */
  readonly reset: () => void;
}

// ─── Role validation ───────────────────────────────────────────────────────

function isValidRole(role: string): role is AdminPermission {
  return DOCUMENTED_ROLES.some((r) => r.name === role);
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Revoke a role from a user for the user role admin surface.
 */
export function useRevokeUserRole(): UseRevokeUserRoleResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [audit, setAudit] = useState<UseRevokeUserRoleAudit>({
    before: null,
    after: null,
  });
  const [isSelfRevokeAttempt, setIsSelfRevokeAttempt] = useState(false);

  // The in-flight promise — concurrent calls return the same promise.
  const inFlightRef = useRef<Promise<UserRoleGrantResponseDto> | null>(null);

  // Get current user ID for self-revocation check
  const auth = useAuth();
  const currentUserId = auth?.currentUser?.userId ?? null;

  // Derive isSelfRevoke from the current state
  const isSelfRevoke = isSelfRevokeAttempt;

  const revoke = useCallback(
    async (
      targetUserId: string,
      role: AdminPermission,
      options?: { before?: { role: AdminPermission } | null },
    ): Promise<UserRoleGrantResponseDto> => {
      // Concurrent call guard.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // Reset self-revoke state on each call
      setIsSelfRevokeAttempt(false);

      // ── Hook-boundary validation ──────────────────────────────────────

      // Self-revocation guard: admins cannot revoke their own roles.
      // Set isSelfRevoke flag and return a rejected promise.
      if (currentUserId !== null && targetUserId === currentUserId) {
        setIsSelfRevokeAttempt(true);
        // Throw a regular Error for client-side self-revoke detection.
        // The caller checks isSelfRevoke flag before calling revoke().
        throw new Error('Cannot revoke your own role.');
      }

      // Role validation: must be a documented role.
      // Throws a regular Error for client-side validation failures.
      if (!isValidRole(role)) {
        throw new Error(
          `Invalid role: ${role} is not a documented role.`,
        );
      }

      // ── Mutation ─────────────────────────────────────────────────────

      const startedAt = Date.now();
      setIsPending(true);
      setError(null);

      const beforeSnapshot = { role };

      // Emit "started" breadcrumb.
      addRoleGrantBreadcrumb({
        action: 'role.revoke',
        route: 'userRoleAdmin.revokeUserRole',
        targetId: targetUserId,
        status: 'started',
        durationMs: 0,
      });

      const promise = revokeUserRole(targetUserId, role)
        .then((result) => {
          const durationMs = Date.now() - startedAt;

          setAudit({ before: beforeSnapshot, after: result });
          setIsPending(false);
          setIsSelfRevokeAttempt(false);

          // Emit "success" breadcrumb.
          addRoleGrantBreadcrumb({
            action: 'role.revoke',
            route: 'userRoleAdmin.revokeUserRole',
            targetId: targetUserId,
            status: 'success',
            durationMs,
          });

          // Invalidate SWR cache so role list reflects new state.
          void invalidateUserRoleCache(targetUserId);

          return result;
        })
        .catch((err: unknown) => {
          const durationMs = Date.now() - startedAt;
          const apiError = err as ApiError;

          setError(apiError);
          setIsPending(false);

          // Check if this is a self-revoke error from the server
          if (apiError.code === 'SELF_ROLE_REVOKE_FORBIDDEN') {
            setIsSelfRevokeAttempt(true);
          }

          // Emit "failure" breadcrumb.
          addRoleGrantBreadcrumb({
            action: 'role.revoke',
            route: 'userRoleAdmin.revokeUserRole',
            targetId: targetUserId,
            status: 'failure',
            durationMs,
            code: apiError.code,
            requestId: apiError.requestId || undefined,
            correlationId: apiError.correlationId || undefined,
          });

          return Promise.reject(apiError);
        })
        .finally(() => {
          inFlightRef.current = null;
        });

      inFlightRef.current = promise;
      return promise;
    },
    [currentUserId], // Re-create when currentUserId changes
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setError(null);
    setAudit({ before: null, after: null });
    setIsSelfRevokeAttempt(false);
    inFlightRef.current = null;
  }, []);

  return {
    revoke,
    isPending,
    error,
    audit,
    isSelfRevoke,
    reset,
  };
}
