

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { searchUsers } from "@/features/social/services/search.service";

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

const mockSocialControllerSearchUsers = vi.fn();

vi.mock("@/lib/api", async (importOriginal: (...args: any[]) => Promise<any>) => {
const actual = await importOriginal("@/lib/api");
return {
...actual,
getSocial: () => ({
socialControllerSearchUsers: (
...args: unknown[]
      ) => mockSocialControllerSearchUsers(...args),
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
mockSocialControllerSearchUsers.mockReset();
addBreadcrumbMock.mockClear();
});

afterEach(() => {
vi.restoreAllMocks();
});

describe("searchUsers", () => {
it("returns items, total, and visibility on happy path", async () => {
mockSocialControllerSearchUsers.mockResolvedValue({
data: [
{ userId: "u1", username: "alice", avatarUrl: null, displayName: null, isFriend: false, hasPendingRequest: false, isBlocked: false },
      ],
meta: { pagination: { kind: "offset", total: 5, offset: 0, limit: 20 } },
headers: {},
    });

const result = await searchUsers("alice");
expect(result.items).toHaveLength(1);
expect(result.total).toBe(5);
expect(result.visibility).toBe("visible");
expect(result.cooldownSeconds).toBeNull();
  });

it("derives total from items length when meta pagination is absent", async () => {
mockSocialControllerSearchUsers.mockResolvedValue({
data: [{ userId: "u1", username: "bob", avatarUrl: null, displayName: null, isFriend: false, hasPendingRequest: false, isBlocked: false }],
meta: {},
headers: {},
    });

const result = await searchUsers("bob");
expect(result.total).toBe(1);
  });

it("returns null cooldownSeconds when no rate-limit headers are present", async () => {
mockSocialControllerSearchUsers.mockResolvedValue({
data: [],
meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 20 } },
headers: {},
    });

const result = await searchUsers("test");
expect(result.cooldownSeconds).toBeNull();
  });

it("throws GLOBAL_INTERNAL_ERROR when envelope is missing", async () => {
mockSocialControllerSearchUsers.mockResolvedValue(null);

await expect(searchUsers("test")).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("propagates ApiError on HTTP error", async () => {
const err = makeApiError(400, "GLOBAL_BAD_REQUEST", "Bad request");
mockSocialControllerSearchUsers.mockRejectedValue(err);

await expect(searchUsers("test")).rejects.toMatchObject({
code: "GLOBAL_BAD_REQUEST",
    });
  });

it("emits two breadcrumbs with route social.searchUsers", async () => {
mockSocialControllerSearchUsers.mockResolvedValue({
data: [],
meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 20 } },
headers: {},
    });

await searchUsers("test");
expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
expect(addBreadcrumbMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
data: expect.objectContaining({ route: "social.searchUsers" }),
    }));
expect(addBreadcrumbMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
data: expect.objectContaining({ route: "social.searchUsers", status: 200 }),
    }));
  });

it("calls SDK with query and limit", async () => {
mockSocialControllerSearchUsers.mockResolvedValue({
data: [],
meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 20 } },
headers: {},
    });

await searchUsers("alice", { limit: 20 });
expect(mockSocialControllerSearchUsers).toHaveBeenCalledWith(
expect.objectContaining({ q: "alice", limit: 20 }),
    );
  });
});
