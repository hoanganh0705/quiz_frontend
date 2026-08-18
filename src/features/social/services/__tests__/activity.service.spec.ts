

import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { getUserActivity } from "@/features/social/services/activity.service";

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

const mockSocialControllerGetUserActivity = vi.fn();
vi.mock("@/lib/api", async () => {
const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
return {
...actual,
getSocial: () => ({
socialControllerGetUserActivity: (
...args: unknown[]
      ) => mockSocialControllerGetUserActivity(...args),
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
mockSocialControllerGetUserActivity.mockReset();
addBreadcrumbMock.mockClear();
});

describe("activity.service — getUserActivity", () => {
it("forwards targetUserId and unwraps the envelope", async () => {
mockSocialControllerGetUserActivity.mockResolvedValue({
data: [
{
id: "activity-1",
type: "badge_earned",
occurredAt: "2026-08-01T12:00:00.000Z",
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
nextCursor: "cursor-1",
limit: 25,
        },
      },
    });

const result = await getUserActivity("user-1");

expect(mockSocialControllerGetUserActivity).toHaveBeenCalledTimes(1);
expect(mockSocialControllerGetUserActivity).toHaveBeenCalledWith(
"user-1",
undefined,
    );
expect(result.items).toHaveLength(1);
expect(result.items[0]!.type).toBe("badge_earned");
expect(result.total).toBe(1);
expect(result.visibility).toBe("visible");
  });

it("forwards pagination params to the SDK call", async () => {
mockSocialControllerGetUserActivity.mockResolvedValue({
data: [],
meta: {
pagination: {
kind: "cursor",
nextCursor: null,
limit: 25,
        },
      },
    });

await getUserActivity("user-1", { cursor: "abc", limit: 25 });

expect(mockSocialControllerGetUserActivity).toHaveBeenCalledWith("user-1", {
cursor: "abc",
limit: 25,
    });
  });

it("drops items with unknown type discriminators", async () => {
mockSocialControllerGetUserActivity.mockResolvedValue({
data: [
{
id: "activity-1",
type: "badge_earned",
occurredAt: "2026-08-01T12:00:00.000Z",
payload: { type: "badge_earned", badgeId: "b1" },
        },
{
id: "activity-2",

type: "unknown_type",
occurredAt: "2026-08-02T12:00:00.000Z",
payload: { type: "unknown_type" },
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

const result = await getUserActivity("user-1");

expect(result.items).toHaveLength(1);
expect(result.items[0]!.id).toBe("activity-1");
  });

it("emits two social:6.4 breadcrumbs (in-flight + resolved)", async () => {
mockSocialControllerGetUserActivity.mockResolvedValue({
data: [
{
id: "activity-1",
type: "badge_earned",
occurredAt: "2026-08-01T12:00:00.000Z",
payload: { type: "badge_earned", badgeId: "b1" },
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

await getUserActivity("user-1");

expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
const calls = addBreadcrumbMock.mock.calls.map(
(c) => (c[0] as { data: Record<string, unknown> }).data,
    );
expect(calls[0]!.route).toBe("social.getUserActivity");
expect(calls[0]!.targetUserId).toBe("user-1");
expect(calls[0]!.surface).toBe("user-activity");
expect(calls[1]!.total).toBe(1);
  });

it("propagates a 403 SOCIAL_FRIEND_LIST_FORBIDDEN ApiError", async () => {
mockSocialControllerGetUserActivity.mockRejectedValue(
makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN", "Not allowed"),
    );

await expect(getUserActivity("user-1")).rejects.toMatchObject({
code: "SOCIAL_FRIEND_LIST_FORBIDDEN",
status: 403,
    });
  });

it("propagates a 404 SOCIAL_USER_NOT_FOUND ApiError", async () => {
mockSocialControllerGetUserActivity.mockRejectedValue(
makeApiError(404, "SOCIAL_USER_NOT_FOUND", "Missing user"),
    );

await expect(getUserActivity("user-missing")).rejects.toMatchObject({
code: "SOCIAL_USER_NOT_FOUND",
status: 404,
    });
  });

it("decodes rate-limit cooldown from extensions.retryAfterMs on ACTIVITY_RATE_LIMITED", async () => {
mockSocialControllerGetUserActivity.mockRejectedValue(
makeApiError(429, "ACTIVITY_RATE_LIMITED", "Too many requests", {
retryAfterMs: 30_000,
      }),
    );

await expect(getUserActivity("user-1")).rejects.toMatchObject({
code: "ACTIVITY_RATE_LIMITED",
status: 429,
    });

expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
const breadcrumbData = (addBreadcrumbMock.mock.calls[1]![0] as {
data: Record<string, unknown>;
    }).data;
expect(breadcrumbData.rateLimited).toBe(1);
expect(breadcrumbData.cooldownSeconds).toBe(30);
expect(breadcrumbData.code).toBe("ACTIVITY_RATE_LIMITED");
  });

it("throws GLOBAL_INTERNAL_ERROR when the envelope itself is null", async () => {
mockSocialControllerGetUserActivity.mockResolvedValue(null);

await expect(getUserActivity("user-1")).rejects.toMatchObject({
code: "GLOBAL_INTERNAL_ERROR",
    });
  });

it("returns an empty result when the envelope carries an undefined data array", async () => {
mockSocialControllerGetUserActivity.mockResolvedValue({
data: undefined,
meta: undefined,
    });

const result = await getUserActivity("user-1");
expect(result.items).toHaveLength(0);
expect(result.total).toBe(0);
expect(result.visibility).toBe("visible");
  });
});
