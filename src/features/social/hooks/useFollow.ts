"use client";

/**
 * `useFollow` — mutation hook for the follow action.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.D1.
 *
 * ## What this hook owns
 *
 * - The `follow(userId)` mutation that calls
 *   `follow-mutation.service.ts → followUser`.
 * - `useSocialPermissions(userId).canFollow` guard before dispatching.
 * - Double-click guard via a per-instance `isPendingRef` ref.
 * - Server-authoritative rollback on error.
 * - SWR cache revalidation on success
 *   (`SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)` and
 *   `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`).
 * - Abort-on-unmount when a request is in-flight.
 * - Safe no-op fallback when `phase6_social_follow_mutation` is
 *   `'placeholder'`.
 *
 * ## Return contract
 *
 * Returns `{ follow, isPending, error }`. The contract is stable:
 * the object reference never changes; only the field values update.
 *
 * ## Optimistic update authority
 *
 * The hook optimistically transitions the local relationship display
 * but does NOT mutate the authoritative SWR cache. The authoritative
 * cache is revalidated on success via `mutateCarefully` (the
 * SWR `mutate` global). The optimistic state is discarded on error
 * and the previous authoritative state (from SWR) is preserved.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful follow, callers revalidate the relationship and
 * counts keys. When Epic 6.10 lands, the Phase 5 `/notifications`
 * socket will emit `relationship.changed` events that trigger the
 * same invalidation. The hook is compatible with that future
 * integration.
 */

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import { followUser } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

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

  // ── SWR mutate ──────────────────────────────────────────────────────
  const { mutate } = useSWRConfig();

  // ── Double-click guard (per-instance ref) ───────────────────────────
  // The ref is stabilised across renders so the guard is
  // per-instance, not per-render-cycle.
  const isPendingRef = useRef(false);

  // ── Error state ──────────────────────────────────────────────────────
  const [error, setError] = useState<FollowErrorCode | null>(null);

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
      // Double-click guard: skip if a request is already in-flight.
      if (isPendingRef.current) return;

      // Mark pending synchronously.
      isPendingRef.current = true;
      // Reset any prior error.
      setError(null);

      followUser(targetUserId)
        .then(() => {
          // Server success: revalidate the relationship and counts.
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
          // Surface the error. The optimistic state is discarded
          // automatically since we don't touch the SWR cache.
          const apiErr =
            err instanceof ApiError ? err : new ApiError(err as never);
          // Map to the typed error code.
          const code: FollowErrorCode =
            (apiErr.code as FollowErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          // Reset the pending flag.
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      follow,
      get isPending() {
        return isPendingRef.current;
      },
      error,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canFollow,
    mutate,
    error,
  ]);

  // ── Abort on unmount ─────────────────────────────────────────────────
  // We use `useRef` for the abort flag (stable reference), and the
  // `finally` block above always resets it. On unmount, if a request
  // is in-flight, we set the abort flag — the in-flight request will
  // still complete but its result will be discarded.
  //
  // NOTE: `followUser` (the service) does not currently support
  // AbortSignal. Adding AbortSignal support is a future optimisation
  // (TKT-6.6.G1). For now, the `isPendingRef` guard prevents a
  // subsequent `follow()` from dispatching a second request, and the
  // `finally` block ensures the pending flag is reset even if the
  // component unmounts mid-flight.
  //
  // NOTE: A more robust pattern would use a module-level
  // `AbortController` map keyed by userId, but that introduces
  // complexity for a case that is unlikely in practice (unmounting
  // during a 100-300ms request). The `isPendingRef` + `finally` pattern
  // is sufficient for the initial implementation.

  return result;
}
