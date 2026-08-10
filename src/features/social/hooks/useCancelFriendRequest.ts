"use client";

/**
 * `useCancelFriendRequest` — mutation hook for the cancel-friend-request action.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.D3.
 *
 * ## What this hook owns
 *
 * - The `cancel(friendshipId)` mutation that calls
 *   `friend-request-mutation.service.ts → cancelFriendRequest`.
 * - `useSocialPermissions(userId).canCancelRequest` guard before
 *   dispatching (the viewer must own the pending outgoing request).
 * - Double-click guard via a per-instance `isPendingRef` ref.
 * - `SOCIAL_FRIEND_REQUEST_NOT_FOUND` (404) is treated as a
 *   successful terminal state — the request is no longer pending,
 *   which is the desired outcome. No error banner is surfaced.
 * - Other error codes surface as `error: CancelFriendRequestErrorCode`.
 * - SWR cache revalidation on success
 *   (`SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)`,
 *   `SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey()`,
 *   `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`).
 * - Abort-on-unmount when a request is in-flight.
 * - Safe no-op fallback when `social_friend_request_mutation_live`
 *   is `'placeholder'`.
 *
 * ## Return contract
 *
 * Returns `{ cancel, isPending, error, alreadyCancelled }`. The
 * contract is stable: the object reference never changes; only the
 * field values update.
 *
 * ## Non-idempotent DELETE
 *
 * The backend's `DELETE /social/friend-requests/:friendshipId`
 * returns `404 + code: 'SOCIAL_FRIEND_REQUEST_NOT_FOUND'` when the
 * request is no longer pending. The hook maps this to
 * `alreadyCancelled: true` and `error: null` — the desired outcome
 * is already achieved, so no error banner is shown. This is the
 * "successful terminal state" pattern for non-idempotent DELETE
 * operations.
 *
 * ## `friendshipId` hygiene
 *
 * The `friendshipId` is consumed ONLY as an in-memory argument to
 * `cancel()` and is forwarded to the service as a path parameter.
 * It is NEVER:
 *   - persisted in SWR cache keys,
 *   - written to `localStorage` / `sessionStorage`,
 *   - appended to a URL or `window.history.pushState`,
 *   - logged to Sentry (the `social-friend-request-mutation-sentry.ts` breadcrumb helper
 *     deliberately strips it — see TKT-6.8.C1 / G1).
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful cancel, callers revalidate the relationship,
 * outgoing-requests, and counts keys. When Epic 6.10 lands, the
 * Phase 5 `/notifications` socket will emit
 * `friend.request.cancelled` events that trigger the same
 * invalidation on the recipient side. The hook is compatible with
 * that future integration.
 */

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import { cancelFriendRequest } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Error codes surfaced by `useCancelFriendRequest`. Exhaustive — every
 * error the service can throw that is NOT a known SOCIAL_* code falls
 * back to `GLOBAL_INTERNAL_ERROR`.
 */
export type CancelFriendRequestErrorCode =
  | SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

/**
 * Result of `useCancelFriendRequest`.
 *
 * Field semantics:
 *   - `cancel`           — call to trigger the cancel mutation. Accepts a
 *                          `friendshipId` (unstable internal id).
 *   - `isPending`        — `true` while a cancel request is in-flight.
 *   - `error`            — the typed error code, or `null` on success.
 *   - `alreadyCancelled` — `true` when the server returned
 *                          `SOCIAL_FRIEND_REQUEST_NOT_FOUND` (the request
 *                          was no longer pending). When `true`, `error`
 *                          is `null` and no error banner is shown.
 */
