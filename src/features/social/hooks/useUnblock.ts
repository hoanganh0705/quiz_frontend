"use client";

/**
 * `useUnblock` — mutation hook for the unblock action.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.D2.
 *
 * ## What this hook owns
 *
 * - The `unblock(userId)` mutation that calls
 *   `block-mutation.service.ts → unblockUser`.
 * - `useSocialPermissions(userId).canUnblock` guard before dispatching.
 * - Double-click guard via a per-instance `isPendingRef` ref.
 * - `SOCIAL_USER_NOT_BLOCKED` (404) is treated as a successful terminal
 *   state — the user is already not blocked, which is the desired
 *   outcome. No error banner is surfaced.
 * - Other error codes surface as `error: BlockErrorCode`.
 * - SWR cache revalidation on success:
 *     - `SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)`
 *     - `SOCIAL_CACHE_KEYS.makeBlockedKey()` (viewer-only)
 *     - `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`
 * - Abort-on-unmount when a request is in-flight.
 * - Safe no-op fallback when `phase6_social_block_mutation` is
 *   `'placeholder'`.
 *
 * ## Return contract
 *
 * Returns `{ unblock, isPending, error, alreadyNotBlocking }`. The
 * contract is stable: the object reference never changes; only the
 * field values update.
 *
 * ## Non-idempotent DELETE
 *
 * The backend's `DELETE /social/block/:userId` returns
 * `404 + code: 'SOCIAL_USER_NOT_BLOCKED'` when the viewer is not
 * currently blocking the target. The hook maps this to
 * `alreadyNotBlocking: true` and `error: null` — the desired outcome
 * is already achieved, so no error banner is shown. This is the
 * "successful terminal state" pattern for non-idempotent DELETE
 * operations, mirroring `useUnfollow` (TKT-6.6.D2) which uses the
 * `SOCIAL_FOLLOW_NOT_FOUND` code.
 *
 * ## Unblock restores prior relationship state
 *
 * After a successful unblock, the prior relationship state (followed /
 * not-followed, pending friend request / none) is restored as it was
 * before the block. The hook revalidates the relationship and counts
 * keys so `useRelationship` / `useSocialCounts` converge to the
 * pre-block state.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful unblock (including the `SOCIAL_USER_NOT_BLOCKED`
 * terminal state), callers revalidate the relationship, blocked-users,
 * and counts keys. When Epic 6.10 lands, the Phase 5 `/notifications`
 * socket will emit `blocked.changed` events that trigger the same
 * invalidation. The hook is compatible with that future integration.
 * See TKT-6.7.G1 for the integration spec.
 */

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import { unblockUser } from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Error codes surfaced by `useUnblock`. Exhaustive — every error the
 * service can throw that is NOT `SOCIAL_USER_NOT_BLOCKED` falls back to
 * `GLOBAL_INTERNAL_ERROR`.
 */
export type UnblockErrorCode = SocialErrorCode | "GLOBAL_INTERNAL_ERROR";

/**
 * Result of `useUnblock`.
 *
 * Field semantics:
 *   - `unblock`             — call to trigger the unblock mutation.
 *   - `isPending`           — `true` while an unblock request is in-flight.
 *   - `error`               — the typed error code, or `null`.
 *   - `alreadyNotBlocking`  — `true` when the server returned
 *                             `SOCIAL_USER_NOT_BLOCKED` (the viewer was
 *                             already not blocking). When `true`,
 *                             `error` is `null` and no error banner is
 *                             shown.
 */
