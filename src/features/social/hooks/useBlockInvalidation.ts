/**
 * `useBlockInvalidation` — socket-driven block cache invalidation.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E4.
 *
 * ## Purpose
 *
 * Owns the `blocked.changed` invalidation lifecycle. The hook consumes
 * the shared `useSocialRealtimeEvent` wrapper (TKT-6.10.E7) so the
 * dedup / sequence / validation trio is centralised; the hook itself
 * only declares the invalidation set.
 *
 * On every accepted event the hook invalidates:
 *
 *   - `SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId)` — the
 *     relationship projection between the viewer and the target
 *     (block / unblock flips the relationship enum).
 *   - `SOCIAL_CACHE_KEYS.makeBlockedKey()` — the viewer's own
 *     blocked-users list.
 *   - `SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId)` — the
 *     viewer's social counts (the relationship change affects
 *     counts).
 *
 * The hook posts a `relationship-invalidation` cross-tab envelope
 * (the relationship key is authoritative for block changes; the
 * blocked list is viewer-only so cross-tab is optional but included
 * for consistency).
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The hook NEVER carries `friendshipId` or `followId` in any
 * breadcrumb payload or cross-tab envelope.
 *
 * ## SSR
 *
 * The hook no-ops during SSR because the underlying `useSocket`
 * short-circuits when `typeof window === "undefined"`. The flag
 * gate adds an early return when the feature flag is `'placeholder'`.
 */

"use client";

import { useCallback } from "react";

import { useSocket } from "@/lib/realtime/useSocket";
import { NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { mutateCarefully } from "@/lib/swr/mutate-carefully";
import {
  addSocialRealtimeBreadcrumb,
} from "@/lib/social/social-realtime-sentry";
import { postRelationshipInvalidation } from "@/lib/realtime/cross-tab-invalidation";

import { useSocialRealtimeEvent } from "@/features/social/realtime";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import type { BlockedChangedPayload } from "@/features/social/realtime";

/**
 * Subscribe to `blocked.changed` and invalidate the SWR cache keys
 * that depend on the block relationship.
 *
 * The hook signature is `useBlockInvalidation(): void` — side-effect
 * only; no return value.
 *
 * @example
 * ```tsx
 * function BlockedUsersListPage() {
 *   useBlockInvalidation();
 *   const { data } = useBlockedUsers();
 *   return <List items={data ?? []} />;
 * }
 * ```
 */
export function useBlockInvalidation(): void {
  const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
  const realtimeEnabled = flagValue !== "placeholder";

  const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: realtimeEnabled,
    enabled: realtimeEnabled,
  });

  const handleBlockedChanged = useCallback((payload: BlockedChangedPayload) => {
    const targetUserId = payload.targetUserId;

    const keys = [
      ...SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
      ...SOCIAL_CACHE_KEYS.makeBlockedKey(),
      ...SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
    ];

    mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeBlockedKey());
    mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId));

    postRelationshipInvalidation(targetUserId);

    addSocialRealtimeBreadcrumb({
      eventType: "blocked.changed",
      actorUserId: payload.actorUserId,
      targetUserId,
      correlationId: payload.correlationId,
      invalidationKeys: keys,
      reason: "blocked-changed-invalidated",
    });
  }, []);

  useSocialRealtimeEvent<BlockedChangedPayload>(
    realtimeEnabled ? socket : null,
    "blocked.changed",
    handleBlockedChanged,
    { enabled: realtimeEnabled },
  );
}