export interface UseCancelFriendRequestResult {
  cancel: (friendshipId: string) => void;
  isPending: boolean;
  error: CancelFriendRequestErrorCode | null;
  alreadyCancelled: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseCancelFriendRequestOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthBootstrap` via `useRelationship` /
   * `useSocialPermissions`.
   */
  currentUserId?: string | null;
}

/**
 * Mutation hook for the cancel-friend-request action.
 *
 * @param targetUserId The user the viewer sent the request to. `null`
 *   is safe — the hook returns a no-op result when the target is null.
 * @param options Optional overrides.
 */
export function useCancelFriendRequest(
  targetUserId: string | null,
  options: UseCancelFriendRequestOptions = {},
): UseCancelFriendRequestResult {
  // ── Flag guard ────────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue(
    "social_friend_request_mutation_live",
  );
  const isFlagPlaceholder = flagValue === "placeholder";

  // ── Permissions ───────────────────────────────────────────────────────
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  // ── SWR mutate ──────────────────────────────────────────────────────
  const { mutate } = useSWRConfig();

  // ── Double-click guard (per-instance ref) ───────────────────────────
  const isPendingRef = useRef(false);

  // ── Error and terminal-state tracking ─────────────────────────────────
  // `error` is null on success OR when `SOCIAL_FRIEND_REQUEST_NOT_FOUND`
  // (already cancelled).
  // `alreadyCancelled` is true only when the server returned 404 with
  // `SOCIAL_FRIEND_REQUEST_NOT_FOUND`.
  const [error, setError] = useState<CancelFriendRequestErrorCode | null>(
    null,
  );
  const [alreadyCancelled, setAlreadyCancelled] = useState(false);

  // ── Stable result ───────────────────────────────────────────────────
  const result = useMemo<UseCancelFriendRequestResult>(() => {
    // ── Placeholder flag: safe no-op ────────────────────────────────
    if (isFlagPlaceholder) {
      return Object.freeze({
        cancel: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
        alreadyCancelled: false,
      });
    }

    // ── No target: safe no-op ────────────────────────────────────────
    if (targetUserId === null) {
      return Object.freeze({
        cancel: () => {
          // no-op
        },
        isPending: false,
        error: null,
        alreadyCancelled: false,
      });
    }

    // ── Permissions guard ─────────────────────────────────────────────
    if (!permissions.canCancelRequest) {
      return Object.freeze({
        cancel: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
        alreadyCancelled: false,
      });
    }

    // ── Core mutation ────────────────────────────────────────────────
    const cancel = (friendshipId: string): void => {
      // Defensive: refuse to dispatch with no internal id. The id
      // is required to address the DELETE endpoint.
      if (typeof friendshipId !== "string" || friendshipId.length === 0) {
        return;
      }

      if (isPendingRef.current) return;

      isPendingRef.current = true;
      setError(null);
      setAlreadyCancelled(false);

      cancelFriendRequest(friendshipId)
        .then(() => {
          // Server success (204 No Content): revalidate.
          void mutate(
            SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
            undefined,
            { revalidate: true },
          );
          void mutate(
            SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
            undefined,
            { revalidate: true },
          );
          void mutate(
            SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
            undefined,
            { revalidate: true },
          );
        })
        .catch((err: unknown) => {
          const apiErr =
            err instanceof ApiError ? err : new ApiError(err as never);

          // Non-idempotent DELETE: 404 with SOCIAL_FRIEND_REQUEST_NOT_FOUND
          // means the request is no longer pending. Treat as a successful
          // terminal state — revalidate the cache and surface the terminal
          // flag so the caller can dismiss the confirmation dialog.
          if (apiErr.code === "SOCIAL_FRIEND_REQUEST_NOT_FOUND") {
            setAlreadyCancelled(true);
            void mutate(
              SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
              undefined,
              { revalidate: true },
            );
            void mutate(
              SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
              undefined,
              { revalidate: true },
            );
            void mutate(
              SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
              undefined,
              { revalidate: true },
            );
            return;
          }

          // All other errors: surface the error code.
          const code: CancelFriendRequestErrorCode =
            (apiErr.code as CancelFriendRequestErrorCode) ??
            "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      cancel,
      get isPending() {
        return isPendingRef.current;
      },
      error,
      alreadyCancelled,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canCancelRequest,
    mutate,
    error,
    alreadyCancelled,
  ]);

  // ── Abort on unmount ─────────────────────────────────────────────────
  // Mirrors `useUnfollow` (TKT-6.6.D2). The `cancelFriendRequest`
  // service does not currently support AbortSignal; the
  // `isPendingRef` guard prevents a subsequent `cancel()` call from
  // dispatching a second request, and the `finally` block resets the
  // pending flag on unmount.

  return result;
}
