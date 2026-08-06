"use client";

/**
 * `useUnfollow` — mutation hook for the unfollow action.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.D2.
 *
 * ## What this hook owns
 *
 * - The `unfollow(userId)` mutation that calls
 *   `follow-mutation.service.ts → unfollowUser`.
 * - `useSocialPermissions(userId).canUnfollow` guard before dispatching.
 * - Double-click guard via a per-instance `isPendingRef` ref.
 * - `SOCIAL_FOLLOW_NOT_FOUND` (404) is treated as a successful terminal
 *   state — the user is already not following, which is the desired
 *   outcome. No error banner is surfaced.
 * - Other error codes surface as `error: FollowErrorCode`.
 * - SWR cache revalidation on success
 *   (`SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)` and
 *   `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`).
 * - Abort-on-unmount when a request is in-flight.
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
 * When Epic 6.10 lands, the Phase 5 `/notifications` socket will emit
 * `relationship.changed` events that trigger the same invalidation.
 * The hook is compatible with that future integration.
 */

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import { unfollowUser } from "@/features/social/services";
import {
  SOCIAL_CACHE_KEYS,
  type SocialErrorCode,
} from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

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

/**
 * Mutation hook for the unfollow action.
 *
 * @param targetUserId The user to unfollow. `null` is safe — the hook
 *   returns a no-op result when the target is null.
 * @param options Optional overrides.
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

  // ── Double-click guard (per-instance ref) ──────────────────────────────
  const isPendingRef = useRef(false);

  // ── Error and terminal-state tracking ─────────────────────────────────
  // `error` is null on success OR when `SOCIAL_FOLLOW_NOT_FOUND`
  // (already not following).
  // `alreadyNotFollowing` is true only when the server returned 404
  // with `SOCIAL_FOLLOW_NOT_FOUND`.
  const [error, setError] = useState<UnfollowErrorCode | null>(null);
  const [alreadyNotFollowing, setAlreadyNotFollowing] = useState(false);

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
      if (isPendingRef.current) return;

      isPendingRef.current = true;
      // Reset prior state.
      setError(null);
      setAlreadyNotFollowing(false);

      unfollowUser(targetUserId)
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

          // Non-idempotent DELETE: 404 with SOCIAL_FOLLOW_NOT_FOUND means
          // the viewer was already not following. This is a successful
          // terminal state — revalidate the cache and surface the terminal
          // flag to callers so they can dismiss the confirmation dialog.
          if (apiErr.code === "SOCIAL_FOLLOW_NOT_FOUND") {
            setAlreadyNotFollowing(true);
            // Revalidate the cache so the UI reflects the current state.
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

          // All other errors: surface the error code. The optimistic
          // state is discarded automatically since we don't touch the
          // SWR cache optimistically.
          const code: UnfollowErrorCode =
            (apiErr.code as UnfollowErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      unfollow,
      get isPending() {
        return isPendingRef.current;
      },
      error,
      alreadyNotFollowing,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canUnfollow,
    mutate,
    error,
    alreadyNotFollowing,
  ]);

  return result;
}
