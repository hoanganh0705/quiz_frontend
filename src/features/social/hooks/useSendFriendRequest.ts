"use client";

/**
 * `useSendFriendRequest` — mutation hook for the send-friend-request action.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.D1.
 *
 * TKT-7.5 cleanup, Phase 6 / P1-7: the hook now delegates to
 * `useOptimisticMutation` (the canonical Phase 4 mutation primitive).
 *
 * ## What this hook owns
 *
 * - The `send()` mutation that calls
 *   `friend-request-mutation.service.ts → sendFriendRequest`.
 * - `useSocialPermissions(userId).canFriendRequest` guard before
 *   dispatching.
 * - SWR cache revalidation on success:
 *     - `SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)`
 *     - `SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey()` (viewer-only)
 *     - `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`
 * - Safe no-op fallback when `social_friend_request_mutation_live`
 *   is `'placeholder'`.
 *
 * ## Return contract
 *
 * Returns `{ send, isPending, error }`. The contract is stable:
 * the object reference never changes; only the field values update.
 *
 * ## Optimistic update authority
 *
 * The hook does NOT mutate the authoritative SWR cache optimistically.
 * The cache is revalidated on success via `mutate` (the SWR global).
 * On error, the previous authoritative state (from SWR) is preserved.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful send, callers revalidate the relationship,
 * outgoing-requests, and counts keys. When Epic 6.10 lands, the
 * Phase 5 `/notifications` socket will emit
 * `friend.request.received` events that trigger the same
 * invalidation on the recipient side. The hook is compatible with
 * that future integration.
 *
 * ## `friendshipId` hygiene
 *
 * The backend returns 201 / 204 No Content on success — no internal
 * `friendshipId` is returned to the caller. The hook does not persist
 * the unstable `friendshipId` in SWR cache keys, URL state, or
 * analytics payloads (the `friendshipId` is exposed only inside
 * `useRespondFriendRequest` / `useCancelFriendRequest` to cancel or
 * respond to the pending request).
 */

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { sendFriendRequest } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Error codes surfaced by `useSendFriendRequest`. Exhaustive — every
 * error the service can throw that is NOT a known SOCIAL_* code falls
 * back to `GLOBAL_INTERNAL_ERROR`.
 */
export type SendFriendRequestErrorCode =
  | SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

/**
 * Result of `useSendFriendRequest`.
 */
export interface UseSendFriendRequestResult {
  send: () => void;
  isPending: boolean;
  error: SendFriendRequestErrorCode | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseSendFriendRequestOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthBootstrap` via `useRelationship` /
   * `useSocialPermissions`.
   */
  currentUserId?: string | null;
}

const COOLDOWN_MS = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────

function classifySendFriendRequestError(
  cause: unknown,
): SendFriendRequestErrorCode {
  if (cause instanceof ApiError) {
    return (cause.code as SendFriendRequestErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
  return "GLOBAL_INTERNAL_ERROR";
}

/**
 * Mutation hook for the send-friend-request action.
 */
export function useSendFriendRequest(
  targetUserId: string | null,
  options: UseSendFriendRequestOptions = {},
): UseSendFriendRequestResult {
  // ── Flag guard ────────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue(
    "social_friend_request_mutation_live",
  );
  const isFlagPlaceholder = flagValue === "placeholder";

  // ── Permissions ───────────────────────────────────────────────────────
  // `useSocialPermissions` reads `useRelationship` internally.
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  // ── SWR mutate ──────────────────────────────────────────────────────
  const { mutate } = useSWRConfig();

  // ── Optimistic mutation primitive ──────────────────────────────────
  const { mutate: dispatchMutation, isInFlight, lastResult } =
    useOptimisticMutation();

  const revalidate = useCallback(
    async (userId: string): Promise<void> => {
      await Promise.all([
        mutate(SOCIAL_CACHE_KEYS.makeRelationshipKey(userId), undefined, {
          revalidate: true,
        }),
        mutate(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(), undefined, {
          revalidate: true,
        }),
        mutate(SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId), undefined, {
          revalidate: true,
        }),
      ]);
    },
    [mutate],
  );

  const error: SendFriendRequestErrorCode | null =
    lastResult && lastResult.status === "reverted"
      ? classifySendFriendRequestError(lastResult.apiError)
      : null;

  // ── Stable result ───────────────────────────────────────────────────
  const result = useMemo<UseSendFriendRequestResult>(() => {
    // ── Placeholder flag: safe no-op ────────────────────────────────
    if (isFlagPlaceholder) {
      return Object.freeze({
        send: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
      });
    }

    // ── No target: safe no-op ────────────────────────────────────────
    if (targetUserId === null) {
      return Object.freeze({
        send: () => {
          // no-op
        },
        isPending: false,
        error: null,
      });
    }

    // ── Permissions guard ─────────────────────────────────────────────
    if (!permissions.canFriendRequest) {
      return Object.freeze({
        send: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
      });
    }

    // ── Core mutation ────────────────────────────────────────────────
    const send = (): void => {
      void dispatchMutation({
        key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
        optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
        run: async () => {
          await sendFriendRequest(targetUserId);
          await revalidate(targetUserId);
        },
        cooldownMs: COOLDOWN_MS,
      });
    };

    return Object.freeze({
      send,
      isPending: isInFlight,
      error,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canFriendRequest,
    dispatchMutation,
    isInFlight,
    error,
    revalidate,
  ]);

  return result;
}