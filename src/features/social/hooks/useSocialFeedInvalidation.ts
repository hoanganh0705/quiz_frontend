

"use client";

import { useCallback } from "react";

import { useSocket } from "@/lib/realtime/useSocket";
import { NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { mutateCarefully } from "@/lib/swr/mutate-carefully";
import {
addSocialRealtimeBreadcrumb,
} from "@/lib/social/social-realtime-sentry";

import { useSocialRealtimeEvent } from "@/features/social/realtime";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import type { FeedItemAddedPayload } from "@/features/social/realtime";

export function useSocialFeedInvalidation(viewerUserId: string | null): void {
const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
const realtimeEnabled = flagValue !== "placeholder" && viewerUserId !== null;

const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
autoConnect: realtimeEnabled,
enabled: realtimeEnabled,
  });

const handleFeedItemAdded = useCallback(
(payload: FeedItemAddedPayload) => {

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
