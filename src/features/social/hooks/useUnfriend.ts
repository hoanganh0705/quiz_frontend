"use client";

/**
 * `useUnfriend` — mutation hook for the unfriend action.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.D4.
 *
 * ## What this hook owns
 *
 * - The `unfriend(userId)` mutation that calls
 *   `friend-request-mutation.service.ts → unfriend`.
 * - `useSocialPermissions(userId).canUnfriend` guard before
 *   dispatching.
 * - Double-click guard via a per-instance `isPendingRef` ref.
 * - `SOCIAL_FRIENDSHIP_NOT_FOUND` (404) is treated as a successful
 *   terminal state — the user is already not-friends, which is the
 *   desired outcome. No error banner is surfaced.
 * - Other error codes surface as `error: UnfriendErrorCode`.
 * - SWR cache revalidation on success
 *   (`SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)`,
 *   `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`).
 * - Abort-on-unmount when a request is in-flight.
 * - Safe no-op fallback when `phase6_social_friend_request_mutation`
 *   is `'placeholder'`.
 *
 * ## Return contract
 *
 * Returns `{ unfriend, isPending, error, alreadyNotFriends }`. The
 * contract is stable: the object reference never changes; only the
 * field values update.
 *
 * ## Non-idempotent DELETE
 *
 * The backend's `DELETE /social/friends/:userId` returns
 * `404 + code: 'SOCIAL_FRIENDSHIP_NOT_FOUND'` when the viewer is not
 * currently friends with the target. The hook maps this to
 * `alreadyNotFriends: true` and `error: null` — the desired outcome
 * is already achieved, so no error banner is shown. This is the
 * "successful terminal state" pattern for non-idempotent DELETE
 * operations.
 *
 * The `unfriend` hook does NOT auto-cancel a pending friend request
 * — the two are independent operations (per the cancel-dialog copy,
 * TKT-6.8.F2). If the viewer has a pending outgoing request, the
 * request must be cancelled separately via `useCancelFriendRequest`.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful unfriend (including the
 * `SOCIAL_FRIENDSHIP_NOT_FOUND` terminal state), callers revalidate
 * the relationship and counts keys. When Epic 6.10 lands, the Phase
 * 5 `/notifications` socket will emit `friend.removed` events that
 * trigger the same invalidation. The hook is compatible with that
 * future integration.
 */

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import { unfriend } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Error codes surfaced by `useUnfriend`. Exhaustive — every error the
 * service can throw that is NOT a known SOCIAL_* code falls back to
 * `GLOBAL_INTERNAL_ERROR`.
 */
export type UnfriendErrorCode =
  | SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

/**
 * Result of `useUnfriend`.
 *
 * Field semantics:
 *   - `unfriend`           — call to trigger the unfriend mutation.
 *   - `isPending`          — `true` while an unfriend request is
 *                           in-flight.
 *   - `error`              — the typed error code, or `null`.
 *   - `alreadyNotFriends`  — `true` when the server returned
 *                           `SOCIAL_FRIENDSHIP_NOT_FOUND` (the viewer
 *                           was already not friends with the target).
 *                           When `true`, `error` is `null` and no
 *                           error banner is shown.
 */
export interface UseUnfriendResult {
  unfriend: () => void;
  isPending: boolean;
  error: UnfriendErrorCode | null;
  alreadyNotFriends: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseUnfriendOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthBootstrap` via `useRelationship` /
   * `useSocialPermissions`.
   */
  currentUserId?: string | null;
}

/**
 * Mutation hook for the unfriend action.
 *
 * @param targetUserId The user to unfriend. `null` is safe — the hook
 *   returns a no-op result when the target is null.
 * @param options Optional overrides.
 */
export function useUnfriend(
  targetUserId: string | null,
  options: UseUnfriendOptions = {},
): UseUnfriendResult {
  // ── Flag guard ────────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue(
    "phase6_social_friend_request_mutation",
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
  // `error` is null on success OR when `SOCIAL_FRIENDSHIP_NOT_FOUND`.
  // `alreadyNotFriends` is true only when the server returned 404 with
  // `SOCIAL_FRIENDSHIP_NOT_FOUND`.
  const [error, setError] = useState<UnfriendErrorCode | null>(null);
  const [alreadyNotFriends, setAlreadyNotFriends] = useState(false);

  // ── Stable result ───────────────────────────────────────────────────
  const result = useMemo<UseUnfriendResult>(() => {
    // ── Placeholder flag: safe no-op ────────────────────────────────
    if (isFlagPlaceholder) {
      return Object.freeze({
        unfriend: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
        alreadyNotFriends: false,
      });
    }

    // ── No target: safe no-op ────────────────────────────────────────
    if (targetUserId === null) {
      return Object.freeze({
        unfriend: () => {
          // no-op
        },
        isPending: false,
        error: null,
        alreadyNotFriends: false,
      });
    }

    // ── Permissions guard ─────────────────────────────────────────────
    if (!permissions.canUnfriend) {
      return Object.freeze({
        unfriend: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
        alreadyNotFriends: false,
      });
    }

    // ── Core mutation ────────────────────────────────────────────────
    const unfriendAction = (): void => {
      if (isPendingRef.current) return;

      isPendingRef.current = true;
      // Reset prior state.
      setError(null);
      setAlreadyNotFriends(false);

      unfriend(targetUserId)
        .then(() => {
          // Server success (204 No Content): revalidate.
          void mutate(
            SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
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

          // Non-idempotent DELETE: 404 with SOCIAL_FRIENDSHIP_NOT_FOUND
          // means the viewer was already not friends with the target.
          // Treat as a successful terminal state — revalidate the cache
          // and surface the terminal flag so the caller can dismiss the
          // confirmation dialog.
          if (apiErr.code === "SOCIAL_FRIENDSHIP_NOT_FOUND") {
            setAlreadyNotFriends(true);
            void mutate(
              SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
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
          const code: UnfriendErrorCode =
            (apiErr.code as UnfriendErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      unfriend: unfriendAction,
      get isPending() {
        return isPendingRef.current;
      },
      error,
      alreadyNotFriends,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canUnfriend,
    mutate,
    error,
    alreadyNotFriends,
  ]);

  // ── Abort on unmount ─────────────────────────────────────────────────
  // Mirrors `useUnfollow` (TKT-6.6.D2). The `unfriend` service does
  // not currently support AbortSignal; the `isPendingRef` guard
  // prevents a subsequent `unfriend()` call from dispatching a second
  // request, and the `finally` block resets the pending flag on
  // unmount.

  return result;
}
