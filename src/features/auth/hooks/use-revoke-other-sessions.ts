'use client';

/**
 * `useRevokeOtherSessions` — list-level "Revoke all others" hook
 * with confirmation discipline.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T18.
 *
 * ## Confirmation discipline
 *
 * The hook owns a single piece of state that downstream UIs
 * read: `requiresConfirmation`. While `true`, the caller MUST
 * display a confirmation modal sourced from `security-copy.ts`
 * (`revoke.others.title` / `revoke.others.body`) and only invoke
 * `revokeOthers({ confirmed: true })` from the confirm button.
 *
 * The `confirmed: true` flag is required even though the modal
 * wiring is the only call site. Two reasons:
 *
 *   1. **Test seam.** A unit test can drive the hook directly
 *      without spinning up a modal.
 *   2. **Defensive.** If the modal is bypassed by a future bug,
 *      the hook still rejects the call. The flag is the
 *      authoritative confirmation, not the modal's existence.
 *
 * ## Pending semantics
 *
 * While `status === 'pending'`, the caller MUST disable the CTA
 * (T19 enforces this). The hook's `revokeOthers` is idempotent
 * under concurrent calls — a second invocation while pending is
 * silently dropped (returns immediately).
 *
 * ## Current-session preservation (US-2.8.2 contract)
 *
 * The shared refresh/final-logout policy owns the 401 path.
 * This hook NEVER calls `clearAuthToken` /
 * `clearAllAuthCache` / `broadcastLogout` — the service
 * `revokeOtherSessions()` (T4) does not run finalize, and the
 * hook does not run it either. The current session MUST remain
 * valid after a successful "Revoke all others" call.
 *
 * ## Error classification
 *
 * Failures route through `mapSessionError({ target: 'revoke-others' })`.
 *
 *   - `retryable` — banner from `sessionList.error.revokeOthersFailed`
 *   - `conflict`  — banner from `sessionList.error.revokeOthersFailed`
 *     (the same copy; the others-revoke path does not surface
 *     conflict separately because the only conflict here is "a
 *     session disappeared mid-call" which is the same UX as a
 *     transient retry)
 *   - `auth_terminal` — shared refresh/final-logout policy owns
 *     this; the hook surfaces `error.classification` but does
 *     not act
 *
 * @see SessionList (2.8.T14)
 * @see mapSessionError (2.8.T2)
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  revokeOtherSessions as defaultRevokeOtherSessions,
} from '@/features/auth/service/auth.service';
import {
  mapSessionError,
  type SessionErrorClassification,
} from '@/features/auth/errors/session-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import type { SessionManagementResultDto } from '@/lib/api';

export type UseRevokeOtherSessionsStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error';

export interface UseRevokeOtherSessionsError {
  classification: SessionErrorClassification;
  cause: ApiError | unknown;
}

export interface RevokeOthersArgs {
  /**
   * Required confirmation flag. See file header for rationale.
   */
  confirmed: boolean;
}

export interface UseRevokeOtherSessionsResult {
  /**
   * `true` while no confirmation modal has resolved. The caller
   * shows the modal first; once the user confirms, this drops
   * back to `false` for the duration of the request.
   *
   * Starts `true` on every fresh `idle`/`success`/`error` state
   * — the hook resets it after each call so the modal must be
   * shown again on the next attempt.
   */
  requiresConfirmation: boolean;
  status: UseRevokeOtherSessionsStatus;
  error: UseRevokeOtherSessionsError | null;
  /**
   * Trigger the flow. Pass `{ confirmed: true }` from the modal's
   * confirm button. Pass `{ confirmed: false }` (or call without
   * args) to enter the requires-confirmation state — useful when
   * the caller wants the modal to appear without firing yet.
   */
  revokeOthers: (args?: RevokeOthersArgs) => Promise<void>;
  /**
   * Cancel a pending confirmation without firing. Resets the
   * hook back to its `idle` state.
   */
  cancelConfirmation: () => void;
  /**
   * Reset terminal state so the UI can re-attempt. Clears
   * `error` and `requiresConfirmation`.
   */
  reset: () => void;
}

export interface UseRevokeOtherSessionsDeps {
  revokeOtherSessions: () => Promise<SessionManagementResultDto>;
}

export const defaultRevokeOtherSessionsDeps: UseRevokeOtherSessionsDeps = {
  revokeOtherSessions: defaultRevokeOtherSessions,
};

export interface UseRevokeOtherSessionsOptions {
  listOps: {
    revalidate: () => Promise<void>;
  };
  deps?: UseRevokeOtherSessionsDeps;
}

export function useRevokeOtherSessions(
  options: UseRevokeOtherSessionsOptions,
): UseRevokeOtherSessionsResult {
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [status, setStatus] = useState<UseRevokeOtherSessionsStatus>('idle');
  const [error, setError] = useState<UseRevokeOtherSessionsError | null>(null);

  const deps = options.deps ?? defaultRevokeOtherSessionsDeps;
  const inFlightRef = useRef<Promise<void> | null>(null);

  const revokeOthers = useCallback(
    async (args?: RevokeOthersArgs): Promise<void> => {
      const confirmed = args?.confirmed === true;

      // No-confirmation path: just enter the requires-confirmation
      // state. The caller will re-invoke with `{ confirmed: true }`
      // from the modal's confirm button.
      if (!confirmed) {
        setRequiresConfirmation(true);
        setStatus('idle');
        setError(null);
        return;
      }

      // Already pending → dedup.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setRequiresConfirmation(false);
      setStatus('pending');
      setError(null);

      const promise = (async (): Promise<void> => {
        try {
          await deps.revokeOtherSessions();
          // Success: revalidate so the empty-state ("only current
          // session remains") renders.
          await options.listOps.revalidate();
          setStatus('success');
        } catch (cause: unknown) {
          const apiErr = cause instanceof ApiError ? cause : null;
          const classification = mapSessionError({
            code: apiErr?.code ?? 'UNKNOWN',
            status: apiErr?.status ?? 0,
            target: 'revoke-others',
          });
          setError({ classification, cause });
          setStatus('error');
          // Revalidate on failure too — server state is the
          // source of truth, and a partial revocation may have
          // happened even when the call failed.
          await options.listOps.revalidate();
        } finally {
          inFlightRef.current = null;
        }
      })();

      inFlightRef.current = promise;
      return promise;
    },
    [deps, options.listOps],
  );

  const cancelConfirmation = useCallback((): void => {
    setRequiresConfirmation(false);
    setStatus('idle');
    setError(null);
  }, []);

  const reset = useCallback((): void => {
    setRequiresConfirmation(true);
    setStatus('idle');
    setError(null);
    inFlightRef.current = null;
  }, []);

  return useMemo(
    () => ({
      requiresConfirmation,
      status,
      error,
      revokeOthers,
      cancelConfirmation,
      reset,
    }),
    [
      requiresConfirmation,
      status,
      error,
      revokeOthers,
      cancelConfirmation,
      reset,
    ],
  );
}
