

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
import type { FollowReceivedPayload } from "@/features/social/realtime";

export function useFollowInvalidation(): void {
const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
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
