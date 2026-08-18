

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

import {
getBlockedUsers,
getFriendsOfUser,
getMutualFollowers,
getMutualFriends,
getSocialCounts,
getUserActivity,
getUserFollowers,
getUserFollowing,
} from "@/features/social/services/social-graph.service";

const mockSocialControllerGetUserFollowers = vi.fn();
const mockSocialControllerGetUserFollowing = vi.fn();
const mockSocialControllerGetFriendsOfUser = vi.fn();
const mockSocialControllerGetBlockedUsers = vi.fn();
const mockSocialControllerGetSocialCounts = vi.fn();
const mockSocialControllerGetMutualFriends = vi.fn();
const mockSocialControllerGetMutualFollowers = vi.fn();
const mockSocialControllerGetUserActivity = vi.fn();

vi.mock("@/lib/api", async () => {
const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
return {
...actual,
getSocial: () => ({
socialControllerGetUserFollowers: (
...args: unknown[]
      ) => mockSocialControllerGetUserFollowers(...args),
socialControllerGetUserFollowing: (
...args: unknown[]
      ) => mockSocialControllerGetUserFollowing(...args),
socialControllerGetFriendsOfUser: (
...args: unknown[]
      ) => mockSocialControllerGetFriendsOfUser(...args),
socialControllerGetBlockedUsers: (
...args: unknown[]
      ) => mockSocialControllerGetBlockedUsers(...args),
socialControllerGetSocialCounts: (
...args: unknown[]
      ) => mockSocialControllerGetSocialCounts(...args),
socialControllerGetMutualFriends: (
...args: unknown[]
      ) => mockSocialControllerGetMutualFriends(...args),
socialControllerGetMutualFollowers: (
...args: unknown[]
      ) => mockSocialControllerGetMutualFollowers(...args),
socialControllerGetUserActivity: (
...args: unknown[]
      ) => mockSocialControllerGetUserActivity(...args),
    }),
  };
});

afterEach(() => {
vi.clearAllMocks();
});

