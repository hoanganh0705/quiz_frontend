"use client";

/**
 * `useUnfollow` — mutation hook for the unfollow action.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.D2.
 *
 * TKT-7.5 cleanup, Phase 6 / P1-4: the hook now delegates to
 * `useOptimisticMutation` (the canonical Phase 4 mutation primitive).
 * The previous implementation reinvented optimistic-update +
 * rollback + cooldown + SWR cache revalidation + the non-idempotent
 * DELETE terminal-state pattern inline.
 *
 * ## What this hook owns
 *
 * - The `unfollow(userId)` mutation that calls
 *   `follow-mutation.service.ts → unfollowUser`.
 * - `useSocialPermissions(userId).canUnfollow` guard before dispatching.
 * - `SOCIAL_FOLLOW_NOT_FOUND` (404) is treated as a successful terminal
 *   state — the user is already not following, which is the desired
 *   outcome. No error banner is surfaced.
 * - Other error codes surface as `error: FollowErrorCode`.
 * - SWR cache revalidation on success
 *   (`SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)` and
 *   `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`).
 * - Cross-tab invalidation broadcast on success.
 * - Safe no-op fallback when `phase6_social_follow_mutation` is
 *   `'placeholder'`.
 *
 * ## Return contract
 *
 * Returns `{ unfollow, isPending, error, alreadyNotFollowing }`.
 * The contract is stable: the object reference never changes;
 * only the field values update.
 *
 * ## Non-idempotent DELETE
 *
 * The backend's `DELETE /social/follow/:userId` returns
 * `404 + code: 'SOCIAL_FOLLOW_NOT_FOUND'` when the viewer is not
 * currently following the target. The hook maps this to
 * `alreadyNotFollowing: true` and `error: null` — the desired
 * outcome is already achieved, so no error banner is shown.
 * This is the "successful terminal state" pattern for non-idempotent
 * DELETE operations.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful unfollow (including the `SOCIAL_FOLLOW_NOT_FOUND`
 * terminal state), callers revalidate the relationship and counts keys.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { unfollowUser } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialErrorCode,
} from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import {
  publishSocialRelationshipInvalidation,
} from "@/lib/social/relationship-broadcast-channel";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Error codes surfaced by `useUnfollow`. Exhaustive — every error the
 * service can throw that is NOT `SOCIAL_FOLLOW_NOT_FOUND` falls back to
 * `GLOBAL_INTERNAL_ERROR`.
 */
export type UnfollowErrorCode =
  | SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

/**
 * Result of `useUnfollow`.
 *
 * Field semantics:
 *   - `unfollow`               — call to trigger the unfollow mutation.
 *   - `isPending`             — `true` while an unfollow request is in-flight.
 *   - `error`                — the typed error code, or `null`.
 *   - `alreadyNotFollowing`   — `true` when the server returned
 *                               `SOCIAL_FOLLOW_NOT_FOUND` (the viewer was
 *                               already not following). When `true`,
 *                               `error` is `null` and no error banner
 *                               is shown.
 */
