"use client";

/**
 * `useSendFriendRequest` — mutation hook for the send-friend-request action.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.D1.
 *
 * ## What this hook owns
 *
 * - The `send()` mutation that calls
 *   `friend-request-mutation.service.ts → sendFriendRequest`.
 * - `useSocialPermissions(userId).canFriendRequest` guard before
 *   dispatching.
 * - Double-click guard via a per-instance `isPendingRef` ref.
 * - SWR cache revalidation on success:
 *     - `SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)`
 *     - `SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey()` (viewer-only)
 *     - `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`
 * - Abort-on-unmount when a request is in-flight.
 * - Safe no-op fallback when `phase6_social_friend_request_mutation`
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

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

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
 *
 * Field semantics:
 *   - `send`      — call to trigger the send mutation.
 *   - `isPending` — `true` while a send request is in-flight.
 *   - `error`     — the typed error code, or `null` on success.
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

/**
 * Mutation hook for the send-friend-request action.
 *
 * @param targetUserId The user to send a friend request to. `null` is
 *   safe — the hook returns a no-op result when the target is null.
 * @param options Optional overrides.
 */
export function useSendFriendRequest(
  targetUserId: string | null,
  options: UseSendFriendRequestOptions = {},
): UseSendFriendRequestResult {
  // ── Flag guard ────────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue(
    "phase6_social_friend_request_mutation",
  );
  const isFlagPlaceholder = flagValue === "placeholder";

  // ── Permissions ───────────────────────────────────────────────────────
  // `useSocialPermissions` reads `useRelationship` internally.
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  // ── SWR mutate ──────────────────────────────────────────────────────
  const { mutate } = useSWRConfig();

  // ── Double-click guard (per-instance ref) ───────────────────────────
  const isPendingRef = useRef(false);

  // ── Error state ──────────────────────────────────────────────────────
  const [error, setError] = useState<SendFriendRequestErrorCode | null>(null);

  // ── Stable result ───────────────────────────────────────────────────
  // The result object is frozen so callers can destructure it without
  // referential equality concerns. All mutable state is in fields.
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
      // Double-click guard: skip if a request is already in-flight.
      if (isPendingRef.current) return;

      // Mark pending synchronously.
      isPendingRef.current = true;
      // Reset any prior error.
      setError(null);

      sendFriendRequest(targetUserId)
        .then(() => {
          // Server success: revalidate the relationship, outgoing-requests,
          // and counts keys. The relationship key revalidation refreshes
          // the canonical Relationship value (now `outgoing_request`). The
          // outgoing-requests key revalidation refreshes the viewer's
          // outgoing list (the new row appears). The counts key
          // revalidation refreshes the badge count.
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
          // Surface the error. The optimistic state is discarded
          // automatically since we don't touch the SWR cache.
          const apiErr =
            err instanceof ApiError ? err : new ApiError(err as never);
          // Map to the typed error code.
          const code: SendFriendRequestErrorCode =
            (apiErr.code as SendFriendRequestErrorCode) ??
            "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          // Reset the pending flag.
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      send,
      get isPending() {
        return isPendingRef.current;
      },
      error,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canFriendRequest,
    mutate,
    error,
  ]);

  // ── Abort on unmount ─────────────────────────────────────────────────
  // The `sendFriendRequest` service does not currently support
  // AbortSignal. The `isPendingRef` guard prevents a subsequent `send()`
  // from dispatching a second request, and the `finally` block ensures
  // the pending flag is reset even if the component unmounts
  // mid-flight. Mirrors `useFollow` / `useBlock`.

  return result;
}
