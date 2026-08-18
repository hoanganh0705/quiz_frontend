

import { describe, expect, it } from "vitest";

import {
normalizeSocialCursorPage,
normalizeSocialFeedItemPayload,
normalizeSocialOffsetPage,
normalizeSocialPage,
stripRelationshipInternalIds,
toBlockedUser,
toFriendRequest,
toRelationship,
toSocialCounts,
toSocialUserSummaryFromFollowRow,
toSocialUserSummaryFromFriendRow,
toUserSummary,
} from "../dto-adapters";

describe("social/dto-adapters", () => {
describe("stripRelationshipInternalIds", () => {
it("returns the canonical projection when given a populated wire payload", () => {
const result = stripRelationshipInternalIds({
userId: "u1",
since: "2026-01-01T00:00:00.000Z",
isFriend: true,
hasPendingRequest: false,
isFollower: false,
isFollowing: false,
isBlocked: false,
isBlockedBy: false,
followId: "internal-1",
friendshipId: "internal-2",
      });
expect(result).toEqual({
userId: "u1",
relationship: "friend",
since: "2026-01-01T00:00:00.000Z",
followId: undefined,
friendshipId: undefined,
      });
    });

it("drops followId and friendshipId even when the wire payload lacks them", () => {
const result = stripRelationshipInternalIds({
userId: "u2",
isFriend: false,
isFollowing: true,
hasPendingRequest: false,
isFollower: false,
isBlocked: false,
isBlockedBy: false,
      });
expect(result.userId).toBe("u2");
expect(result.relationship).toBe("following");
expect(result.followId).toBeUndefined();
expect(result.friendshipId).toBeUndefined();
    });

it("handles null and undefined by emitting the empty projection", () => {
const nullResult = stripRelationshipInternalIds(null);
expect(nullResult.relationship).toBe("none");
expect(nullResult.userId).toBe("");
expect(nullResult.followId).toBeUndefined();
expect(nullResult.friendshipId).toBeUndefined();

const undefinedResult = stripRelationshipInternalIds(undefined);
expect(undefinedResult.relationship).toBe("none");
expect(undefinedResult.userId).toBe("");
    });

it("returns a frozen object so consumers cannot mutate the projection", () => {
const result = stripRelationshipInternalIds({ userId: "u3" });
expect(Object.isFrozen(result)).toBe(true);
    });

it("treats missing userId as the empty string rather than throwing", () => {
const result = stripRelationshipInternalIds({ isFriend: true });
expect(result.userId).toBe("");
expect(result.relationship).toBe("friend");
    });
  });

describe("toRelationship", () => {
it("returns the canonical value for every documented enum literal", () => {
for (const value of [
"self",
"friend",
"incoming_request",
"outgoing_request",
"following",
"follower",
"blocked",
"blocked_by",
"none",
      ]) {
expect(toRelationship(value)).toBe(value);
      }
    });

it("returns 'none' for any unknown string", () => {
expect(toRelationship("not_a_real_status")).toBe("none");
expect(toRelationship("")).toBe("none");
    });

it("returns 'none' for null and undefined", () => {
expect(toRelationship(null)).toBe("none");
expect(toRelationship(undefined)).toBe("none");
    });

it("maps the wire DTO's boolean flags to the canonical enum", () => {
expect(
toRelationship({
isFriend: true,
isBlocked: false,
isBlockedBy: false,
hasPendingRequest: false,
isFollowing: false,
isFollower: false,
        }),
      ).toBe("friend");
expect(
toRelationship({
isFriend: false,
isBlocked: true,
        }),
      ).toBe("blocked");
expect(
toRelationship({
isFriend: false,
isBlocked: false,
isBlockedBy: true,
        }),
      ).toBe("blocked_by");
expect(
toRelationship({
isFriend: false,
isBlocked: false,
isBlockedBy: false,
hasPendingRequest: true,
        }),
      ).toBe("incoming_request");
expect(
toRelationship({
isFollowing: true,
        }),
      ).toBe("following");
expect(
toRelationship({
isFollower: true,
        }),
      ).toBe("follower");
    });

it("applies the precedence order: friend > blocked > blocked_by > pending > following > follower", () => {

expect(
toRelationship({
isFriend: true,
isBlocked: true,
isBlockedBy: true,
        }),
      ).toBe("friend");

expect(
toRelationship({
isBlocked: true,
isBlockedBy: true,
hasPendingRequest: true,
        }),
      ).toBe("blocked");
    });

it("returns 'none' for a wire DTO with all-false booleans", () => {
expect(
toRelationship({
isFriend: false,
hasPendingRequest: false,
isFollower: false,
isFollowing: false,
isBlocked: false,
isBlockedBy: false,
        }),
      ).toBe("none");
    });

it("returns 'none' for non-object, non-string inputs", () => {
expect(toRelationship(42)).toBe("none");
expect(toRelationship(true)).toBe("none");
expect(toRelationship([])).toBe("none");
    });
  });

describe("normalizeSocialOffsetPage", () => {
it("returns the canonical offset page for a populated envelope", () => {
const result = normalizeSocialOffsetPage<{ id: string }>({
data: [{ id: "1" }, { id: "2" }],
meta: {
pagination: {
kind: "offset",
total: 100,
offset: 0,
limit: 20,
          },
        },
      });
expect(result.paginationKind).toBe("offset");
expect(result.items).toEqual([{ id: "1" }, { id: "2" }]);
if (result.paginationKind === "offset") {
expect(result.total).toBe(100);
expect(result.offset).toBe(0);
expect(result.limit).toBe(20);
      }
    });

it("returns the empty page for null", () => {
const result = normalizeSocialOffsetPage<{ id: string }>(null);
expect(result.paginationKind).toBe("offset");
expect(result.items).toEqual([]);
if (result.paginationKind === "offset") {
expect(result.total).toBe(0);
      }
    });

it("returns the empty page for undefined", () => {
const result = normalizeSocialOffsetPage<{ id: string }>(undefined);
expect(result.paginationKind).toBe("offset");
expect(result.items).toEqual([]);
if (result.paginationKind === "offset") {
expect(result.offset).toBe(0);
expect(result.limit).toBe(0);
      }
    });

it("returns a frozen object", () => {
const result = normalizeSocialOffsetPage<{ id: string }>({
data: [],
meta: {
pagination: { kind: "offset", total: 0, offset: 0, limit: 0 },
        },
      });
expect(Object.isFrozen(result)).toBe(true);
    });
  });

describe("normalizeSocialCursorPage", () => {
it("returns the canonical cursor page for a populated envelope", () => {
const result = normalizeSocialCursorPage<{ id: string }>({
data: [{ id: "1" }],
meta: {
pagination: { kind: "cursor", nextCursor: "abc", limit: 1 },
        },
      });
expect(result.paginationKind).toBe("cursor");
if (result.paginationKind === "cursor") {
expect(result.nextCursor).toBe("abc");
expect(result.limit).toBe(1);
      }
    });

it("preserves null nextCursor (last page)", () => {
const result = normalizeSocialCursorPage<{ id: string }>({
data: [{ id: "1" }],
meta: {
pagination: { kind: "cursor", nextCursor: null, limit: 1 },
        },
      });
expect(result.paginationKind).toBe("cursor");
if (result.paginationKind === "cursor") {
expect(result.nextCursor).toBeNull();
      }
    });

it("returns the empty offset page for null and undefined inputs", () => {
const nullResult = normalizeSocialCursorPage<{ id: string }>(null);
expect(nullResult.paginationKind).toBe("offset");
expect(nullResult.items).toEqual([]);

const undefinedResult = normalizeSocialCursorPage<{ id: string }>(undefined);
expect(undefinedResult.paginationKind).toBe("offset");
    });
  });

describe("normalizeSocialPage", () => {
it("discriminates on offset envelopes", () => {
const result = normalizeSocialPage<{ id: string }>({
data: [{ id: "1" }],
meta: { pagination: { kind: "offset", total: 1, offset: 0, limit: 1 } },
      });
expect(result.paginationKind).toBe("offset");
    });

it("discriminates on cursor envelopes", () => {
const result = normalizeSocialPage<{ id: string }>({
data: [{ id: "1" }],
meta: { pagination: { kind: "cursor", nextCursor: "next", limit: 1 } },
      });
expect(result.paginationKind).toBe("cursor");
    });

it("returns the empty offset page for null and undefined inputs", () => {
expect(normalizeSocialPage(null).paginationKind).toBe("offset");
expect(normalizeSocialPage(undefined).paginationKind).toBe("offset");
    });

it("falls back to the empty offset page when the kind is unknown", () => {
const result = normalizeSocialPage<{ id: string }>({
data: [],
meta: { pagination: { kind: "unknown" } },
      });
expect(result.paginationKind).toBe("offset");
expect(result.items).toEqual([]);
    });

it("falls back to the empty offset page when the data field is not an array", () => {
const result = normalizeSocialPage<{ id: string }>({
data: null,
meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 0 } },
      });
expect(result.paginationKind).toBe("offset");
expect(result.items).toEqual([]);
    });
  });

