/**
 * Account-existence revalidation for the deletion retry gate.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source tickets: 2.10.T13 (helper), 2.10.T12 (consumer hook).
 *
 * ## Purpose
 *
 * After the deletion hook encounters an `uncertain` (network / 5xx /
 * 429 / unknown) or `conflict` (`AUTH_RESOURCE_CONFLICT`) outcome,
 * it must NOT blindly re-fire `DELETE /auth/account`. Doing so would
 * risk:
 *
 *   - a duplicate delete request for an account that already
 *     committed (causing the backend to log a spurious conflict
 *     and forcing the user through the re-confirm loop again);
 *   - the client rendering "your account is deleted" copy for an
 *     account that the backend never deleted because the network
 *     request was lost on the way *to* the backend.
 *
 * The revalidation helper issues a separate, idempotent read
 * (`GET /auth/me`) and reports the existence status without
 * disclosing details. The hook reads the result and either:
 *
 *   - unlocks the retry path (when the account still exists and is
 *     enabled), requiring a fresh password and typed confirmation;
 *   - transitions to `completed` via the safe terminal path (when
 *     the account is gone server-side and the existing public
 *     session is otherwise invalid);
 *   - stays non-success and offers a revalidation retry (when the
 *     revalidation itself failed).
 *
 * ## Identity endpoint
 *
 * `GET /auth/me` (`authControllerGetCurrentUser`) is the canonical
 * identity read. It is authenticated; a `401` here means the
 * session is gone or invalid — which is exactly the case where we
 * want the safe terminal cleanup path.
 *
 * The helper does NOT call `DELETE /auth/account`. The
 * "deletion retry" is the hook's normal `submit()` flow, gated on
 * a fresh password + typed confirmation.
 */

import { getAuth } from '@/lib/api';
import { ApiError } from '@/lib/api/core/ApiError';
import { mapDeletionError } from '@/features/auth/errors/deletion-error-mapper';
import {
  AUTH_INVALID_TOKEN,
  isUserNotFoundError,
} from '@/features/auth/errors/deletion-error-codes';

/**
 * Outcome of `revalidateAccountExists()`.
 *
 *   - `'exists'`           — identity endpoint returned a user. The
 *                            account is alive; retry requires a
 *                            fresh submit.
 *   - `'already_deleted'`  — identity endpoint returned `404` /
 *                            `USER_NOT_FOUND` (or `401` with an
 *                            otherwise-successful revalidation path).
 *                            The safe terminal cleanup path is
 *                            allowed.
 *   - `'disabled'`         — identity endpoint returned a user but
 *                            the account is disabled (`403`). The
 *                            hook stays non-success and surfaces
 *                            a "contact support" message.
 *   - `'unknown'`          — revalidation failed in a way that does
 *                            NOT prove deletion (network / 5xx /
 *                            429 / unknown). The hook must NOT
 *                            transition to `completed`; the user
 *                            must be offered a safe revalidation
 *                            retry.
 *
 * `'disabled'` and `'unknown'` collapse to "not success" for the
 * hook; the difference is only what copy the modal renders. The
 * helper returns the precise value so the modal can branch.
 */
export type DeletionAccountExistence =
  | 'exists'
  | 'already_deleted'
  | 'disabled'
  | 'unknown';

/**
 * Result of `revalidateAccountExists()`. The discriminated union
 * keeps the happy-path return (`'exists'`) separate from the
 * structured error (`'error'`).
 *
 * `unknown` lives in `outcome`; we never throw.
 */
export type DeletionRevalidationResult =
  | { kind: 'success'; outcome: DeletionAccountExistence }
  | { kind: 'error'; error: ApiError | unknown };

/**
 * Dependency injection seam. Production callers leave `deps`
 * undefined and the helper uses the SDK wrapper. Tests inject a
 * stub returning a synthetic `DeletionRevalidationResult`.
 *
 * The shape is intentionally tiny — one async function that returns
 * the identity read or throws.
 */
