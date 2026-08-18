

import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { getFeed } from "@/features/social/services/feed.service";

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

const mockSocialControllerGetFeed = vi.fn();
vi.mock("@/lib/api", async () => {
const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
return {
...actual,
getSocial: () => ({
socialControllerGetFeed: (...args: unknown[]) =>
mockSocialControllerGetFeed(...args),
    }),
  };
});

function makeApiError(
status: number,
code: string,
message: string,
extensions: Record<string, unknown> = {},
): ApiError {
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
extensions: { code, requestId: "req-test", ...extensions },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

afterEach(() => {
mockSocialControllerGetFeed.mockReset();
addBreadcrumbMock.mockClear();
});

describe("feed.service — getFeed", () => {
it("forwards pagination params to the SDK call and unwraps the envelope", async () => {
mockSocialControllerGetFeed.mockResolvedValue({
data: [
{
id: "feed-1",
type: "badge_earned",
occurredAt: "2026-08-01T12:00:00.000Z",
user: { userId: "user-actor", username: "actor-name" },
payload: {
type: "badge_earned",
badgeId: "badge-1",
badgeSlug: "first-quiz",
badgeName: "First Quiz",
          },
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: "cursor-page-2",
limit: 20,
hasNextPage: true,
        },
      },
    });

const result = await getFeed({ cursor: "cursor-page-1", limit: 20 });

expect(mockSocialControllerGetFeed).toHaveBeenCalledTimes(1);
expect(mockSocialControllerGetFeed).toHaveBeenCalledWith({
cursor: "cursor-page-1",
limit: 20,
    });
expect(result.items).toHaveLength(1);
expect(result.items[0]!.type).toBe("badge_earned");
expect(result.items[0]!.actorUser.userId).toBe("user-actor");
expect(result.items[0]!.actorUser.userName).toBe("actor-name");
expect(result.nextCursor).toBe("cursor-page-2");
expect(result.hasMore).toBe(true);
expect(result.visibility).toBe("visible");
  });

it("forwards nextCursor and hasMore unchanged from the server response", async () => {
const opaqueCursor =
"eyJzdGF0ZSI6eyJvbWN1cnJlZEF0IjoiMjAyNi0wOC0wMVQxMjowMDowMC4wMDBaIn19";
mockSocialControllerGetFeed.mockResolvedValue({
data: [],
meta: {
pagination: {
kind: "cursor",
nextCursor: opaqueCursor,
limit: 20,
hasNextPage: true,
        },
      },
    });

const result = await getFeed();

expect(result.nextCursor).toBe(opaqueCursor);
expect(result.nextCursor === opaqueCursor).toBe(true);
expect(result.hasMore).toBe(true);
  });

it("drops items with unknown type discriminators", async () => {
mockSocialControllerGetFeed.mockResolvedValue({
data: [
{
id: "feed-1",
type: "badge_earned",
occurredAt: "2026-08-01T12:00:00.000Z",
user: { userId: "user-actor", username: "actor-name" },
payload: {
type: "badge_earned",
badgeId: "badge-1",
badgeSlug: "first-quiz",
badgeName: "First Quiz",
          },
        },
{
id: "feed-2",

type: "future_activity_type",
occurredAt: "2026-08-02T12:00:00.000Z",
user: { userId: "user-actor-2", username: "actor-name-2" },
payload: { type: "future_activity_type" },
        },
      ],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 20,
hasNextPage: false,
        },
      },
    });

const result = await getFeed();

expect(result.items).toHaveLength(1);
expect(result.items[0]!.id).toBe("feed-1");
  });

it("emits social:6.9 breadcrumbs (TKT-6.9.H1) carrying route 'social.getFeed'", async () => {
mockSocialControllerGetFeed.mockResolvedValue({
data: [],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 20,
hasNextPage: false,
        },
      },
    });

await getFeed();

expect(addBreadcrumbMock).toHaveBeenCalled();
const calls = addBreadcrumbMock.mock.calls.map((c) => c[0] as {
category: string;
data: Record<string, unknown>;
    });
const successCall = calls.find(
(c) =>
c.category === "social:6.9" && c.data.route === "social.getFeed",
    );
expect(successCall).toBeDefined();
expect(successCall?.data.total).toBe(0);
expect(successCall?.data.hasMore).toBe(0);
  });

it("emits a social:6.9 breadcrumb on error carrying the code and durationMs", async () => {
mockSocialControllerGetFeed.mockRejectedValue(
makeApiError(429, "GLOBAL_RATE_LIMITED", "Too many requests", {
retryAfterMs: 30_000,
      }),
    );

await expect(getFeed()).rejects.toBeDefined();

const calls = addBreadcrumbMock.mock.calls.map((c) => c[0] as {
category: string;
data: Record<string, unknown>;
    });
const errorCall = calls.find(
(c) =>
c.category === "social:6.9" &&
c.data.route === "social.getFeed" &&
c.data.code === "GLOBAL_RATE_LIMITED",
    );
expect(errorCall).toBeDefined();
expect(typeof errorCall?.data.durationMs).toBe("number");
  });

it("propagates a 403 USER_PROFILE_PRIVATE ApiError", async () => {
mockSocialControllerGetFeed.mockRejectedValue(
makeApiError(403, "USER_PROFILE_PRIVATE", "Private profile"),
    );

await expect(getFeed()).rejects.toMatchObject({
code: "USER_PROFILE_PRIVATE",
status: 403,
    });
  });

it("propagates a 403 SOCIAL_USER_BLOCKED ApiError", async () => {
mockSocialControllerGetFeed.mockRejectedValue(
makeApiError(403, "SOCIAL_USER_BLOCKED", "Blocked by viewer"),
    );

await expect(getFeed()).rejects.toMatchObject({
code: "SOCIAL_USER_BLOCKED",
status: 403,
    });
  });

it("propagates a 401 GLOBAL_UNAUTHENTICATED ApiError", async () => {
mockSocialControllerGetFeed.mockRejectedValue(
makeApiError(401, "GLOBAL_UNAUTHENTICATED", "Sign in required"),
    );

await expect(getFeed()).rejects.toMatchObject({
code: "GLOBAL_UNAUTHENTICATED",
status: 401,
    });
  });

it("propagates a 500 GLOBAL_INTERNAL_ERROR ApiError", async () => {
mockSocialControllerGetFeed.mockRejectedValue(
makeApiError(500, "GLOBAL_INTERNAL_ERROR", "Boom"),
    );

await expect(getFeed()).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
status: 500,
    });
  });

it("propagates a 429 GLOBAL_RATE_LIMITED ApiError", async () => {
mockSocialControllerGetFeed.mockRejectedValue(
makeApiError(429, "GLOBAL_RATE_LIMITED", "Too many requests", {
retryAfterMs: 30_000,
      }),
    );

await expect(getFeed()).rejects.toMatchObject({
code: "GLOBAL_RATE_LIMITED",
status: 429,
    });
  });

it("throws GLOBAL_INTERNAL_ERROR when the envelope itself is null", async () => {
mockSocialControllerGetFeed.mockResolvedValue(null);

await expect(getFeed()).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("returns an empty result when the envelope carries an undefined data array", async () => {
mockSocialControllerGetFeed.mockResolvedValue({
data: undefined,
meta: undefined,
    });

const result = await getFeed();
expect(result.items).toHaveLength(0);
expect(result.nextCursor).toBeNull();
expect(result.hasMore).toBe(false);
expect(result.visibility).toBe("visible");
  });
});