describe("normalizeSocialFeedItemPayload", () => {
it("returns the payload for documented variants", () => {
const result = normalizeSocialFeedItemPayload({
type: "badge_earned",
badgeId: "b1",
badgeSlug: "first-quiz",
      });
expect(result).not.toBeNull();
expect(result?.type).toBe("badge_earned");
    });

it("returns null for unknown type values", () => {
expect(
normalizeSocialFeedItemPayload({ type: "future_type" }),
      ).toBeNull();
expect(
normalizeSocialFeedItemPayload({ type: "" }),
      ).toBeNull();
    });

it("returns null for missing type", () => {
expect(normalizeSocialFeedItemPayload({})).toBeNull();
expect(normalizeSocialFeedItemPayload(null)).toBeNull();
expect(normalizeSocialFeedItemPayload(undefined)).toBeNull();
    });

it("returns null for non-object inputs", () => {
expect(normalizeSocialFeedItemPayload("badge_earned")).toBeNull();
expect(normalizeSocialFeedItemPayload(42)).toBeNull();
expect(normalizeSocialFeedItemPayload(true)).toBeNull();
    });
  });

describe("toUserSummary", () => {
it("returns a frozen projection with the canonical field set", () => {
const result = toUserSummary({
userId: "u1",
userName: "user_one",
displayName: "User One",
avatarUrl: "https://example.com/a.png",
isPrivate: true,
createdAt: "2026-01-01T00:00:00.000Z",
      });
expect(result).toEqual({
id: "u1",
userId: "u1",
userName: "user_one",
displayName: "User One",
avatarUrl: "https://example.com/a.png",
isPrivate: true,
createdAt: "2026-01-01T00:00:00.000Z",
      });
expect(Object.isFrozen(result)).toBe(true);
    });

it("falls back to safe defaults for missing fields", () => {
const result = toUserSummary({});
expect(result.userId).toBe("");
expect(result.userName).toBe("");
expect(result.displayName).toBeNull();
expect(result.avatarUrl).toBeNull();
expect(result.isPrivate).toBe(false);
expect(typeof result.createdAt).toBe("string");
    });

it("accepts the legacy `username` alias", () => {
const result = toUserSummary({ userId: "u1", username: "legacy" });
expect(result.userName).toBe("legacy");
    });

it("accepts the requesterId alias used by the friend-request DTO", () => {
const result = toUserSummary({ requesterId: "r1" });
expect(result.userId).toBe("r1");
    });
  });