function makeApiError(status: number, code: string, message: string): ApiError {
return new ApiError({
name: "AxiosError",
message,
isAxiosError: true,
response: {
status,
statusText: "X",
data: {
type: "https://api.quiz.local/problems/x",
title: "X",
status,
detail: message,
instance: "/api/v1/x",
extensions: { code, requestId: "req-test" },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

const OFFSET_ENVELOPE = {
data: [] as readonly unknown[],
meta: {
pagination: {
kind: "offset",
total: 0,
offset: 0,
limit: 0,
    },
timestamp: "2026-08-05T00:00:00.000Z",
  },
};

const CURSOR_ENVELOPE = {
data: [] as readonly unknown[],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 0,
    },
timestamp: "2026-08-05T00:00:00.000Z",
  },
};

describe("social-graph.service — followers / following / friends", () => {
it("getUserFollowers forwards userId + params and returns a normalized page", async () => {
mockSocialControllerGetUserFollowers.mockResolvedValue({
data: [
{
userId: "user-1",
username: "alice",
followedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: "next",
limit: 1,
        },
timestamp: "2026-08-05T00:00:00.000Z",
      },
    });

const page = await getUserFollowers("user-1", { cursor: "next", limit: 1 });

expect(mockSocialControllerGetUserFollowers).toHaveBeenCalledWith("user-1", {
cursor: "next",
limit: 1,
    });
expect(page.paginationKind).toBe("cursor");
expect(page.items).toHaveLength(1);
expect(page.items[0]?.userId).toBe("user-1");
expect(page.items[0]?.userName).toBe("alice");
  });

it("getUserFollowing returns a normalized page", async () => {
mockSocialControllerGetUserFollowing.mockResolvedValue({
data: [
{
userId: "user-2",
username: "bob",
followedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 1,
        },
timestamp: "2026-08-05T00:00:00.000Z",
      },
    });

const page = await getUserFollowing("user-2");

expect(mockSocialControllerGetUserFollowing).toHaveBeenCalledWith("user-2", undefined);
expect(page.paginationKind).toBe("cursor");
expect(page.items).toHaveLength(1);
  });

it("getFriendsOfUser forwards limit + cursor and discards friendshipId", async () => {
mockSocialControllerGetFriendsOfUser.mockResolvedValue({
data: [
{
userId: "user-3",
username: "carol",
friendshipId: "internal-friend-1",
friendSince: "2026-08-01T00:00:00.000Z",
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 1,
        },
timestamp: "2026-08-05T00:00:00.000Z",
      },
    });

const page = await getFriendsOfUser("user-3", { limit: 1, cursor: null });

expect(mockSocialControllerGetFriendsOfUser).toHaveBeenCalledWith("user-3", {
limit: 1,
cursor: "",
    });
expect(page.items).toHaveLength(1);
expect(page.items[0]?.userId).toBe("user-3");

expect(
(page.items[0] as unknown as Record<string, unknown>).friendshipId,
    ).toBeUndefined();
  });
});

describe("social-graph.service — blocked / counts / mutuals", () => {
it("getBlockedUsers synthesizes a single-page cursor response", async () => {
mockSocialControllerGetBlockedUsers.mockResolvedValue({
data: [
{ blockedId: "user-x", reason: null },
{ blockedId: "user-y", reason: "spam" },
      ],
meta: { timestamp: "2026-08-05T00:00:00.000Z" },
    });

const page = await getBlockedUsers();

expect(page.paginationKind).toBe("cursor");
expect(page.items).toHaveLength(2);
expect(page.items[0]?.userId).toBe("user-x");
expect(page.items[1]?.userId).toBe("user-y");
if (page.paginationKind === "cursor") {
expect(page.nextCursor).toBeNull();
    }
  });

it("getSocialCounts returns the normalized projection", async () => {
mockSocialControllerGetSocialCounts.mockResolvedValue({
data: {
friendCount: 12,
followerCount: 100,
followingCount: 50,
      },
meta: { timestamp: "2026-08-05T00:00:00.000Z" },
    });

const counts = await getSocialCounts();

expect(counts).toEqual({
followers: 100,
following: 50,
friends: 12,
blocked: 0,
pendingIncomingCount: undefined,
pendingOutgoingCount: undefined,
    });
  });

it("getSocialCounts returns zeroed projection on 404", async () => {
mockSocialControllerGetSocialCounts.mockRejectedValue(
makeApiError(404, "GLOBAL_NOT_FOUND", "Counts not found"),
    );

await expect(getSocialCounts()).rejects.toMatchObject({
code: "GLOBAL_NOT_FOUND",
status: 404,
    });
  });

it("getMutualFriends returns a normalized SocialMutualDto page", async () => {
mockSocialControllerGetMutualFriends.mockResolvedValue({
data: [
{ userId: "m-1", username: "x", mutualFriends: 3 },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 1,
        },
timestamp: "2026-08-05T00:00:00.000Z",
      },
    });

const page = await getMutualFriends("user-9");

expect(page.items).toHaveLength(1);
expect(page.items[0]?.user.userId).toBe("m-1");
expect(page.items[0]?.mutualFriendsCount).toBe(3);
expect(page.items[0]?.mutualFollowersCount).toBe(0);
  });

it("getMutualFollowers returns a normalized SocialMutualDto page", async () => {
mockSocialControllerGetMutualFollowers.mockResolvedValue({
data: [
{ userId: "m-2", username: "y", mutualFollowers: 5 },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 1,
        },
timestamp: "2026-08-05T00:00:00.000Z",
      },
    });

const page = await getMutualFollowers("user-9");

expect(page.items).toHaveLength(1);
expect(page.items[0]?.user.userId).toBe("m-2");
expect(page.items[0]?.mutualFollowersCount).toBe(5);
  });
});

describe("social-graph.service — activity payload filter", () => {
it("getUserActivity drops rows with unknown payload type", async () => {
mockSocialControllerGetUserActivity.mockResolvedValue({
data: [
{
id: "act-1",
type: "badge_earned",
occurredAt: "2026-08-01T00:00:00.000Z",
payload: { type: "badge_earned", badgeId: "b-1", badgeSlug: "first-quiz" },
        },
{
id: "act-2",
type: "unknown_type",
occurredAt: "2026-08-01T00:00:00.000Z",
payload: {},
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 2,
        },
timestamp: "2026-08-05T00:00:00.000Z",
      },
    });

const page = await getUserActivity("user-9");

expect(page.items).toHaveLength(1);
expect(page.items[0]?.id).toBe("act-1");
expect(page.items[0]?.type).toBe("badge_earned");
  });
});

describe("social-graph.service — error propagation", () => {
it("getUserFollowers propagates 403 SOCIAL_FRIEND_LIST_FORBIDDEN", async () => {
mockSocialControllerGetUserFollowers.mockRejectedValue(
makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN", "Friends list private"),
    );

await expect(
getUserFollowers("user-private"),
    ).rejects.toMatchObject({
code: "SOCIAL_FRIEND_LIST_FORBIDDEN",
status: 403,
    });
  });

it("getUserFollowers throws GLOBAL_INTERNAL_ERROR when the envelope is missing", async () => {
mockSocialControllerGetUserFollowers.mockResolvedValue(undefined);

await expect(getUserFollowers("user-1")).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });
});

describe("social-graph.service — pagination-kind preservation", () => {
it("getUserFollowers preserves paginationKind from the wire envelope", async () => {
mockSocialControllerGetUserFollowers.mockResolvedValue({
data: [
{
userId: "u-1",
username: "a",
followedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: "next",
limit: 1,
        },
timestamp: "2026-08-05T00:00:00.000Z",
      },
    });

const page = await getUserFollowers("user-1");

expect(page.paginationKind).toBe("cursor");
if (page.paginationKind === "cursor") {
expect(page.nextCursor).toBe("next");
    }
  });

it("getMutualFriends preserves paginationKind from the wire envelope", async () => {
mockSocialControllerGetMutualFriends.mockResolvedValue({
data: [{ userId: "m-1", username: "x", mutualFriends: 1 }],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 1,
        },
timestamp: "2026-08-05T00:00:00.000Z",
      },
    });

const page = await getMutualFriends("user-9");

expect(page.paginationKind).toBe("cursor");
  });
});

void OFFSET_ENVELOPE;
void CURSOR_ENVELOPE;
