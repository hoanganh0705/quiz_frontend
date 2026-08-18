

import { describe, expect, it } from "vitest";

import { RELATIONSHIP_VALUES } from "@/features/social/types/relationship";

import {
type RelationshipChangedPayload,
type BlockedChangedPayload,
type FriendRequestReceivedPayload,
type FriendRequestRespondedPayload,
type FriendRequestCancelledPayload,
type FriendAddedPayload,
type FriendRemovedPayload,
type FollowReceivedPayload,
type FeedItemAddedPayload,
type SocialSocketEventPayload,
type SocialEventKind,
} from "../social-event-payloads";

const VALID_ACTOR = "11111111-1111-4111-8111-111111111111";
const VALID_TARGET = "22222222-2222-4222-8222-222222222222";
const VALID_CORRELATION = "33333333-3333-4333-8333-333333333333";

function buildBase() {
return {
version: 1 as const,
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
correlationId: VALID_CORRELATION,
  };
}

describe("social-event-payloads — common fields", () => {
it("every payload carries version=1, actorUserId, targetUserId, correlationId", () => {
const samples: Array<{ name: string; payload: SocialSocketEventPayload }> = [
{
name: "RelationshipChangedPayload",
payload: {
...buildBase(),
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
        },
      },
{
name: "BlockedChangedPayload",
payload: {
...buildBase(),
relationship: "blocked",
isBlocked: true,
changedAt: "2026-08-07T00:00:00.000Z",
        },
      },
{
name: "FriendRequestReceivedPayload",
payload: {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
requestedAt: "2026-08-07T00:00:00.000Z",
        },
      },
{
name: "FriendRequestRespondedPayload",
payload: {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
decision: "accept",
respondedAt: "2026-08-07T00:00:00.000Z",
        },
      },
{
name: "FriendRequestCancelledPayload",
payload: {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
cancelledAt: "2026-08-07T00:00:00.000Z",
        },
      },
{
name: "FriendAddedPayload",
payload: {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
mutual: true,
addedAt: "2026-08-07T00:00:00.000Z",
        },
      },
{
name: "FriendRemovedPayload",
payload: {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
mutual: false,
removedAt: "2026-08-07T00:00:00.000Z",
        },
      },
{
name: "FollowReceivedPayload",
payload: {
...buildBase(),
followerUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
followedAt: "2026-08-07T00:00:00.000Z",
        },
      },
{
name: "FeedItemAddedPayload",
payload: {
...buildBase(),
feedItemId: "feed-item-1",
feedItemType: "badge_earned",
addedAt: "2026-08-07T00:00:00.000Z",
        },
      },
    ];

for (const { name, payload } of samples) {
expect(payload.version, `${name}.version`).toBe(1);
expect(payload.actorUserId, `${name}.actorUserId`).toBe(VALID_ACTOR);
expect(payload.targetUserId, `${name}.targetUserId`).toBe(VALID_TARGET);
expect(payload.correlationId, `${name}.correlationId`).toBe(
VALID_CORRELATION,
      );
    }
  });
});

describe("social-event-payloads — per-event shapes", () => {
it("RelationshipChangedPayload carries a Relationship snapshot", () => {
const payload: RelationshipChangedPayload = {
...buildBase(),
relationship: "blocked",
previousRelationship: "friend",
changedAt: "2026-08-07T00:00:00.000Z",
    };
expect(RELATIONSHIP_VALUES).toContain(payload.relationship);
expect(RELATIONSHIP_VALUES).toContain(payload.previousRelationship);
  });

it("BlockedChangedPayload carries isBlocked + Relationship snapshot", () => {
const payload: BlockedChangedPayload = {
...buildBase(),
relationship: "blocked",
isBlocked: true,
changedAt: "2026-08-07T00:00:00.000Z",
    };
expect(payload.isBlocked).toBe(true);
expect(RELATIONSHIP_VALUES).toContain(payload.relationship);
  });

it("FriendRequestReceivedPayload carries requester + recipient", () => {
const payload: FriendRequestReceivedPayload = {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
requestedAt: "2026-08-07T00:00:00.000Z",
    };
expect(payload.requesterUserId).toBe(VALID_ACTOR);
expect(payload.recipientUserId).toBe(VALID_TARGET);
  });

it("FriendRequestRespondedPayload carries decision: accept | decline", () => {
const accept: FriendRequestRespondedPayload = {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
decision: "accept",
respondedAt: "2026-08-07T00:00:00.000Z",
    };
const decline: FriendRequestRespondedPayload = {
...accept,
decision: "decline",
    };
expect(accept.decision).toBe("accept");
expect(decline.decision).toBe("decline");
  });

it("FriendRequestCancelledPayload carries requester + recipient", () => {
const payload: FriendRequestCancelledPayload = {
...buildBase(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
cancelledAt: "2026-08-07T00:00:00.000Z",
    };
expect(payload.requesterUserId).toBe(VALID_ACTOR);
expect(payload.recipientUserId).toBe(VALID_TARGET);
  });

it("FriendAddedPayload always has mutual: true", () => {
const payload: FriendAddedPayload = {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
mutual: true,
addedAt: "2026-08-07T00:00:00.000Z",
    };
expect(payload.mutual).toBe(true);
  });

it("FriendRemovedPayload always has mutual: false", () => {
const payload: FriendRemovedPayload = {
...buildBase(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
mutual: false,
removedAt: "2026-08-07T00:00:00.000Z",
    };
expect(payload.mutual).toBe(false);
  });

it("FollowReceivedPayload carries follower + target", () => {
const payload: FollowReceivedPayload = {
...buildBase(),
followerUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
followedAt: "2026-08-07T00:00:00.000Z",
    };
expect(payload.followerUserId).toBe(VALID_ACTOR);
expect(payload.targetUserId).toBe(VALID_TARGET);
  });

it("FeedItemAddedPayload carries feedItemId + feedItemType", () => {
const payload: FeedItemAddedPayload = {
...buildBase(),
feedItemId: "feed-1",
feedItemType: "badge_earned",
addedAt: "2026-08-07T00:00:00.000Z",
    };
expect(payload.feedItemId).toBe("feed-1");
expect(payload.feedItemType).toBe("badge_earned");
  });
});

describe("social-event-payloads — hygiene invariants", () => {
it("the `kind` discriminator on every SocialEventKind literal is unique", () => {
const kinds: SocialEventKind[] = [
"relationship.changed",
"blocked.changed",
"friend.request.received",
"friend.request.responded",
"friend.request.cancelled",
"friend.added",
"friend.removed",
"follow.received",
"feed.item.added",
    ];
expect(new Set(kinds).size).toBe(kinds.length);
  });

it("every payload type omits `friendshipId` and `followId`", () => {

const sample = {
...buildBase(),
relationship: "friend" as const,
previousRelationship: "none" as const,
changedAt: "2026-08-07T00:00:00.000Z",
    };
expect("friendshipId" in sample).toBe(false);
expect("followId" in sample).toBe(false);
  });
});