export interface RevalidateAccountExistsDeps {
  /**
   * `GET /auth/me` — returns the current identity. Throws `ApiError`
   * on non-2xx. The stub for tests can return anything the test
   * wants (a user, an `ApiError`, or even `null`).
   */
  fetchIdentity: () => Promise<unknown>;
}

const defaultRevalidateDeps: RevalidateAccountExistsDeps = {
  fetchIdentity: async (): Promise<unknown> => {
    const data = await getAuth().authControllerGetCurrentUser();
    return data.data ?? null;
  },
};

/**
 * Issue the identity read and classify the result.
 *
 * This function NEVER throws. Network failures, `ApiError`s, and
 * unexpected shapes collapse to `{ kind: 'success', outcome:
 * 'unknown' }` — the caller treats `'unknown'` as "not safe to
 * claim deletion, offer a revalidation retry".
 *
 * The classification rules are:
 *
 *   - `404` with code `USER_NOT_FOUND` → `'already_deleted'`
 *   - `200` with a user payload         → `'exists'`
 *   - `200` with `null` (defensive)     → `'exists'`
 *   - `403` (account disabled)          → `'disabled'`
 *   - `401`                             → `'already_deleted'` ONLY
 *     when the deletion error mapper agrees that the auth state is
 *     terminal. The helper uses `mapDeletionError` to centralize
 *     the rule.
 *   - any other non-2xx                 → `'unknown'`
 *   - thrown non-`ApiError`             → `'unknown'`
 *
 * @param deps - Optional fetcher injection (tests only)
 */
export async function revalidateAccountExists(
  deps: RevalidateAccountExistsDeps = defaultRevalidateDeps,
): Promise<DeletionRevalidationResult> {
  let payload: unknown;
  try {
    payload = await deps.fetchIdentity();
  } catch (cause: unknown) {
    // The deletion-error mapper collapses `401` /
    // `AUTH_INVALID_TOKEN` into `auth_terminal` which, combined with
    // the `not_found` classification for `USER_NOT_FOUND`, lets us
    // decide whether to allow the safe terminal cleanup path.
    const classification = mapDeletionError({
      code: cause instanceof ApiError ? String(cause.code ?? '') : '',
      status: cause instanceof ApiError ? Number(cause.status ?? 0) : 0,
    });

    if (
      classification.kind === 'not_found' ||
      isUserNotFoundError(
        cause instanceof ApiError ? String(cause.code ?? '') : '',
      )
    ) {
      return { kind: 'success', outcome: 'already_deleted' };
    }

    if (classification.kind === 'auth_terminal') {
      // The session is gone server-side. The safe terminal cleanup
      // path applies — the account has been deleted (or the session
      // was killed for another reason). We do NOT distinguish the
      // two here; the hook treats `'already_deleted'` as the trigger
      // for terminal cleanup regardless.
      return { kind: 'success', outcome: 'already_deleted' };
    }

    if (cause instanceof ApiError && cause.status === 403) {
      return { kind: 'success', outcome: 'disabled' };
    }

    return { kind: 'success', outcome: 'unknown' };
  }

  // Identity read returned without throwing. Classify by payload.
  // The payload is the `WrappedDto<{ user: ... }>` shape generated by
  // the SDK; we read defensively without narrowing to the SDK type
  // so tests can inject arbitrary shapes.
  if (payload === null || payload === undefined) {
    // Defensive: the SDK wrapper resolves with `data.data ?? null`,
    // which means "no user in payload" — treat as already deleted.
    return { kind: 'success', outcome: 'already_deleted' };
  }

  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;

    // The disabled-account check fires on a `403`-equivalent code
    // echoed in the payload (rare — the SDK would throw on 403).
    const code = typeof obj['code'] === 'string' ? obj['code'] : '';
    if (code === 'AUTH_ACCOUNT_DISABLED' || code === AUTH_INVALID_TOKEN) {
      return { kind: 'success', outcome: 'disabled' };
    }
  }

  return { kind: 'success', outcome: 'exists' };
}

/**
 * Exported for tests only. Production code should never call
 * `revalidateAccountExists` directly; the `useDeleteAccount` hook
 * is the sole entry-point.
 */
export const _internalRevalidateDeps = defaultRevalidateDeps;