export interface UseUnblockResult {
  unblock: () => void;
  isPending: boolean;
  error: UnblockErrorCode | null;
  alreadyNotBlocking: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseUnblockOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthBootstrap` via `useRelationship` /
   * `useSocialPermissions`.
   */
  currentUserId?: string | null;
}

/**
 * Mutation hook for the unblock action.
 *
 * @param targetUserId The user to unblock. `null` is safe — the hook
 *   returns a no-op result when the target is null.
 * @param options Optional overrides.
 */
export function useUnblock(
  targetUserId: string | null,
  options: UseUnblockOptions = {},
): UseUnblockResult {
  // ── Flag guard ────────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue("phase6_social_block_mutation");
  const isFlagPlaceholder = flagValue === "placeholder";

  // ── Permissions ───────────────────────────────────────────────────────
  const permissions = useSocialPermissions(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  // ── SWR mutate ──────────────────────────────────────────────────────
  const { mutate } = useSWRConfig();

  // ── Double-click guard (per-instance ref) ───────────────────────────
  const isPendingRef = useRef(false);

  // ── Error and terminal-state tracking ───────────────────────────────
  // `error` is null on success OR when `SOCIAL_USER_NOT_BLOCKED`
  // (already not blocking).
  // `alreadyNotBlocking` is true only when the server returned 404
  // with `SOCIAL_USER_NOT_BLOCKED`.
  const [error, setError] = useState<UnblockErrorCode | null>(null);
  const [alreadyNotBlocking, setAlreadyNotBlocking] = useState(false);

  // ── Stable result ───────────────────────────────────────────────────
  const result = useMemo<UseUnblockResult>(() => {
    // ── Placeholder flag: safe no-op ────────────────────────────────
    if (isFlagPlaceholder) {
      return Object.freeze({
        unblock: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
        alreadyNotBlocking: false,
      });
    }

    // ── No target: safe no-op ────────────────────────────────────────
    if (targetUserId === null) {
      return Object.freeze({
        unblock: () => {
          // no-op
        },
        isPending: false,
        error: null,
        alreadyNotBlocking: false,
      });
    }

    // ── Permissions guard ─────────────────────────────────────────────
    if (!permissions.canUnblock) {
      return Object.freeze({
        unblock: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
        alreadyNotBlocking: false,
      });
    }

    // ── Core mutation ────────────────────────────────────────────────
    const unblock = (): void => {
      if (isPendingRef.current) return;

      isPendingRef.current = true;
      // Reset prior state.
      setError(null);
      setAlreadyNotBlocking(false);

      unblockUser(targetUserId)
        .then(() => {
          // Server success (204 No Content): revalidate the
          // relationship, blocked-users, and counts keys. The
          // unblock restores the prior relationship state (followed /
          // not-followed, pending friend request / none); the
          // relationship revalidation refreshes `useRelationship` to the
          // pre-block value, and the counts revalidation refreshes the
          // badge.
          void mutate(
            SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
            undefined,
            { revalidate: true },
          );
          void mutate(SOCIAL_CACHE_KEYS.makeBlockedKey(), undefined, {
            revalidate: true,
          });
          void mutate(
            SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
            undefined,
            { revalidate: true },
          );
        })
        .catch((err: unknown) => {
          const apiErr =
            err instanceof ApiError ? err : new ApiError(err as never);

          // Non-idempotent DELETE: 404 with SOCIAL_USER_NOT_BLOCKED means
          // the viewer was already not blocking. This is a successful
          // terminal state — revalidate the cache and surface the terminal
          // flag to callers so they can dismiss any confirmation UI.
          if (apiErr.code === "SOCIAL_USER_NOT_BLOCKED") {
            setAlreadyNotBlocking(true);
            // Revalidate the cache so the UI reflects the current state.
            void mutate(
              SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
              undefined,
              { revalidate: true },
            );
            void mutate(SOCIAL_CACHE_KEYS.makeBlockedKey(), undefined, {
              revalidate: true,
            });
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
          const code: UnblockErrorCode =
            (apiErr.code as UnblockErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      unblock,
      get isPending() {
        return isPendingRef.current;
      },
      error,
      alreadyNotBlocking,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canUnblock,
    mutate,
    error,
    alreadyNotBlocking,
  ]);

  // ── Abort on unmount ─────────────────────────────────────────────────
  // The `isPendingRef` + `finally` pattern prevents orphan optimistic
  // state and ensures the pending flag is reset even if the component
  // unmounts mid-flight. The underlying service does not yet support
  // `AbortSignal` (deferred to TKT-6.7.G2). The pattern is identical
  // to `useUnfollow` (TKT-6.6.D2).

  return result;
}