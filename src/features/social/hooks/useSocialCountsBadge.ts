"use client";

/**
 * `useSocialCountsBadge` — Convergence hook for the counts badge.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source ticket: TKT-6.2.D3.
 *
 * ## What this hook owns
 *
 * A thin wrapper around `useSocialCounts` that revalidates the
 * counts cache when:
 *
 *   1. A `relationship.changed` event arrives on the
 *      `social/relationship` broadcast channel (Epic 6.1 /
 *      TKT-6.1.B2). Follow / unfollow / block / unblock / unfriend
 *      actions in a sibling tab mutate the counts; the badge must
 *      revalidate to keep the visible number in sync.
 *
 *   2. A `list.loaded` event arrives on the dedicated
 *      `social/list-loaded` broadcast channel. A list page that
 *      successfully loads a new page emits this event so the badge
 *      can revalidate and converge with the rendered list length
 *      (see the cross-batch invariant
 *      "Counts badge is consistent with the rendered list lengths
 *      on a revalidation cycle").
 *
 *   3. The placeholder flag `social_relationship_live` is
 *      enabled — the hook returns `counts: null` and does not
 *      fire a service call.
 *
 *   4. `retry()` is called — the hook clears the error and
 *      revalidates.
 *
 * ## `social/list-loaded` channel
 *
 * The dedicated channel is co-defined here (see
 * `social-list-loaded-channel.ts`) so D3 owns both the listener
 * and the publisher. List pages (Batches E / F) will import the
 * publisher from this module to emit `list.loaded` on a successful
 * page load.
 *
 * ## SSR-safety
 *
 * The hook is a Client Component; `BroadcastChannel` is unavailable
 * in SSR. The hook short-circuits to `useSocialCounts`'s result
 * without subscribing when `typeof window === 'undefined'`.
 */

import { useCallback, useEffect, useMemo } from "react";

import type { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import {
  closeSocialListLoadedChannel,
  getSocialListLoadedChannel,
} from "@/features/social/social-list-loaded-channel";
import {
  subscribeSocialRelationshipInvalidation,
} from "@/lib/social/relationship-broadcast-channel";

import { useSocialCounts } from "./useSocialCounts";
import type { SocialCountsDto } from "../types";

export interface UseSocialCountsBadgeResult {
  counts: SocialCountsDto | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  refresh: () => void;
}

export function useSocialCountsBadge(
  targetUserId: string | null,
): UseSocialCountsBadgeResult {
  const flagValue = getFeatureFlagValue("social_relationship_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const base = useSocialCounts(isFlagPlaceholder ? null : targetUserId);

  // Memoised refresh — revalidates the underlying SWR key.
  const refresh = useCallback((): void => {
    void base.retry();
  }, [base]);

  // ─── 1. relationship.changed subscription ───────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (targetUserId === null) return;
    const unsubscribe = subscribeSocialRelationshipInvalidation(() => {
      refresh();
    });
    return unsubscribe;
  }, [targetUserId, refresh]);

  // ─── 2. list.loaded subscription ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (targetUserId === null) return;
    const channel = getSocialListLoadedChannel();
    if (channel === null) {
      return () => {
        closeSocialListLoadedChannel();
      };
    }
    const handler = (event: MessageEvent): void => {
      // The payload carries the target userId so a tab viewing a
      // different user's badge does not waste a refetch.
      const data = event.data as
        | {
            kind?: string;
            userId?: string;
            targetUserId?: string;
          }
        | null;
      if (data === null) return;
      if (data.kind !== "list.loaded") return;
      // Prefer the canonical (G1) field; fall back to the legacy
      // (D3) alias for backwards-compat with older messages.
      const eventUserId = data.targetUserId ?? data.userId;
      if (eventUserId !== undefined && eventUserId !== targetUserId) return;
      refresh();
    };
    channel.addEventListener("message", handler);
    return () => {
      channel.removeEventListener("message", handler);
      closeSocialListLoadedChannel();
    };
  }, [targetUserId, refresh]);

  // ─── 3. Placeholder fallback ───────────────────────────────────────────
  const placeholderResult = useMemo<UseSocialCountsBadgeResult>(
    () => ({
      counts: null,
      isLoading: false,
      isStale: false,
      error: null,
      refresh,
    }),
    [refresh],
  );

  if (isFlagPlaceholder) return placeholderResult;
  if (targetUserId === null) return placeholderResult;

  return {
    counts: base.counts,
    isLoading: base.isLoading,
    isStale: base.isStale,
    error: base.error,
    refresh,
  };
}