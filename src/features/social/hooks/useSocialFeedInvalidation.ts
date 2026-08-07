/**
 * `useSocialFeedInvalidation` — socket-driven social-feed cache invalidation.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E5.
 *
 * ## Purpose
 *
 * Owns the `feed.item.added` invalidation lifecycle. The hook consumes
 * the shared `useSocialRealtimeEvent` wrapper (TKT-6.10.E7) so the
 * dedup / sequence / validation trio is centralised; the hook itself
 * only declares the invalidation set.
 *
 * On every accepted event the hook invalidates:
 *
 *   - `SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId)` — the paginated
 *     social-feed cache for the viewer. The key is offset-paginated;
 *     the listener invalidates the first page only (pages 2+ are
 *     refetched on next focus, per the Epic 6.9 / TKT-6.9.F4 staleness
 *     marker).
 *
 * No cross-tab envelope is posted because the feed is viewer-scoped —
 * the viewer's other tabs already share the same SWR cache via
 * cross-tab invalidation emitted by the mutation hooks (Epic 6.9).
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
} from "@/lib/social/phase6_6_10_sentry";

import { useSocialRealtimeEvent } from "@/features/social/realtime";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import type { FeedItemAddedPayload } from "@/features/social/realtime";

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Subscribe to `feed.item.added` and invalidate the SWR feed cache.
 *
 * The hook signature is
 * `useSocialFeedInvalidation(viewerUserId: string | null): void`.
 * Pass `null` when the viewer is unauthenticated — the hook will
 * short-circuit and never register a socket listener.
 *
 * @param viewerUserId - The viewer's user id. When `null`, the hook
 *                       no-ops.
 *
 * @example
 * ```tsx
 * function SocialFeedPage() {
 *   const { currentUser } = useAuthBootstrap();
 *   useSocialFeedInvalidation(currentUser?.userId ?? null);
 *   const { data } = useFeed(currentUser?.userId ?? null);
 *   return <FeedList items={data?.items ?? []} />;
 * }
 * ```
 */
export function useSocialFeedInvalidation(viewerUserId: string | null): void {
  const flagValue = getFeatureFlagValue("phase6_social_notifications");
  const realtimeEnabled = flagValue !== "placeholder" && viewerUserId !== null;

  const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
    autoConnect: realtimeEnabled,
    enabled: realtimeEnabled,
  });

  const handleFeedItemAdded = useCallback(
    (payload: FeedItemAddedPayload) => {
      // Defensive guard — the socket should not deliver a
      // `feed.item.added` event without a viewer context, but the
      // spec mandates we never throw if `viewerUserId` is null at the
      // time of dispatch (it could have been authenticated at mount
      // and then logged out via a different tab).
      if (viewerUserId === null) return;

      const keys = [...SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId)];

      mutateCarefully(SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId));

      addSocialRealtimeBreadcrumb({
        eventType: "feed.item.added",
        actorUserId: payload.actorUserId,
        targetUserId: payload.targetUserId,
        correlationId: payload.correlationId,
        invalidationKeys: keys,
        reason: "feed-item-added-invalidated",
      });
    },
    [viewerUserId],
  );

  useSocialRealtimeEvent<FeedItemAddedPayload>(
    realtimeEnabled ? socket : null,
    "feed.item.added",
    handleFeedItemAdded,
    { enabled: realtimeEnabled },
  );
}
