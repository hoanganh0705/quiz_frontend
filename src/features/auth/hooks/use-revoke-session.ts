'use client';

/**
 * `useRevokeSession` — per-row revocation hook with optimistic
 * update + current-session finalization.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T17.
 *
 * ## Purpose
 *
 * Single hook per row. Each `<SessionRow />` in the active-sessions
 * list instantiates its own `useRevokeSession` so the pending
 * state and the rollback target are isolated to that row — T13
 * enforces this by passing `pending` from the parent.
 *
 * ## Optimistic update discipline
 *
 * 1. On `revoke()`, the hook removes the target row from the list
 *    via `useActiveSessions.mutate()` immediately (no network wait).
 * 2. The network call fires. On success, the list is revalidated
 *    so any concurrent server-side changes (e.g. someone else
 *    revoked another session) are reflected.
 * 3. On a non-`'current'` failure, the row is restored via the
 *    inverse `mutate()` so the user sees the failed action
 *    disappear, then reappear — never silently disappear.
 *
 * ## Current-session finalization
 *
 * If `isCurrentSession: true` is passed, the hook routes the call
 * through `revokeCurrentSession(sessionId)` (T5/6) instead of the
 * plain `revokeSession`. That function runs the shared logout
 * finalization (clear cookie, clear cache, broadcast) *only on
 * backend success*, then returns a discriminated union. On
 * success the hook routes to `/login` via `useRouter`. The
 * service-level finalize is the SINGLE place this discipline
 * lives — the hook never duplicates it.
 *
 * ## Error classification
 *
 * Failures are routed through `mapSessionError(...)` with the
 * appropriate `target`:
 *
 *   - `'other'` — for non-current revocations
 *   - `'self'`  — for current-session revocations
 *
 * The mapper returns:
 *
 *   - `already_revoked` — silent revalidate (the row was gone
 *     server-side before our request landed; treat as success
 *     from the user's perspective)
 *   - `current_revoked` — only on `'self'`, runs the finalize path
 *   - `auth_terminal`   — shared refresh/final-logout policy owns this
 *   - `conflict`        — banner copy from `sessionList.error.conflict`
 *   - `retryable`       — banner copy from `sessionList.error.revokeFailed`
 *
 * ## 401 handling
 *
 * A final `401` flows through the shared refresh policy in
 * `custom-instance.ts` (Epic 2.7). This hook does NOT handle it
 * specially; the policy will run final logout when the refresh
 * also fails.
 *
 * @see SessionRow (2.8.T13)
 * @see useActiveSessions (2.8.T8)
 * @see mapSessionError (2.8.T2)
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  revokeSession as defaultRevokeSession,
  revokeCurrentSession as defaultRevokeCurrentSession,
  type RevokeCurrentSessionResult,
} from '@/features/auth/services/auth.service';
import {
  mapSessionError,
  type SessionErrorClassification,
} from '@/features/auth/errors/session-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import type { SessionListItemDto, SessionManagementResultDto } from '@/lib/api';

export type UseRevokeSessionStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error';

export interface UseRevokeSessionError {
  /**
   * UI-facing classification. The hook never surfaces the raw
   * `ApiError` directly — the mapper collapses it into a kind
   * the consumer can branch on with copy.
   */
  classification: SessionErrorClassification;
  /**
   * Raw error from the network call. Preserved for logging
   * and for tests that want to assert on `status`/`code` directly.
   */
  cause: ApiError | unknown;
}

export interface UseRevokeSessionResult {
  status: UseRevokeSessionStatus;
  error: UseRevokeSessionError | null;
  revoke: () => Promise<void>;
}

export interface UseRevokeSessionOptions {
  /**
   * The opaque session UUID to revoke. Required.
   */
  sessionId: string;
  /**
   * Whether the row is the current session. Required — the hook
   * uses this to route the call through `revokeCurrentSession`
   * when `true`.
   */
  isCurrentSession: boolean;
  /**
   * The row to optimistically remove. Required. The hook reads
   * `sessionId` from this rather than from `options.sessionId`
   * to guarantee the same identity lands in the inverse `mutate`.
   */
  session: SessionListItemDto;
  /**
   * Dependency injection seam for tests. Production callers leave
   * this `undefined` and the hook uses the auth-service wrappers.
   */
  deps?: UseRevokeSessionDeps;
  /**
   * List-mutation primitives. The parent wires these into the
   * shared `useActiveSessions` instance so the optimistic update
   * touches the same list the row is rendered from.
   */
  listOps: {
    mutate: (updater: (current: SessionListItemDto[]) => SessionListItemDto[]) => void;
    revalidate: () => Promise<void>;
  };
}

