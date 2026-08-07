"use client";

/**
 * `useFollow` — mutation hook for the follow action.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.D1.
 *
 * TKT-7.5 cleanup, Phase 6 / P1-4: the hook now delegates to
 * `useOptimisticMutation` (the canonical Phase 4 mutation primitive).
 * The previous implementation reinvented optimistic-update +
 * rollback + cooldown + double-click guard + SWR cache revalidation
 * inline (~40 lines of state-machine code); the canonical primitive
 * owns all four concerns.
 *
 * ## What this hook owns
 *
 * - The `follow(userId)` mutation that calls
 *   `follow-mutation.service.ts → followUser`.
 * - `useSocialPermissions(userId).canFollow` guard before dispatching.
 * - Server-authoritative rollback on error via `useOptimisticMutation`.
 * - SWR cache revalidation on success
 *   (`SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)` and
 *   `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`).
 * - Cross-tab invalidation broadcast on success
 *   (`publishSocialRelationshipInvalidation`).
 * - Safe no-op fallback when `phase6_social_follow_mutation` is
 *   `'placeholder'`.
 *
 * ## Return contract
 *
 * Returns `{ follow, isPending, error }`. The contract is stable:
 * the object reference never changes; only the field values update.
 * The `error` field is the typed error code; `null` on success or
 * before any call has resolved.
 *
 * ## Optimistic update authority
 *
 * The hook does NOT mutate the authoritative SWR cache optimistically.
 * The server is the source of truth — the hook calls the SDK and
 * invalidates the relationship + counts keys on success. The
 * `useOptimisticMutation` primitive handles the 500 ms cooldown and
 * snapshot/revert discipline internally; the per-feature hook owns
 * the SWR keys + cross-tab broadcast.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful follow, callers revalidate the relationship and
 * counts keys. When Epic 6.10 lands, the Phase 5 `/notifications`
 * socket will emit `relationship.changed` events that trigger the
 * same invalidation. The hook is compatible with that future
 * integration.
 */

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { followUser } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import {
  publishSocialRelationshipInvalidation,
} from "@/lib/social/relationship-broadcast-channel";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Error codes surfaced by `useFollow`. Exhaustive — every error the
 * service can throw that is NOT a known SOCIAL_* code falls back to
 * `GLOBAL_INTERNAL_ERROR`.
 */
export type FollowErrorCode =
  | SocialErrorCode
  | "GLOBAL_INTERNAL_ERROR";

/**
 * Result of `useFollow`.
 *
 * Field semantics:
 *   - `follow`        — call to trigger the follow mutation.
 *   - `isPending`    — `true` while a follow request is in-flight.
 *   - `error`        — the typed error code, or `null` on success.
 */
export interface UseFollowResult {
  follow: () => void;
  isPending: boolean;
  error: FollowErrorCode | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseFollowOptions {
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

/**
 * Map the unknown rejection from `useOptimisticMutation.lastError` to
 * the typed `FollowErrorCode` discriminator. Non-`ApiError` rejections
 * fall back to `GLOBAL_INTERNAL_ERROR`.
 */
function classifyFollowError(cause: unknown): FollowErrorCode {
  if (cause instanceof ApiError) {
    return (cause.code as FollowErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
  return "GLOBAL_INTERNAL_ERROR";
}

/**
 * Mutation hook for the follow action.
 *
 * @param targetUserId The user to follow. `null` is safe — the hook
 *   returns a no-op result when the target is null.
 * @param options Optional overrides.
 */
export function useFollow(
  targetUserId: string | null,
  options: UseFollowOptions = {},
): UseFollowResult {
  // ── Flag guard ────────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue("phase6_social_follow_mutation");
  const isFlagPlaceholder = flagValue === "placeholder";

  // ── Permissions ───────────────────────────────────────────────────────
  // `useSocialPermissions` reads `useRelationship` internally.
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  // ── SWR mutate (for post-success revalidation) ────────────────────────
  const { mutate } = useSWRConfig();

  // ── Optimistic mutation primitive ────────────────────────────────────
  const { mutate: dispatchMutation, isInFlight, lastResult } =
    useOptimisticMutation();

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

  // Derive the typed error code from the primitive's `lastResult`.
  // `lastResult.status === 'reverted'` is the only branch that
  // surfaces a user-visible error; success / cooldown / pending all
  // clear the field.
  const error: FollowErrorCode | null =
    lastResult && lastResult.status === "reverted"
      ? classifyFollowError(lastResult.apiError)
      : null;

  // ── Stable result ───────────────────────────────────────────────────
  // The result object is frozen so callers can destructure it without
  // referential equality concerns. All mutable state is in fields.
  const result = useMemo<UseFollowResult>(() => {
    // ── Placeholder flag: safe no-op ────────────────────────────────
    if (isFlagPlaceholder) {
      return Object.freeze({
        follow: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
      });
    }

    // ── No target: safe no-op ────────────────────────────────────────
    if (targetUserId === null) {
      return Object.freeze({
        follow: () => {
          // no-op
        },
        isPending: false,
        error: null,
      });
    }

    // ── Permissions guard ─────────────────────────────────────────────
    if (!permissions.canFollow) {
      return Object.freeze({
        follow: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
      });
    }

    // ── Core mutation ────────────────────────────────────────────────
    const follow = (): void => {
      // Fire-and-forget; the caller doesn't await. The mutation
      // primitive handles snapshot + revert + cooldown.
      void dispatchMutation({
        // The relationship key is the SWR key we want to invalidate
        // on success; we don't apply an optimistic patch because the
        // server is the source of truth for the canonical
        // `Relationship` value (the per-row UI state lives in the
        // consumer's local state, not the cache).
        key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
        optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
        run: async () => {
          await followUser(targetUserId);
          await revalidate(targetUserId);
          // Phase 4 (P0-14): broadcast the cross-tab invalidation so
          // sibling tabs revalidate the relationship + counts keys
          // without waiting for the next focus / interval cycle.
          publishSocialRelationshipInvalidation({
            kind: "follow.changed",
            userId: targetUserId,
          });
        },
        cooldownMs: COOLDOWN_MS,
      });
    };

    return Object.freeze({
      follow,
      isPending: isInFlight,
      error,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canFollow,
    dispatchMutation,
    isInFlight,
    error,
    revalidate,
  ]);

  return result;
}