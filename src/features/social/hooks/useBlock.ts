"use client";

/**
 * `useBlock` — mutation hook for the block action.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.D1.
 *
 * TKT-7.5 cleanup, Phase 6 / P1-6: the hook now delegates to
 * `useOptimisticMutation` (the canonical Phase 4 mutation primitive).
 * The previous implementation reinvented optimistic-update +
 * rollback + cooldown + SWR cache revalidation + bidirectional
 * side-effects + cross-tab broadcast inline.
 *
 * ## What this hook owns
 *
 * - The `block(userId, input?)` mutation that calls
 *   `block-mutation.service.ts → blockUser`.
 * - `useSocialPermissions(userId).canBlock` guard before dispatching.
 * - Server-authoritative rollback on error.
 * - SWR cache revalidation on success:
 *     - `SOCIAL_CACHE_KEYS.makeRelationshipKey(userId)`
 *     - `SOCIAL_CACHE_KEYS.makeBlockedKey()` (viewer-only)
 *     - `SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId)`
 * - Cross-tab invalidation broadcast on success.
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
 * converge the UI.
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

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";

import { ApiError, useOptimisticMutation } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
  blockUser,
  type BlockUserInput,
} from "@/features/social/services";
import { SOCIAL_CACHE_KEYS, type SocialErrorCode } from "@/features/social/types";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import {
  publishSocialRelationshipInvalidation,
} from "@/lib/social/relationship-broadcast-channel";

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

const COOLDOWN_MS = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────

function classifyBlockError(cause: unknown): BlockErrorCode {
  if (cause instanceof ApiError) {
    return (cause.code as BlockErrorCode) ?? "GLOBAL_INTERNAL_ERROR";
  }
  return "GLOBAL_INTERNAL_ERROR";
}

/**
 * Mutation hook for the block action.
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

  // ── Optimistic mutation primitive ──────────────────────────────────
  const { mutate: dispatchMutation, isInFlight, lastResult } =
    useOptimisticMutation();

  const revalidate = useCallback(
    async (userId: string): Promise<void> => {
      await Promise.all([
        mutate(SOCIAL_CACHE_KEYS.makeRelationshipKey(userId), undefined, {
          revalidate: true,
        }),
        mutate(SOCIAL_CACHE_KEYS.makeBlockedKey(), undefined, {
          revalidate: true,
        }),
        mutate(SOCIAL_CACHE_KEYS.makeSocialCountsKey(userId), undefined, {
          revalidate: true,
        }),
      ]);
    },
    [mutate],
  );

  const error: BlockErrorCode | null =
    lastResult && lastResult.status === "reverted"
      ? classifyBlockError(lastResult.apiError)
      : null;

  // ── Stable result ───────────────────────────────────────────────────
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
      void dispatchMutation({
        key: SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
        optimisticData: <TData,>(current: TData | undefined): TData | undefined => current,
        run: async () => {
          await blockUser(targetUserId, input);
          await revalidate(targetUserId);
          // Phase 4 (P0-15): broadcast two events so sibling tabs
          // revalidate both the relationship + blocklist caches.
          publishSocialRelationshipInvalidation({
            kind: "relationship.changed",
            userId: targetUserId,
          });
          publishSocialRelationshipInvalidation({
            kind: "blocklist.changed",
            userId: targetUserId,
          });
        },
        cooldownMs: COOLDOWN_MS,
      });
    };

    return Object.freeze({
      block,
      isPending: isInFlight,
      error,
    });
  }, [
    isFlagPlaceholder,
    targetUserId,
    permissions.canBlock,
    dispatchMutation,
    isInFlight,
    error,
    revalidate,
  ]);

  return result;
}