export interface UseUnfollowResult {
  unfollow: () => void;
  isPending: boolean;
  error: UnfollowErrorCode | null;
  alreadyNotFollowing: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseUnfollowOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthBootstrap` via `useSocialPermissions`.
   */
  currentUserId?: string | null;
}

const COOLDOWN_MS = 500;

const SOCIAL_FOLLOW_NOT_FOUND = "SOCIAL_FOLLOW_NOT_FOUND" as const;

// ─── Helpers ──────────────────────────────────────────────────────────────

function classifyUnfollowError(cause: unknown): UnfollowErrorCode {
  if (cause instanceof ApiError) {
    return (cause.code as UnfollowErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
  return "GLOBAL_INTERNAL_ERROR";
}

/**
 * Mutation hook for the unfollow action.
 */
export function useUnfollow(
  targetUserId: string | null,
  options: UseUnfollowOptions = {},
): UseUnfollowResult {
  // ── Flag guard ────────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue("phase6_social_follow_mutation");
  const isFlagPlaceholder = flagValue === "placeholder";

  // ── Permissions ─────────────────────────────────────────────────────────
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  // ── SWR mutate ─────────────────────────────────────────────────────────
  const { mutate } = useSWRConfig();

  // ── Optimistic mutation primitive ──────────────────────────────────────
  const { mutate: dispatchMutation, isInFlight, lastResult } =
    useOptimisticMutation();

  // The terminal-state flag for the non-idempotent DELETE pattern.
  // `useOptimisticMutation` does not natively distinguish "succeeded
  // because the resource was already gone" from "succeeded normally",
  // so we keep this flag in a local `useState` and reset it on every
  // new `pending` transition.
  const [alreadyNotFollowing, setAlreadyNotFollowing] = useState(false);

  const revalidate = useCallback(
    async (userId: string): Promise<void> => {
      await Promise.all([
        mutate(SOCIAL_CACHE_KEYS.makeRelationshipKey(userId), undefined, {
          revalidate: true,
        }),
        mutate(SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId), undefined, {
          revalidate: true,
        }),
      ]);
    },
    [mutate],
  );

  // Reset `alreadyNotFollowing` whenever a new mutation enters
  // `pending`; capture the flag from the previous `reverted` outcome
  // when the SDK raised `SOCIAL_FOLLOW_NOT_FOUND` (we swallow the
  // throw inside `run` and synthesise a success outcome).
  useEffect(() => {
    if (lastResult?.status === "pending") {
      setAlreadyNotFollowing(false);
    }
  }, [lastResult]);

  // Derive the typed error code from the primitive's `lastResult`.
  // `SOCIAL_FOLLOW_NOT_FOUND` is swallowed inside `run` and never
  // surfaces as a `reverted` outcome, so the `error` field is `null`
  // in that case (the `alreadyNotFollowing` flag carries the
  // terminal-state signal).
  const error: UnfollowErrorCode | null =
    lastResult && lastResult.status === "reverted"
      ? classifyUnfollowError(lastResult.apiError)
      : null;

  // ── Stable result ─────────────────────────────────────────────────────
  const result = useMemo<UseUnfollowResult>(() => {
    // ── Placeholder flag: safe no-op ────────────────────────────────
    if (isFlagPlaceholder) {
      return Object.freeze({
        unfollow: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
        alreadyNotFollowing: false,
      });
    }

    // ── No target: safe no-op ────────────────────────────────────────
    if (targetUserId === null) {
      return Object.freeze({
        unfollow: () => {
          // no-op
        },
        isPending: false,
        error: null,
        alreadyNotFollowing: false,
      });
    }

    // ── Permissions guard ─────────────────────────────────────────────
    if (!permissions.canUnfollow) {
      return Object.freeze({
        unfollow: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
        alreadyNotFollowing: false,
      });
    }

    // ── Core mutation ────────────────────────────────────────────────
    const unfollow = (): void => {
      void dispatchMutation({
        key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
        optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
        run: async () => {
          try {
            await unfollowUser(targetUserId);
          } catch (cause) {
            // Non-idempotent DELETE: 404 with SOCIAL_FOLLOW_NOT_FOUND means
            // the viewer was already not following. Treat as a
            // successful terminal state — set the terminal flag,
            // revalidate, and return undefined so the primitive
            // records a success outcome.
            if (
              cause instanceof ApiError &&
              cause.code === SOCIAL_FOLLOW_NOT_FOUND
            ) {
              setAlreadyNotFollowing(true);
              await revalidate(targetUserId);
              publishSocialRelationshipInvalidation({
                kind: "follow.changed",
                userId: targetUserId,
              });
              return undefined;
            }
            throw cause;
          }
          await revalidate(targetUserId);
          // Phase 4 (P0-14): cross-tab invalidation so sibling tabs
          // revalidate without waiting for the next focus / interval
          // cycle.
          publishSocialRelationshipInvalidation({
            kind: "follow.changed",
            userId: targetUserId,
          });
        },
        cooldownMs: COOLDOWN_MS,
      });
    };

    return Object.freeze({
      unfollow,
      isPending: isInFlight,
      error,
      alreadyNotFollowing,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canUnfollow,
    dispatchMutation,
    isInFlight,
    error,
    alreadyNotFollowing,
    revalidate,
  ]);

  return result;
}