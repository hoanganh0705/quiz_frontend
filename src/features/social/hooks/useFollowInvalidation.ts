/**
 * `useFollowInvalidation` — socket-driven follow cache invalidation.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E3.
 *
 * ## Purpose
 *
 * Owns the `follow.received` invalidation lifecycle. The hook consumes
 * the shared `useSocialRealtimeEvent` wrapper (TKT-6.10.E7) so the
 * dedup / sequence / validation trio is centralised; the hook itself
 * only declares the invalidation set.
 *
 * On every accepted event the hook invalidates:
 *
 *   - `SOCIAL_CACHE_KEYS.makeFollowersKey(targetUserId)` — the
 *     followee's followers list (the new follower is added).
 *   - `SOCIAL_CACHE_KEYS.makeFollowingKey(actorUserId)` — the
 *     follower's own following list.
 *   - `SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId)` — the
 *     followee's counts (followers count changes).
 *
 * The hook posts a `relationship-invalidation` cross-tab envelope
 * (the relationship key is the authoritative source for follow
 * changes; no new cross-tab variant is needed per the planning
 * document's note).
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The wire format does NOT carry `followId` (per Epic 6.6.G1). The
 * hook NEVER constructs or carries `followId` in any breadcrumb
 * payload or cross-tab envelope.
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
} from "@/lib/social/phase6_6_10_sentry";
import { postRelationshipInvalidation } from "@/lib/realtime/phase5-broadcast";

import { useSocialRealtimeEvent } from "@/features/social/realtime";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import type { FollowReceivedPayload } from "@/features/social/realtime";

/**
 * Subscribe to `follow.received` and invalidate the SWR cache keys
 * that depend on the follow relationship.
 *
 * The hook signature is `useFollowInvalidation(): void` —
 * side-effect only; no return value.
 *
 * @example
 * ```tsx
 * function FollowersListPage() {
 *   useFollowInvalidation();
 *   const { data } = useFollowers(viewerUserId);
 *   return <List items={data ?? []} />;
 * }
 * ```
 */
export function useFollowInvalidation(): void {
  const flagValue = getFeatureFlagValue("phase6_social_notifications");
  const realtimeEnabled = flagValue !== "placeholder";

  const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: realtimeEnabled,
    enabled: realtimeEnabled,
  });

  const handleReceived = useCallback((payload: FollowReceivedPayload) => {
    const targetUserId = payload.targetUserId;
    const actorUserId = payload.followerUserId;

    const keys = [
      ...SOCIAL_CACHE_KEYS.makeFollowersKey(targetUserId),
      ...SOCIAL_CACHE_KEYS.makeFollowingKey(actorUserId),
      ...SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
    ];

    mutateCarefully(SOCIAL_CACHE_KEYS.makeFollowersKey(targetUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeFollowingKey(actorUserId));
    mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId));

    postRelationshipInvalidation(targetUserId);

    addSocialRealtimeBreadcrumb({
      eventType: "follow.received",
      actorUserId,
      targetUserId,
      correlationId: payload.correlationId,
      invalidationKeys: keys,
      reason: "follow-received-invalidated",
    });
  }, []);

  useSocialRealtimeEvent<FollowReceivedPayload>(
    realtimeEnabled ? socket : null,
    "follow.received",
    handleReceived,
    { enabled: realtimeEnabled },
  );
}