describe("toSocialUserSummaryFromFollowRow", () => {
it("projects a UserFollowerItemDto into the canonical summary", () => {
const result = toSocialUserSummaryFromFollowRow({
userId: "u1",
username: "follower_one",
avatarUrl: null,
followedAt: "2026-01-01T00:00:00.000Z",
      });
expect(result.userId).toBe("u1");
expect(result.userName).toBe("follower_one");
expect(result.avatarUrl).toBeNull();
    });
  });

describe("toSocialUserSummaryFromFriendRow", () => {
it("projects a FriendDto into the canonical summary and discards friendshipId", () => {
const result = toSocialUserSummaryFromFriendRow({
friendshipId: "fr-1",
userId: "u1",
username: "friend_one",
displayName: "Friend One",
avatarUrl: null,
friendSince: "2026-01-01T00:00:00.000Z",
      });
expect(result.userId).toBe("u1");
expect(result.userName).toBe("friend_one");
expect(result.displayName).toBe("Friend One");

expect(result.id).toBe("u1");
    });
  });

describe("toFriendRequest", () => {
it("projects a FriendRequestDto into the canonical friend request", () => {
const result = toFriendRequest({
friendshipId: "fr-1",
requesterId: "u1",
addresseeId: "u2",
requesterUsername: "requester_one",
requesterDisplayName: "Requester One",
requesterAvatarUrl: null,
createdAt: "2026-01-01T00:00:00.000Z",
      });
expect(result.id).toBe("fr-1");
expect(result.requesterId).toBe("u1");
expect(result.addresseeId).toBe("u2");
expect(result.requester.userName).toBe("requester_one");
expect(result.requester.displayName).toBe("Requester One");
    });

it("handles missing requester fields with safe defaults", () => {
const result = toFriendRequest({});
expect(result.id).toBe("");
expect(result.requesterId).toBe("");
expect(result.requester.userName).toBe("");
expect(result.requester.avatarUrl).toBeNull();
    });
  });

describe("toBlockedUser", () => {
it("projects a BlockedUserDto into the canonical blocked user", () => {
const result = toBlockedUser({
blockedId: "u1",
reason: null,
      });
expect(result.id).toBe("u1");
expect(result.userId).toBe("u1");
expect(result.user.userId).toBe("u1");
expect(typeof result.since).toBe("string");
    });
  });

describe("toSocialCounts", () => {
it("returns the canonical projection with the SDK alias fields", () => {
const result = toSocialCounts({
friendCount: 5,
followerCount: 10,
followingCount: 7,
      });
expect(result.friends).toBe(5);
expect(result.followers).toBe(10);
expect(result.following).toBe(7);
expect(result.blocked).toBe(0);
    });

it("returns the documented shape when the backend uses the projected names", () => {
const result = toSocialCounts({
friends: 1,
followers: 2,
following: 3,
blocked: 4,
pendingIncomingCount: 5,
pendingOutgoingCount: 6,
      });
expect(result).toEqual({
friends: 1,
followers: 2,
following: 3,
blocked: 4,
pendingIncomingCount: 5,
pendingOutgoingCount: 6,
      });
    });

it("returns the zeroed projection for null/undefined", () => {
const nullResult = toSocialCounts(null);
expect(nullResult.friends).toBe(0);
expect(nullResult.followers).toBe(0);
expect(nullResult.following).toBe(0);
expect(nullResult.blocked).toBe(0);
expect(nullResult.pendingIncomingCount).toBeUndefined();
expect(nullResult.pendingOutgoingCount).toBeUndefined();
    });
  });
});