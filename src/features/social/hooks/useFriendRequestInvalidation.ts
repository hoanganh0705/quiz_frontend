

"use client";

import { useCallback, useMemo } from "react";

import { useSocket } from "@/lib/realtime/useSocket";
import { NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { mutateCarefully } from "@/lib/swr/mutate-carefully";
import {
addSocialRealtimeBreadcrumb,
} from "@/lib/social/social-realtime-sentry";
import {
postFriendRequestInvalidation,
} from "@/lib/realtime/cross-tab-invalidation";

import { useSocialRealtimeEvent } from "@/features/social/realtime";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import type {
FriendAddedPayload,
FriendRemovedPayload,
FriendRequestCancelledPayload,
FriendRequestReceivedPayload,
FriendRequestRespondedPayload,
} from "@/features/social/realtime";

function keyToString(key: readonly string[]): string {
return key.join("/");
}

export function useFriendRequestInvalidation(): void {
const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
const realtimeEnabled = flagValue !== "placeholder";

const { socket } = useSocket(NOTIFICATIONS_NAMESPACE, {
autoConnect: realtimeEnabled,
enabled: realtimeEnabled,
  });

const handleReceived = useCallback((payload: FriendRequestReceivedPayload) => {
const keys = [
SOCIAL_CACHE_KEYS.makeIncomingRequestsKey(),
SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId),
    ];
mutateCarefully(SOCIAL_CACHE_KEYS.makeIncomingRequestsKey());
mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId));

postFriendRequestInvalidation({
requesterUserId: payload.requesterUserId,
recipientUserId: payload.recipientUserId,
    });

addSocialRealtimeBreadcrumb({
eventType: "friend.request.received",
actorUserId: payload.actorUserId,
targetUserId: payload.targetUserId,
correlationId: payload.correlationId,
invalidationKeys: keys.map(keyToString),
reason: "friend-request-received-invalidated",
    });
  }, []);

const handleResponded = useCallback((payload: FriendRequestRespondedPayload) => {
const keys = [
SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.recipientUserId),
SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId),
    ];
mutateCarefully(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey());
mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.recipientUserId));
mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId));

postFriendRequestInvalidation({
decision: payload.decision,
requesterUserId: payload.requesterUserId,
recipientUserId: payload.recipientUserId,
    });

addSocialRealtimeBreadcrumb({
eventType: "friend.request.responded",
actorUserId: payload.actorUserId,
targetUserId: payload.targetUserId,
correlationId: payload.correlationId,
invalidationKeys: keys.map(keyToString),
reason: "friend-request-responded-invalidated",
    });
  }, []);

const handleCancelled = useCallback((payload: FriendRequestCancelledPayload) => {
const keys = [
SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.recipientUserId),
SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId),
    ];
mutateCarefully(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey());
mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.recipientUserId));
mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.recipientUserId));

postFriendRequestInvalidation({
decision: "cancel",
requesterUserId: payload.requesterUserId,
recipientUserId: payload.recipientUserId,
    });

addSocialRealtimeBreadcrumb({
eventType: "friend.request.cancelled",
actorUserId: payload.actorUserId,
targetUserId: payload.targetUserId,
correlationId: payload.correlationId,
invalidationKeys: keys.map(keyToString),
reason: "friend-request-cancelled-invalidated",
    });
  }, []);

const handleAdded = useCallback((payload: FriendAddedPayload) => {
const keys = [
SOCIAL_CACHE_KEYS.makeFriendsKey(payload.targetUserId),
SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId),
SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.targetUserId),
    ];
mutateCarefully(SOCIAL_CACHE_KEYS.makeFriendsKey(payload.targetUserId));
mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId));
mutateCarefully(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey());
mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.targetUserId));

postFriendRequestInvalidation({
decision: "accept",
requesterUserId: payload.actorUserId,
recipientUserId: payload.targetUserId,
    });

addSocialRealtimeBreadcrumb({
eventType: "friend.added",
actorUserId: payload.actorUserId,
targetUserId: payload.targetUserId,
correlationId: payload.correlationId,
invalidationKeys: keys.map(keyToString),
reason: "friend-added-invalidated",
    });
  }, []);

const handleRemoved = useCallback((payload: FriendRemovedPayload) => {
const keys = [
SOCIAL_CACHE_KEYS.makeFriendsKey(payload.targetUserId),
SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId),
SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey(),
SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.targetUserId),
    ];
mutateCarefully(SOCIAL_CACHE_KEYS.makeFriendsKey(payload.targetUserId));
mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId));
mutateCarefully(SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey());
mutateCarefully(SOCIAL_CACHE_KEYS.makeSocialCountsKey(payload.targetUserId));

postFriendRequestInvalidation({
requesterUserId: payload.actorUserId,
recipientUserId: payload.targetUserId,
    });

addSocialRealtimeBreadcrumb({
eventType: "friend.removed",
actorUserId: payload.actorUserId,
targetUserId: payload.targetUserId,
correlationId: payload.correlationId,
invalidationKeys: keys.map(keyToString),
reason: "friend-removed-invalidated",
    });
  }, []);

const enabled = realtimeEnabled;

useSocialRealtimeEvent<FriendRequestReceivedPayload>(
enabled ? socket : null,
"friend.request.received",
handleReceived,
{ enabled },
  );
useSocialRealtimeEvent<FriendRequestRespondedPayload>(
enabled ? socket : null,
"friend.request.responded",
handleResponded,
{ enabled },
  );
useSocialRealtimeEvent<FriendRequestCancelledPayload>(
enabled ? socket : null,
"friend.request.cancelled",
handleCancelled,
{ enabled },
  );
useSocialRealtimeEvent<FriendAddedPayload>(
enabled ? socket : null,
"friend.added",
handleAdded,
{ enabled },
  );
useSocialRealtimeEvent<FriendRemovedPayload>(
enabled ? socket : null,
"friend.removed",
handleRemoved,
{ enabled },
  );

void useMemo;
}
