

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

import { getRelationshipStatus } from "@/features/social/services/relationship.service";

const mockSocialControllerGetRelationshipStatus = vi.fn();
vi.mock("@/lib/api", async () => {
const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
return {
...actual,
getSocial: () => ({
socialControllerGetRelationshipStatus: (
...args: unknown[]
      ) => mockSocialControllerGetRelationshipStatus(...args),
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

describe("relationship.service — pass-through", () => {
it("getRelationshipStatus forwards the userId and unwraps the envelope", async () => {
mockSocialControllerGetRelationshipStatus.mockResolvedValue({
data: {
isFriend: true,
hasPendingRequest: false,
isFollower: false,
isFollowing: true,
isBlocked: false,
isBlockedBy: false,
      },
meta: { timestamp: "2026-08-05T00:00:00.000Z" },
    });

const result = await getRelationshipStatus("user-1");

expect(mockSocialControllerGetRelationshipStatus).toHaveBeenCalledTimes(1);
expect(mockSocialControllerGetRelationshipStatus).toHaveBeenCalledWith("user-1");
expect(result).toEqual({
userId: "",
relationship: "friend",
since: "1970-01-01T00:00:00.000Z",
followId: undefined,
friendshipId: undefined,
    });
  });

it("getRelationshipStatus drops followId / friendshipId when they leak through", async () => {
mockSocialControllerGetRelationshipStatus.mockResolvedValue({
data: {
isFriend: true,
hasPendingRequest: false,
isFollower: false,
isFollowing: true,
isBlocked: false,
isBlockedBy: false,

...({
followId: "follow-leaked-1",
friendshipId: "friend-leaked-1",
        } as unknown as Record<string, never>),
      },
meta: { timestamp: "2026-08-05T00:00:00.000Z" },
    });

const result = await getRelationshipStatus("user-1");

expect((result as unknown as Record<string, unknown>).followId).toBeUndefined();
expect((result as unknown as Record<string, unknown>).friendshipId).toBeUndefined();
  });
});

describe("relationship.service — ApiError code exposure", () => {
it("surfaces 401 GLOBAL_UNAUTHENTICATED for an unauthenticated viewer", async () => {
mockSocialControllerGetRelationshipStatus.mockRejectedValue(
makeApiError(401, "GLOBAL_UNAUTHENTICATED", "Sign in required"),
    );

await expect(getRelationshipStatus("user-1")).rejects.toMatchObject({
code: "GLOBAL_UNAUTHENTICATED",
status: 401,
    });
  });

it("surfaces 404 GLOBAL_NOT_FOUND for an unknown target", async () => {
mockSocialControllerGetRelationshipStatus.mockRejectedValue(
makeApiError(404, "GLOBAL_NOT_FOUND", "User not found"),
    );

await expect(getRelationshipStatus("user-missing")).rejects.toMatchObject({
code: "GLOBAL_NOT_FOUND",
status: 404,
    });
  });

it("surfaces 500 GLOBAL_INTERNAL_ERROR for a missing envelope", async () => {
mockSocialControllerGetRelationshipStatus.mockResolvedValue({
data: undefined,
meta: { timestamp: "2026-08-05T00:00:00.000Z" },
    });

await expect(getRelationshipStatus("user-1")).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });
});
