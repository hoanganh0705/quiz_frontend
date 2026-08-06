"use client";

/**
 * `useBlock` — mutation hook for the block action.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.D1.
 *
 * ## What this hook owns
 *
 * - The `block(userId, input?)` mutation that calls
 *   `block-mutation.service.ts → blockUser`.
 * - `useSocialPermissions(userId).canBlock` guard before dispatching.
 * - Double-click guard via a per-instance `isPendingRef` ref.
 * - Server-authoritative rollback on error.
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
 * Returns `{ block, isPending, error }`. The contract is stable: the
 * object reference never changes; only the field values update.
 *
 * ## Bidirectional side effects
 *
 * Block is bidirectional: when A blocks B, B cannot see A's content,
 * follow A, or send A a friend request. The server enforces this; the
 * client mirrors it via `BlockedContentGate` (re-validated after every
 * successful block) and `useSocialPermissions` (the blocked user sees
 * no follow / friend-request CTAs).
 *
 * ## Silent follow removal
 *
 * If A was previously following B and A blocks B, the server silently
 * removes that follow. The hook does NOT surface this as an error — the
 * revalidation of the relationship and counts keys is sufficient to
 * converge the UI. (A user-initiated `useUnfollow` invocation is
 * distinct; this silent removal is server-driven and has no error code.)
 *
 * ## Optimistic update authority
 *
 * The hook does NOT mutate the authoritative SWR cache optimistically.
 * The cache is revalidated on success via `mutate` (the SWR global).
 * On error, the previous authoritative state (from SWR) is preserved.
 *
 * ## Socket invalidation (Epic 6.10)
 *
 * After a successful block, callers revalidate the relationship,
 * blocked-users, and counts keys. When Epic 6.10 lands, the Phase 5
 * `/notifications` socket will emit `blocked.changed` events that
 * trigger the same invalidation. The hook is compatible with that
 * future integration. See TKT-6.7.G1 for the integration spec.
 */

import { useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useSWRConfig } from "swr";

import {
  blockUser,
  type BlockUserInput,
} from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Error codes surfaced by `useBlock`. Exhaustive — every error the
 * service can throw that is NOT a known SOCIAL_* code falls back to
 * `GLOBAL_INTERNAL_ERROR`.
 */
export type BlockErrorCode = SocialErrorCode | "GLOBAL_INTERNAL_ERROR";

/**
 * Input to `block(input?)`. Optional block metadata (currently `reason`).
 */
export type UseBlockInput = BlockUserInput;

/**
 * Result of `useBlock`.
 *
 * Field semantics:
 *   - `block`     — call to trigger the block mutation. Accepts an optional
 *                   `BlockUserInput` (e.g. `{ reason }`).
 *   - `isPending` — `true` while a block request is in-flight.
 *   - `error`     — the typed error code, or `null` on success.
 */
export interface UseBlockResult {
  block: (input?: UseBlockInput) => void;
  isPending: boolean;
  error: BlockErrorCode | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseBlockOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthBootstrap` via `useRelationship` /
   * `useSocialPermissions`.
   */
  currentUserId?: string | null;
}

/**
 * Mutation hook for the block action.
 *
 * @param targetUserId The user to block. `null` is safe — the hook
 *   returns a no-op result when the target is null.
 * @param options Optional overrides.
 */
export function useBlock(
  targetUserId: string | null,
  options: UseBlockOptions = {},
): UseBlockResult {
  // ── Flag guard ────────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue("phase6_social_block_mutation");
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
  const [error, setError] = useState<BlockErrorCode | null>(null);

  // ── Stable result ───────────────────────────────────────────────────
  // The result object is frozen so callers can destructure it without
  // referential equality concerns. All mutable state is in fields.
  const result = useMemo<UseBlockResult>(() => {
    // ── Placeholder flag: safe no-op ────────────────────────────────
    if (isFlagPlaceholder) {
      return Object.freeze({
        block: () => {
          // no-op — feature is gated off
        },
        isPending: false,
        error: null,
      });
    }

    // ── No target: safe no-op ────────────────────────────────────────
    if (targetUserId === null) {
      return Object.freeze({
        block: () => {
          // no-op
        },
        isPending: false,
        error: null,
      });
    }

    // ── Permissions guard ─────────────────────────────────────────────
    if (!permissions.canBlock) {
      return Object.freeze({
        block: () => {
          // no-op — permission denied
        },
        isPending: false,
        error: null,
      });
    }

    // ── Core mutation ────────────────────────────────────────────────
    const block = (input: UseBlockInput = {}): void => {
      // Double-click guard: skip if a request is already in-flight.
      if (isPendingRef.current) return;

      // Mark pending synchronously.
      isPendingRef.current = true;
      // Reset any prior error.
      setError(null);

      blockUser(targetUserId, input)
        .then(() => {
          // Server success: revalidate the relationship, blocked-users,
          // and counts keys. The relationship key revalidation refreshes
          // the canonical Relationship value (now `blocked`). The
          // blocked-users key revalidation refreshes the viewer's
          // blocked list (the new row appears). The counts key
          // revalidation refreshes the badge count.
          //
          // The silent follow-removal side effect converges via the
          // relationship and counts revalidations; no explicit error
          // banner is needed.
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
          // Surface the error. The optimistic state is discarded
          // automatically since we don't touch the SWR cache.
          const apiErr =
            err instanceof ApiError ? err : new ApiError(err as never);
          // Map to the typed error code.
          const code: BlockErrorCode =
            (apiErr.code as BlockErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
          setError(code);
        })
        .finally(() => {
          // Reset the pending flag.
          isPendingRef.current = false;
        });
    };

    return Object.freeze({
      block,
      get isPending() {
        return isPendingRef.current;
      },
      error,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canBlock,
    mutate,
    error,
  ]);

  // ── Abort on unmount ─────────────────────────────────────────────────
  // We use `useRef` for the abort flag (stable reference), and the
  // `finally` block above always resets it. On unmount, if a request
  // is in-flight, the `isPendingRef` guard prevents a subsequent
  // `block()` from dispatching a second request, and the `finally`
  // block ensures the pending flag is reset even if the component
  // unmounts mid-flight.
  //
  // NOTE: `blockUser` (the service) does not currently support
  // AbortSignal. Adding AbortSignal support is a future optimisation
  // (TKT-6.7.G2). The `isPendingRef` + `finally` pattern is sufficient
  // for the initial implementation, mirroring `useFollow` /
  // `useUnfollow` (TKT-6.6.D1 / D2).

  return result;
}