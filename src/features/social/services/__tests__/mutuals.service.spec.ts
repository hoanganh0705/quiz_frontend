

import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import {
getMutualFriends,
getMutualFollowers,
} from "@/features/social/services/mutuals.service";
import { MUTUAL_TOTAL_HARD_CAP } from "@/features/social/mutual-count-invariants";

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

const mockSocialControllerGetMutualFriends = vi.fn();
const mockSocialControllerGetMutualFollowers = vi.fn();
vi.mock("@/lib/api", async () => {
const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
return {
...actual,
getSocial: () => ({
socialControllerGetMutualFriends: (
...args: unknown[]
      ) => mockSocialControllerGetMutualFriends(...args),
socialControllerGetMutualFollowers: (
...args: unknown[]
      ) => mockSocialControllerGetMutualFollowers(...args),
    }),
  };
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

afterEach(() => {
mockSocialControllerGetMutualFriends.mockReset();
mockSocialControllerGetMutualFollowers.mockReset();
addBreadcrumbMock.mockClear();
});

describe("mutuals.service — getMutualFriends", () => {
it("forwards targetUserId and unwraps the envelope", async () => {
mockSocialControllerGetMutualFriends.mockResolvedValue({
data: [
{
userId: "user-a",
username: "alice",
displayName: "Alice",
avatarUrl: null,
mutualFriends: 4,
mutualFollowers: 2,
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: "cursor-1",
limit: 25,
        },
      },
    });

const result = await getMutualFriends("user-1");

expect(mockSocialControllerGetMutualFriends).toHaveBeenCalledTimes(1);
expect(mockSocialControllerGetMutualFriends).toHaveBeenCalledWith(
"user-1",
undefined,
    );
expect(result.items).toHaveLength(1);
expect(result.items[0]!.user.userId).toBe("user-a");
expect(result.items[0]!.mutualFriendsCount).toBe(4);
expect(result.items[0]!.mutualFollowersCount).toBe(2);
expect(result.total).toBe(1);
expect(result.visibility).toBe("visible");
  });

it("forwards pagination params to the SDK call", async () => {
mockSocialControllerGetMutualFriends.mockResolvedValue({
data: [],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 25,
        },
      },
    });

await getMutualFriends("user-1", { cursor: "abc", limit: 25 });

expect(mockSocialControllerGetMutualFriends).toHaveBeenCalledWith("user-1", {
cursor: "abc",
limit: 25,
    });
  });

it("clamps total against MUTUAL_TOTAL_HARD_CAP", async () => {
mockSocialControllerGetMutualFriends.mockResolvedValue({
data: [],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 25,
        },
      },
    });

const result = await getMutualFriends("user-1");

expect(result.total).toBe(0);
expect(MUTUAL_TOTAL_HARD_CAP).toBe(500);
  });

it("emits two social:6.4 breadcrumbs (in-flight + resolved)", async () => {
mockSocialControllerGetMutualFriends.mockResolvedValue({
data: [{ userId: "user-a", username: "alice", mutualFriends: 1, mutualFollowers: 0 }],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 25,
        },
      },
    });

await getMutualFriends("user-1");

expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
const calls = addBreadcrumbMock.mock.calls.map(
(c) => (c[0] as { data: Record<string, unknown> }).data,
    );
expect(calls[0]!.surface).toBe("mutuals-friends");
expect(calls[0]!.route).toBe("social.getMutualFriends");
expect(calls[0]!.targetUserId).toBe("user-1");
expect(calls[1]!.total).toBe(1);
  });

it("drops followId / friendshipId when they leak through the wire body", async () => {
mockSocialControllerGetMutualFriends.mockResolvedValue({
data: [
{
userId: "user-a",
username: "alice",
displayName: "Alice",
avatarUrl: null,
mutualFriends: 4,
mutualFollowers: 2,

followId: "follow-leaked-1",
friendshipId: "friend-leaked-1",
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 25,
        },
      },
    });

const result = await getMutualFriends("user-1");

const item = result.items[0] as unknown as Record<string, unknown>;
expect(item.followId).toBeUndefined();
expect(item.friendshipId).toBeUndefined();
  });

