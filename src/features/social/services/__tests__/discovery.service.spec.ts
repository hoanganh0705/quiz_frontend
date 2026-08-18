

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import {
getSuggestions,
getSearchSuggestions,
getTrendingUsers,
} from "@/features/social/services/discovery.service";

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

const mockSocialControllerGetSuggestions = vi.fn();
const mockSocialControllerGetSearchSuggestions = vi.fn();
const mockSocialControllerGetTrendingUsers = vi.fn();

vi.mock("@/lib/api", async (importOriginal: (...args: any[]) => Promise<any>) => {
const actual = await importOriginal("@/lib/api");
return {
...actual,
getSocial: () => ({
socialControllerGetSuggestions: (
...args: unknown[]
      ) => mockSocialControllerGetSuggestions(...args),
socialControllerGetSearchSuggestions: (
...args: unknown[]
      ) => mockSocialControllerGetSearchSuggestions(...args),
socialControllerGetTrendingUsers: (
...args: unknown[]
      ) => mockSocialControllerGetTrendingUsers(...args),
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

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
mockSocialControllerGetSuggestions.mockReset();
mockSocialControllerGetSearchSuggestions.mockReset();
mockSocialControllerGetTrendingUsers.mockReset();
addBreadcrumbMock.mockClear();
});

describe("getSuggestions", () => {
it("returns items, total, and visibility on happy path", async () => {
mockSocialControllerGetSuggestions.mockResolvedValue({
data: [
{ userId: "u1", username: "alice", avatarUrl: null, mutualFriends: 3, mutualFollowers: 1, reason: "mutual_friends" },
      ],
meta: { pagination: { kind: "offset", total: 42, offset: 0, limit: 10 } },
    });

const result = await getSuggestions({ limit: 10 });
expect(result.items).toHaveLength(1);
expect(result.total).toBe(42);
expect(result.visibility).toBe("visible");
  });

it("derives total from items length when meta pagination is absent", async () => {
mockSocialControllerGetSuggestions.mockResolvedValue({
data: [{ userId: "u1", username: "bob", avatarUrl: null, mutualFriends: 0, mutualFollowers: 0, reason: "popular" }],
meta: {},
    });

const result = await getSuggestions();
expect(result.total).toBe(1);
  });

it("throws GLOBAL_INTERNAL_ERROR when envelope is missing", async () => {
mockSocialControllerGetSuggestions.mockResolvedValue(null);

await expect(getSuggestions()).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("propagates ApiError on HTTP error", async () => {
const err = makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN", "Forbidden");
mockSocialControllerGetSuggestions.mockRejectedValue(err);

await expect(getSuggestions()).rejects.toMatchObject({
code: "SOCIAL_FRIEND_LIST_FORBIDDEN",
    });
  });

it("emits two breadcrumbs (in-flight + resolved)", async () => {
mockSocialControllerGetSuggestions.mockResolvedValue({
data: [],
meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 10 } },
    });

await getSuggestions({ limit: 10 });
expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
expect(addBreadcrumbMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
category: "social:6.1",
data: expect.objectContaining({ route: "social.getSuggestions" }),
    }));
expect(addBreadcrumbMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
category: "social:6.1",
data: expect.objectContaining({ route: "social.getSuggestions", status: 200 }),
    }));
  });

it("calls SDK with the pagination limit", async () => {
mockSocialControllerGetSuggestions.mockResolvedValue({
data: [],
meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 20 } },
    });

await getSuggestions({ limit: 20 });
expect(mockSocialControllerGetSuggestions).toHaveBeenCalledWith(
expect.objectContaining({ limit: 20 }),
    );
  });
});

