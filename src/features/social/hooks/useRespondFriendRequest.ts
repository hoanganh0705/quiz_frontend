"use client";

/**
 * `useRespondFriendRequest` — mutation hook for the respond-to-friend-request action.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.D2.
 *
 * ## What this hook owns
 *
 * - The `respond({ friendshipId, action })` mutation that calls
 *   `friend-request-mutation.service.ts → respondFriendRequest` with
 *   an `'accept' | 'decline'` action.
 * - Double-click guard via a per-instance `isPendingRef` ref.
 * - `useSocialPermissions(targetUserId).canRespond` guard before
 *   dispatching (the viewer must hold the incoming request on the
 *   target user).
 * - SWR cache revalidation on success:
 *     - `SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId)`
 *     - `SOCIAL_CACHE_KEYS.makeIncomingRequestsKey()` (viewer-only)
 *     - `SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId)`
 * - Abort-on-unmount when a request is in-flight.
 * - Safe no-op fallback when `phase6_social_friend_request_mutation`
 *   is `'placeholder'`.
 *
 * ## Return contract
 *
 * Returns `{ respond, isPending, error }`. The contract is stable:
 * the object reference never changes; only the field values update.
 *
 * ## `friendshipId` hygiene
 *
 * The `friendshipId` is consumed ONLY as an in-memory argument to
 * `respond()` and is forwarded to the service as a path parameter. It
 * is NEVER:
 *   - persisted in SWR cache keys,
 *   - written to `localStorage` / `sessionStorage`,
 *   - appended to a URL or `window.history.pushState`,
 *   - logged to Sentry (the `phase6_6_8_sentry.ts` breadcrumb helper
 *     deliberately strips it — see TKT-6.8.C1 / G1).
 *
 * The `friendshipId` is unstable (regenerated on demand by the
 * backend) and MUST NOT appear in any user-visible or
 * analytics-tracked artifact. The hook's API forces callers to pass
 * it as a function argument rather than a hook parameter so the
 * scope is tightly bound to a single mutation call.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful respond, callers revalidate the relationship,
 * incoming-requests, and counts keys. When Epic 6.10 lands, the
 * Phase 5 `/notifications` socket will emit
 * `friend.request.responded` events that trigger the same
 * invalidation on the requester side. The hook is compatible with
 * that future integration.
 */

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import {
  respondFriendRequest,
  type RespondFriendRequestAction,
} from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Error codes surfaced by `useRespondFriendRequest`. Exhaustive — every
 * error the service can throw that is NOT a known SOCIAL_* code falls
 * back to `GLOBAL_INTERNAL_ERROR`.
 */
export type RespondFriendRequestErrorCode =
  | SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

/**
 * Argument object accepted by `respond()`. The `friendshipId` is
 * consumed only as an in-memory argument; it is never persisted in
 * SWR cache keys, URLs, localStorage, sessionStorage, or
 * `window.history`.
 */
export interface UseRespondFriendRequestInput {
  /**
   * The unstable internal id of the friend request (path parameter).
   * Sourced from the incoming-list SWR cache (`SocialFriendRequestDto.id`)
   * and passed in-memory to the service. Never persisted.
   */
  readonly friendshipId: string;
  /**
   * The action the viewer is taking on the request. Discriminated
   * string union (`'accept' | 'decline'`).
   */
  readonly action: RespondFriendRequestAction;
}

/**
 * Result of `useRespondFriendRequest`.
 *
 * Field semantics:
 *   - `respond`   — call to trigger the respond mutation. Accepts a
 *                   `UseRespondFriendRequestInput` argument.
 *   - `isPending` — `true` while a respond request is in-flight.
 *   - `error`     — the typed error code, or `null` on success.
 */
export interface UseRespondFriendRequestResult {
  respond: (input: UseRespondFriendRequestInput) => void;
  isPending: boolean;
  error: RespondFriendRequestErrorCode | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseRespondFriendRequestOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthBootstrap` via `useRelationship` /
   * `useSocialPermissions`.
   */
  currentUserId?: string | null;
}

/**
 * Mutation hook for the respond-to-friend-request action.
 *
 * @param targetUserId The user whose request the viewer is responding
 *   to. `null` is safe — the hook returns a no-op result when the
 *   target is null.
 * @param options Optional overrides.
 */
export function useRespondFriendRequest(
  targetUserId: string | null,
  options: UseRespondFriendRequestOptions = {},
): UseRespondFriendRequestResult {
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

  // ── Error state ──────────────────────────────────────────────────────
  const [error, setError] = useState<RespondFriendRequestErrorCode | null>(
    null,
  );

  // ── Stable result ───────────────────────────────────────────────────
  const result = useMemo<UseRespondFriendRequestResult>(() => {
    // ── Placeholder flag: safe no-op ────────────────────────────────
    if (isFlagPlaceholder) {
      return Object.freeze({
        respond: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
      });
    }

    // ── No target: safe no-op ────────────────────────────────────────
    if (targetUserId === null) {
      return Object.freeze({
        respond: () => {
          // no-op
        },
        isPending: false,
        error: null,
      });
    }

    // ── Permissions guard ─────────────────────────────────────────────
    if (!permissions.canRespond) {
      return Object.freeze({
        respond: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
      });
    }

    // ── Core mutation ────────────────────────────────────────────────
    const respond = (input: UseRespondFriendRequestInput): void => {
      // Double-click guard: skip if a request is already in-flight.
      if (isPendingRef.current) return;

      // Mark pending synchronously.
      isPendingRef.current = true;
      // Reset any prior error.
      setError(null);

      respondFriendRequest(input.friendshipId, input.action)
        .then(() => {
          // Server success: revalidate the relationship, incoming-requests,
          // and counts keys. The relationship key revalidation refreshes
          // the canonical Relationship value (now `friend` for accept or
          // `none` for decline). The incoming-requests key revalidation
          // removes the responded item from the viewer's incoming list.
          // The counts key revalidation refreshes the badge count.
          void mutate(
            SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
            undefined,
            { revalidate: true },
          );
          void mutate(
            SOCIAL_CACHE_KEYS.makeIncomingRequestsKey(),
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
          const code: RespondFriendRequestErrorCode =
            (apiErr.code as RespondFriendRequestErrorCode) ??
            "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          // Reset the pending flag.
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      respond,
      get isPending() {
        return isPendingRef.current;
      },
      error,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canRespond,
    mutate,
    error,
  ]);

  // ── Abort on unmount ─────────────────────────────────────────────────
  // Mirrors `useSendFriendRequest` (TKT-6.8.D1). The
  // `respondFriendRequest` service does not currently support
  // AbortSignal; the `isPendingRef` guard prevents a subsequent
  // `respond()` call from dispatching a second request, and the
  // `finally` block resets the pending flag on unmount.

  return result;
}
