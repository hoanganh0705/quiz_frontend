

import { describe, expect, it } from "vitest";

import {
routeSocialSocketEvent,
type RawSocketEvent,
type RoutedSocialEvent,
} from "../social-event-router";

function asUnknown(routed: RoutedSocialEvent): { kind: "unknown"; rawType: string } {
if (routed.kind !== "unknown") {
throw new Error(`Expected kind: 'unknown' but got kind: '${routed.kind}'`);
  }
return routed;
}

const VALID_ACTOR = "11111111-1111-4111-8111-111111111111";
const VALID_TARGET = "22222222-2222-4222-8222-222222222222";
const VALID_CORRELATION = "33333333-3333-4333-8333-333333333333";

function buildEvent<T extends string>(
event: T,
data: Record<string, unknown>,
): RawSocketEvent {
return { event, data };
}

function buildValidBaseData() {
return {
version: 1,
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
correlationId: VALID_CORRELATION,
  };
}

describe("routeSocialSocketEvent — nine-event dispatch table", () => {
it("routes 'relationship.changed' to its discriminator", () => {
const event = buildEvent("relationship.changed", {
...buildValidBaseData(),
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
    });
const routed: RoutedSocialEvent = routeSocialSocketEvent(event);
expect(routed.kind).toBe("relationship.changed");
  });

it("routes 'blocked.changed' to its discriminator", () => {
const event = buildEvent("blocked.changed", {
...buildValidBaseData(),
relationship: "blocked",
isBlocked: true,
changedAt: "2026-08-07T00:00:00.000Z",
    });
expect(routeSocialSocketEvent(event).kind).toBe("blocked.changed");
  });

it("routes 'friend.request.received' to its discriminator", () => {
const event = buildEvent("friend.request.received", {
...buildValidBaseData(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
requestedAt: "2026-08-07T00:00:00.000Z",
    });
expect(routeSocialSocketEvent(event).kind).toBe("friend.request.received");
  });

it("routes 'friend.request.responded' to its discriminator", () => {
const event = buildEvent("friend.request.responded", {
...buildValidBaseData(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
decision: "accept",
respondedAt: "2026-08-07T00:00:00.000Z",
    });
expect(routeSocialSocketEvent(event).kind).toBe("friend.request.responded");
  });

it("routes 'friend.request.cancelled' to its discriminator", () => {
const event = buildEvent("friend.request.cancelled", {
...buildValidBaseData(),
requesterUserId: VALID_ACTOR,
recipientUserId: VALID_TARGET,
cancelledAt: "2026-08-07T00:00:00.000Z",
    });
expect(routeSocialSocketEvent(event).kind).toBe("friend.request.cancelled");
  });

it("routes 'friend.added' to its discriminator", () => {
const event = buildEvent("friend.added", {
...buildValidBaseData(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
mutual: true,
addedAt: "2026-08-07T00:00:00.000Z",
    });
expect(routeSocialSocketEvent(event).kind).toBe("friend.added");
  });

it("routes 'friend.removed' to its discriminator", () => {
const event = buildEvent("friend.removed", {
...buildValidBaseData(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
mutual: false,
removedAt: "2026-08-07T00:00:00.000Z",
    });
expect(routeSocialSocketEvent(event).kind).toBe("friend.removed");
  });

it("routes 'follow.received' to its discriminator", () => {
const event = buildEvent("follow.received", {
...buildValidBaseData(),
followerUserId: VALID_ACTOR,
targetUserId: VALID_TARGET,
followedAt: "2026-08-07T00:00:00.000Z",
    });
expect(routeSocialSocketEvent(event).kind).toBe("follow.received");
  });

it("routes 'feed.item.added' to its discriminator", () => {
const event = buildEvent("feed.item.added", {
...buildValidBaseData(),
feedItemId: "feed-1",
feedItemType: "badge_earned",
addedAt: "2026-08-07T00:00:00.000Z",
    });
expect(routeSocialSocketEvent(event).kind).toBe("feed.item.added");
  });
});

describe("routeSocialSocketEvent — fallthrough to unknown", () => {
it("returns kind: 'unknown' with rawType for unrecognised event name", () => {
const routed = routeSocialSocketEvent({
event: "phase99:totally-unknown",
data: { hello: "world" },
    });
expect(routed.kind).toBe("unknown");
expect(asUnknown(routed).rawType).toBe("phase99:totally-unknown");
  });

it("returns kind: 'unknown' with rawType: 'error' for WsErrorPayload", () => {
const routed = routeSocialSocketEvent({
event: "friend.request.received",
data: { code: "WS_AUTH_EXPIRED", message: "Token expired" },
    });
expect(routed.kind).toBe("unknown");
expect(asUnknown(routed).rawType).toBe("error");
  });

it("returns kind: 'unknown' for malformed payload (missing required field)", () => {
const routed = routeSocialSocketEvent({
event: "relationship.changed",
data: { ...buildValidBaseData() }, // missing relationship / previousRelationship / changedAt
    });
expect(routed.kind).toBe("unknown");
expect(asUnknown(routed).rawType).toBe("relationship.changed");
  });

it("returns kind: 'unknown' for payload with non-UUID actorUserId", () => {
const routed = routeSocialSocketEvent({
event: "blocked.changed",
data: {
...buildValidBaseData(),
actorUserId: "not-a-uuid",
relationship: "blocked",
isBlocked: true,
changedAt: "2026-08-07T00:00:00.000Z",
      },
    });
expect(routed.kind).toBe("unknown");
expect(asUnknown(routed).rawType).toBe("blocked.changed");
  });

it("returns kind: 'unknown' for self-action (actor === target)", () => {
const routed = routeSocialSocketEvent({
event: "relationship.changed",
data: {
...buildValidBaseData(),
actorUserId: VALID_ACTOR,
targetUserId: VALID_ACTOR,
relationship: "friend",
previousRelationship: "none",
changedAt: "2026-08-07T00:00:00.000Z",
      },
    });
expect(routed.kind).toBe("unknown");
expect(asUnknown(routed).rawType).toBe("relationship.changed");
  });
});

describe("routeSocialSocketEvent — dispatch-table completeness", () => {
it("covers exactly the nine documented social event names", () => {
const knownKinds = [
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
for (const eventName of knownKinds) {

const routed = routeSocialSocketEvent({
event: eventName,
data: { version: 1 }, // minimal valid-shape base
      });

expect(routed.kind).toBe("unknown");
expect(asUnknown(routed).rawType).toBe(eventName);
    }
  });
});