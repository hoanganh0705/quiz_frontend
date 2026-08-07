"use client";

/**
 * `useRespondFriendRequest` — mutation hook for the respond-to-friend-request action.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.D2.
 *
 * TKT-7.5 cleanup, Phase 6 / P1-7: the hook now delegates to
 * `useOptimisticMutation` (the canonical Phase 4 mutation primitive).
 *
 * ## What this hook owns
 *
 * - The `respond({ friendshipId, action })` mutation that calls
 *   `friend-request-mutation.service.ts → respondFriendRequest` with
 *   an `'accept' | 'decline'` action.
 * - `useSocialPermissions(targetUserId).canRespond` guard before
 *   dispatching (the viewer must hold the incoming request on the
 *   target user).
 * - SWR cache revalidation on success:
 *     - `SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId)`
 *     - `SOCIAL_CACHE_KEYS.makeIncomingRequestsKey()` (viewer-only)
 *     - `SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId)`
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

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

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

const COOLDOWN_MS = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────

function classifyRespondFriendRequestError(
  cause: unknown,
): RespondFriendRequestErrorCode {
  if (cause instanceof ApiError) {
    return (cause.code as RespondFriendRequestErrorCode) ??
      "GLOBAL_INTERNAL_ERROR";
  }
  return "GLOBAL_INTERNAL_ERROR";
}

/**
 * Mutation hook for the respond-to-friend-request action.
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

  // ── Optimistic mutation primitive ──────────────────────────────────
  const { mutate: dispatchMutation, isInFlight, lastResult } =
    useOptimisticMutation();

  const revalidate = useCallback(
    async (userId: string): Promise<void> => {
      await Promise.all([
        mutate(SOCIAL_CACHE_KEYS.makeRelationshipKey(userId), undefined, {
          revalidate: true,
        }),
        mutate(SOCIAL_CACHE_KEYS.makeIncomingRequestsKey(), undefined, {
          revalidate: true,
        }),
        mutate(SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId), undefined, {
          revalidate: true,
        }),
      ]);
    },
    [mutate],
  );

  const error: RespondFriendRequestErrorCode | null =
    lastResult && lastResult.status === "reverted"
      ? classifyRespondFriendRequestError(lastResult.apiError)
      : null;

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
      void dispatchMutation({
        key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
        optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
        run: async () => {
          await respondFriendRequest(input.friendshipId, input.action);
          await revalidate(targetUserId);
        },
        cooldownMs: COOLDOWN_MS,
      });
    };

    return Object.freeze({
      respond,
      isPending: isInFlight,
      error,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canRespond,
    dispatchMutation,
    isInFlight,
    error,
    revalidate,
  ]);

  return result;
}