describe("getSearchSuggestions", () => {
it("groups items by kind discriminator", async () => {
mockSocialControllerGetSearchSuggestions.mockResolvedValue({
data: ["user", "user", "quiz", "tag"],
meta: {},
    });

const result = await getSearchSuggestions("al");
expect(result.groups).toEqual({
user: ["user", "user"],
quiz: ["quiz"],
tag: ["tag"],
    });
  });

it("routes unknown discriminator values to unsupported", async () => {
mockSocialControllerGetSearchSuggestions.mockResolvedValue({
data: ["user", "unknown_kind", "garbage"],
meta: {},
    });

const result = await getSearchSuggestions("al");
expect(result.groups).toEqual({
user: ["user"],
unsupported: ["unknown_kind", "garbage"],
    });
  });

it("throws GLOBAL_INTERNAL_ERROR when envelope is missing", async () => {
mockSocialControllerGetSearchSuggestions.mockResolvedValue(null);

await expect(getSearchSuggestions("al")).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("propagates ApiError on HTTP error", async () => {
const err = makeApiError(400, "GLOBAL_BAD_REQUEST", "Bad request");
mockSocialControllerGetSearchSuggestions.mockRejectedValue(err);

await expect(getSearchSuggestions("al")).rejects.toMatchObject({
code: "GLOBAL_BAD_REQUEST",
    });
  });

it("emits two breadcrumbs with route social.getSearchSuggestions", async () => {
mockSocialControllerGetSearchSuggestions.mockResolvedValue({
data: [],
meta: {},
    });

await getSearchSuggestions("al");
expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
expect(addBreadcrumbMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
data: expect.objectContaining({ route: "social.getSearchSuggestions" }),
    }));
expect(addBreadcrumbMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
data: expect.objectContaining({ route: "social.getSearchSuggestions", status: 200 }),
    }));
  });

it("calls SDK with query and limit", async () => {
mockSocialControllerGetSearchSuggestions.mockResolvedValue({
data: [],
meta: {},
    });

await getSearchSuggestions("al", 5);
expect(mockSocialControllerGetSearchSuggestions).toHaveBeenCalledWith(
expect.objectContaining({ q: "al", limit: 5 }),
    );
  });
});

describe("getTrendingUsers", () => {
it("returns items, total, and visibility on happy path", async () => {
mockSocialControllerGetTrendingUsers.mockResolvedValue({
data: [
{ userId: "u1", username: "alice", avatarUrl: null, followers: 1000, trendScore: 9.5, trendReason: "most_followed" },
      ],
meta: {},
    });

const result = await getTrendingUsers({ limit: 25 });
expect(result.items).toHaveLength(1);
expect(result.total).toBe(1);
expect(result.visibility).toBe("visible");
  });

it("returns total as items length", async () => {
mockSocialControllerGetTrendingUsers.mockResolvedValue({
data: [
{ userId: "u1", username: "alice", avatarUrl: null, followers: 1000, trendScore: 9.5, trendReason: "most_followed" },
{ userId: "u2", username: "bob", avatarUrl: null, followers: 800, trendScore: 8.0, trendReason: "fastest_growing" },
      ],
meta: {},
    });

const result = await getTrendingUsers();
expect(result.total).toBe(2);
  });

it("throws GLOBAL_INTERNAL_ERROR when envelope is missing", async () => {
mockSocialControllerGetTrendingUsers.mockResolvedValue(null);

await expect(getTrendingUsers()).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("propagates ApiError on HTTP error", async () => {
const err = makeApiError(500, "GLOBAL_INTERNAL_ERROR", "Internal error");
mockSocialControllerGetTrendingUsers.mockRejectedValue(err);

await expect(getTrendingUsers()).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("emits two breadcrumbs with route social.getTrendingUsers", async () => {
mockSocialControllerGetTrendingUsers.mockResolvedValue({
data: [],
meta: {},
    });

await getTrendingUsers();
expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
expect(addBreadcrumbMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
data: expect.objectContaining({ route: "social.getTrendingUsers" }),
    }));
expect(addBreadcrumbMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
data: expect.objectContaining({ route: "social.getTrendingUsers", status: 200 }),
    }));
  });

it("calls SDK with the pagination limit", async () => {
mockSocialControllerGetTrendingUsers.mockResolvedValue({
data: [],
meta: {},
    });

await getTrendingUsers({ limit: 10 });
expect(mockSocialControllerGetTrendingUsers).toHaveBeenCalledWith(
expect.objectContaining({ limit: 10 }),
    );
  });
});