export interface UseRevokeSessionDeps {
  revokeSession: (sessionId: string) => Promise<SessionManagementResultDto>;
  revokeCurrentSession: (sessionId: string) => Promise<RevokeCurrentSessionResult>;
}

export const defaultRevokeSessionDeps: UseRevokeSessionDeps = {
  revokeSession: defaultRevokeSession,
  revokeCurrentSession: defaultRevokeCurrentSession,
};

/**
 * Build the inverse-update function: insert the row back into the
 * list at the position it was removed from. We restore by `sessionId`
 * so concurrent reorders do not place the row in the wrong spot.
 */
function makeRestoreUpdater(
  removed: SessionListItemDto,
): (current: SessionListItemDto[]) => SessionListItemDto[] {
  return (current) => {
    if (current.some((s) => s.sessionId === removed.sessionId)) {
      return current; // already restored; idempotent
    }
    return [...current, removed];
  };
}

export function useRevokeSession(
  options: UseRevokeSessionOptions,
): UseRevokeSessionResult {
  const router = useRouter();
  const [status, setStatus] = useState<UseRevokeSessionStatus>('idle');
  const [error, setError] = useState<UseRevokeSessionError | null>(null);

  const deps = options.deps ?? defaultRevokeSessionDeps;
  const removedRef = useRef<SessionListItemDto | null>(null);

  const target: 'self' | 'other' = options.isCurrentSession ? 'self' : 'other';

  const revoke = useCallback(async (): Promise<void> => {
    if (status === 'pending') return;
    setStatus('pending');
    setError(null);

    const removed = options.session;
    removedRef.current = removed;

    // Optimistic remove.
    options.listOps.mutate((current) =>
      current.filter((s) => s.sessionId !== removed.sessionId),
    );

    if (options.isCurrentSession) {
      // Current-session path: route through the finalize helper.
      // The service is the SINGLE place that runs clear-token +
      // clear-cache + broadcast on backend success; the hook
      // simply routes the result.
      try {
        const result = await deps.revokeCurrentSession(removed.sessionId);

        if (result.kind === 'success') {
          setStatus('success');
          // Finalize already happened in the service. Route away.
          router.push('/login');
          return;
        }

        // Backend returned a structured error — finalize did NOT
        // run. Roll back the optimistic update and surface.
        options.listOps.mutate(makeRestoreUpdater(removed));
        const classification = mapSessionError({
          code: result.error.code,
          status: result.error.status,
          target,
        });
        setError({ classification, cause: result.error });
        setStatus('error');

        // `current_revoked` is special: the backend confirms the
        // current session is gone, but our local call returned
        // an error code (e.g. transient finalize failure). The
        // session IS gone server-side; we still route to /login
        // because the user is no longer authenticated.
        if (classification.kind === 'current_revoked') {
          router.push('/login');
        }
      } catch (cause: unknown) {
        // Defensive: the service should always return a structured
        // result and never throw, but a thrown error still needs
        // rollback + classification.
        options.listOps.mutate(makeRestoreUpdater(removed));
        const apiErr = cause instanceof ApiError ? cause : null;
        const classification = mapSessionError({
          code: apiErr?.code ?? 'UNKNOWN',
          status: apiErr?.status ?? 0,
          target,
        });
        setError({ classification, cause });
        setStatus('error');
        if (classification.kind === 'current_revoked') {
          router.push('/login');
        }
      }
      return;
    }

    // Non-current path: optimistic + rollback on failure.
    try {
      await deps.revokeSession(removed.sessionId);
      // Success — revalidate so any concurrent changes appear.
      await options.listOps.revalidate();
      setStatus('success');
    } catch (cause: unknown) {
      // Restore the row.
      options.listOps.mutate(makeRestoreUpdater(removed));
      const apiErr = cause instanceof ApiError ? cause : null;
      const classification = mapSessionError({
        code: apiErr?.code ?? 'UNKNOWN',
        status: apiErr?.status ?? 0,
        target,
      });

      // `already_revoked` is silent success — the row was already
      // gone server-side. Don't surface a banner. Do revalidate so
      // any concurrent changes reflect.
      if (classification.kind === 'already_revoked') {
        await options.listOps.revalidate();
        setStatus('success');
        return;
      }

      setError({ classification, cause });
      setStatus('error');
    }
  }, [
    status,
    options,
    deps,
    target,
    router,
  ]);

  return useMemo(
    () => ({ status, error, revoke }),
    [status, error, revoke],
  );
}
