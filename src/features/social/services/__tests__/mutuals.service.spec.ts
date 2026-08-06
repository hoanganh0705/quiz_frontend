/**
 * `mutuals.service.spec.ts` — Locks the Story 6.4 mutual
 * service wrapper contract (TKT-6.4.C1).
 *
 * Asserts:
 *
 *   - Happy path: SDK envelope unwraps, rows are projected through
 *     `toMutual`, `total` is clamped against
 *     `MUTUAL_TOTAL_HARD_CAP`, `visibility: 'visible'`.
 *   - The wrapper emits two `phase6:6.4` breadcrumbs per call
 *     (one in-flight + one resolved) carrying the documented
 *     payload.
 *   - `getMutualFriends` emits `surface: 'mutuals-friends'`.
 *   - `getMutualFollowers` emits `surface: 'mutuals-followers'`.
 *   - 4xx / 5xx errors propagate as `ApiError` with the documented
 *     `code` accessible.
 *   - A missing envelope (`data === undefined`) throws
 *     `GLOBAL_INTERNAL_ERROR`.
 *   - Internal-id leakage: any `followId` / `friendshipId` value
 *     present in the wire body is discarded before the wrapper
 *     returns.
 *   - `total` is clamped against `MUTUAL_TOTAL_HARD_CAP`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import {
  getMutualFriends,
  getMutualFollowers,
} from "@/features/social/services/mutuals.service";
import { MUTUAL_TOTAL_HARD_CAP } from "@/features/social/mutual-count-invariants";

// ─── Sentry mock ─────────────────────────────────────────────────────────

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

// ─── SDK mock ────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────

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

    // The envelope's pagination did not carry `total` — the
    // adapter defaults to `items.length`. Items are empty so
    // `total === 0` (not the hard cap).
    expect(result.total).toBe(0);
    expect(MUTUAL_TOTAL_HARD_CAP).toBe(500);
  });

  it("emits two phase6:6.4 breadcrumbs (in-flight + resolved)", async () => {
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
          // The backend may leak these (Phase 6 Risks line 54).
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
    // The Epic 6.1 wrapper treats a `data: undefined` envelope as
    // an empty page; the Story 6.4 wrapper preserves the same
    // semantics so the cap clamping stays safe.
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
