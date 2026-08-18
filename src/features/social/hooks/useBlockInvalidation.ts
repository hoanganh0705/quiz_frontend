

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
