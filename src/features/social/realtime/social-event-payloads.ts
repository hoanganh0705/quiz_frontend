

import type { Relationship } from "@/features/social/types/relationship";

interface SocialSocketEventBasePayload {

version: 1;

actorUserId: string;

targetUserId: string;

correlationId: string;
}

export interface RelationshipChangedPayload extends SocialSocketEventBasePayload {

relationship: Relationship;

previousRelationship: Relationship;

changedAt: string;
}

export interface BlockedChangedPayload extends SocialSocketEventBasePayload {

relationship: Relationship;

isBlocked: boolean;

changedAt: string;
}

export interface FriendRequestReceivedPayload
extends SocialSocketEventBasePayload {

requesterUserId: string;

recipientUserId: string;

requestedAt: string;
}

export interface FriendRequestRespondedPayload
extends SocialSocketEventBasePayload {

requesterUserId: string;

recipientUserId: string;

decision: "accept" | "decline";

respondedAt: string;
}

export interface FriendRequestCancelledPayload
extends SocialSocketEventBasePayload {

requesterUserId: string;

recipientUserId: string;

cancelledAt: string;
}

export interface FriendAddedPayload extends SocialSocketEventBasePayload {

actorUserId: string;

targetUserId: string;

mutual: true;

addedAt: string;
}

export interface FriendRemovedPayload extends SocialSocketEventBasePayload {

actorUserId: string;

targetUserId: string;

mutual: false;

removedAt: string;
}

export interface FollowReceivedPayload extends SocialSocketEventBasePayload {

followerUserId: string;

targetUserId: string;

followedAt: string;
}

export interface FeedItemAddedPayload extends SocialSocketEventBasePayload {

feedItemId: string;

feedItemType: string;

addedAt: string;
}

export type SocialSocketEventPayload =
| RelationshipChangedPayload
  | BlockedChangedPayload
  | FriendRequestReceivedPayload
  | FriendRequestRespondedPayload
  | FriendRequestCancelledPayload
  | FriendAddedPayload
  | FriendRemovedPayload
  | FollowReceivedPayload
  | FeedItemAddedPayload;

export type SocialEventKind =
| "relationship.changed"
  | "blocked.changed"
  | "friend.request.received"
  | "friend.request.responded"
  | "friend.request.cancelled"
  | "friend.added"
  | "friend.removed"
  | "follow.received"
  | "feed.item.added";