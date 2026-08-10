/**
 * `features/admin/user-role-admin/hooks/useGrantUserRole.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.D1.
 *
 * ## What this hook owns
 *
 * - Wrap `grantUserRole` (from `user-role-admin.service.ts`) with typed-code
 *   propagation, audit breadcrumbs, and SWR invalidation.
 * - Expose `{ grant, isPending, error, reset }`.
 *
 * ## Error handling
 *
 * - `ROLE_NOT_FOUND` → surfaces the typed code without retry.
 * - `ALREADY_GRANTED` → surfaces a non-blocking notice without retry.
 * - `IRREVERSIBLE_CONFIRM_REQUIRED` → surfaces the typed-confirm dialog.
 * - `PERMISSION_DENIED` → surfaces without retry.
 * - Every error emits a `admin:7.1` breadcrumb with `requestId`.
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
import { addRoleGrantBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
  grantUserRole,
  type UserRoleGrantResponseDto,
} from '@/features/admin/services/user-role-admin.service';
import type { AdminPermission } from '@/features/admin/services/user-role-admin.service';
import { DOCUMENTED_ROLES } from '../user-role-admin-types';
import { invalidateUserRoleCache } from '../user-role-admin-cache';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseGrantUserRoleAudit {
  /** The role granted, captured at the start of the mutation. */
  readonly before: null;
  /** The grant response from the server. */
  readonly after: UserRoleGrantResponseDto | null;
}

export interface UseGrantUserRoleResult {
  /**
   * Grant a role to a user.
   * Resolves to `UserRoleGrantResponseDto` on success.
   * Rejects with `ApiError` on failure.
   */
  readonly grant: (
    targetUserId: string,
    role: AdminPermission,
    options?: { before?: null },
  ) => Promise<UserRoleGrantResponseDto>;
  /** True while a grant is in flight. */
  readonly isPending: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** Audit snapshot for `AuditActionShell`. */
  readonly audit: UseGrantUserRoleAudit;
  /** Clear error and audit state. */
  readonly reset: () => void;
}

// ─── Role validation ───────────────────────────────────────────────────────

function isValidRole(role: string): role is AdminPermission {
  return DOCUMENTED_ROLES.some((r) => r.name === role);
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Grant a role to a user for the user role admin surface.
 */
export function useGrantUserRole(): UseGrantUserRoleResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [audit, setAudit] = useState<UseGrantUserRoleAudit>({
    before: null,
    after: null,
  });

  // The in-flight promise — concurrent calls return the same promise.
  const inFlightRef = useRef<Promise<UserRoleGrantResponseDto> | null>(null);

  const grant = useCallback(
    async (
      targetUserId: string,
      role: AdminPermission,
      _options?: { before?: null },
    ): Promise<UserRoleGrantResponseDto> => {
      // Concurrent call guard.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // ── Hook-boundary validation ──────────────────────────────────────

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

      // Emit "started" breadcrumb.
      addRoleGrantBreadcrumb({
        action: 'role.grant',
        route: 'userRoleAdmin.grantUserRole',
        targetId: targetUserId,
        status: 'started',
        durationMs: 0,
      });

      const promise = grantUserRole(targetUserId, { role })
        .then((result) => {
          const durationMs = Date.now() - startedAt;

          setAudit({ before: null, after: result });
          setIsPending(false);

          // Emit "success" breadcrumb.
          addRoleGrantBreadcrumb({
            action: 'role.grant',
            route: 'userRoleAdmin.grantUserRole',
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

          // Emit "failure" breadcrumb.
          addRoleGrantBreadcrumb({
            action: 'role.grant',
            route: 'userRoleAdmin.grantUserRole',
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
    [], // No dependencies - all values are captured via closure
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setError(null);
    setAudit({ before: null, after: null });
    inFlightRef.current = null;
  }, []);

  return {
    grant,
    isPending,
    error,
    audit,
    reset,
  };
}