it("propagates a 403 SOCIAL_FRIEND_LIST_FORBIDDEN ApiError", async () => {
mockSocialControllerGetMutualFriends.mockRejectedValue(
makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN", "Not allowed"),
    );

await expect(getMutualFriends("user-1")).rejects.toMatchObject({
code: "SOCIAL_FRIEND_LIST_FORBIDDEN",
status: 403,
    });
  });

it("propagates a 404 SOCIAL_USER_NOT_FOUND ApiError", async () => {
mockSocialControllerGetMutualFriends.mockRejectedValue(
makeApiError(404, "SOCIAL_USER_NOT_FOUND", "Missing user"),
    );

await expect(getMutualFriends("user-missing")).rejects.toMatchObject({
code: "SOCIAL_USER_NOT_FOUND",
status: 404,
    });
  });

it("throws GLOBAL_INTERNAL_ERROR when the envelope itself is null", async () => {
mockSocialControllerGetMutualFriends.mockResolvedValue(null);

await expect(getMutualFriends("user-1")).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("returns an empty result when the envelope carries an undefined data array", async () => {

mockSocialControllerGetMutualFriends.mockResolvedValue({
data: undefined,
meta: undefined,
    });

const result = await getMutualFriends("user-1");
expect(result.items).toHaveLength(0);
expect(result.total).toBe(0);
expect(result.visibility).toBe("visible");
  });
});

describe("mutuals.service — getMutualFollowers", () => {
it("forwards targetUserId and unwraps the envelope", async () => {
mockSocialControllerGetMutualFollowers.mockResolvedValue({
data: [
{
userId: "user-b",
username: "bob",
displayName: "Bob",
avatarUrl: null,
mutualFriends: 0,
mutualFollowers: 7,
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 25,
        },
      },
    });

const result = await getMutualFollowers("user-1");

expect(mockSocialControllerGetMutualFollowers).toHaveBeenCalledTimes(1);
expect(mockSocialControllerGetMutualFollowers).toHaveBeenCalledWith(
"user-1",
undefined,
    );
expect(result.items).toHaveLength(1);
expect(result.items[0]!.user.userId).toBe("user-b");
expect(result.items[0]!.mutualFollowersCount).toBe(7);
expect(result.total).toBe(1);
expect(result.visibility).toBe("visible");
  });

it("emits the mutuals-followers surface discriminator", async () => {
mockSocialControllerGetMutualFollowers.mockResolvedValue({
data: [],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 25,
        },
      },
    });

await getMutualFollowers("user-1");

expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
const calls = addBreadcrumbMock.mock.calls.map(
(c) => (c[0] as { data: Record<string, unknown> }).data,
    );
expect(calls[0]!.surface).toBe("mutuals-followers");
expect(calls[0]!.route).toBe("social.getMutualFollowers");
expect(calls[1]!.surface).toBe("mutuals-followers");
  });

it("propagates a 403 SOCIAL_BLOCKED_USER ApiError", async () => {
mockSocialControllerGetMutualFollowers.mockRejectedValue(
makeApiError(403, "SOCIAL_BLOCKED_USER", "Blocked"),
    );

await expect(getMutualFollowers("user-1")).rejects.toMatchObject({
code: "SOCIAL_BLOCKED_USER",
status: 403,
    });
  });

it("throws GLOBAL_INTERNAL_ERROR when the envelope itself is null", async () => {
mockSocialControllerGetMutualFollowers.mockResolvedValue(null);

await expect(getMutualFollowers("user-1")).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("returns an empty result when the envelope carries an undefined data array", async () => {
mockSocialControllerGetMutualFollowers.mockResolvedValue({
data: undefined,
meta: undefined,
    });

const result = await getMutualFollowers("user-1");
expect(result.items).toHaveLength(0);
expect(result.total).toBe(0);
expect(result.visibility).toBe("visible");
  });
});
