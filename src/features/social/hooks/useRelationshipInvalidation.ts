

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
import type { RelationshipChangedPayload } from "@/features/social/realtime";

export function useRelationshipInvalidation(targetUserId: string): void {
const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
const realtimeEnabled = flagValue !== "placeholder";

const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
autoConnect: realtimeEnabled,
enabled: realtimeEnabled,
  });

const handleAccepted = useCallback(
(payload: RelationshipChangedPayload) => {
const invalidationKeys = [
...SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId),
...SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId),
      ];

mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId));

mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(targetUserId));

postRelationshipInvalidation(targetUserId);

addSocialRealtimeBreadcrumb({
eventType: "relationship.changed",
actorUserId: payload.actorUserId,
targetUserId: payload.targetUserId,
correlationId: payload.correlationId,
invalidationKeys,
reason: "relationship-invalidated",
      });
    },
[targetUserId],
  );

useSocialRealtimeEvent<RelationshipChangedPayload>(
realtimeEnabled ? socket : null,
"relationship.changed",
handleAccepted,
{ enabled: realtimeEnabled },
  );
}
