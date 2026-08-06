/**
 * `follow-mutation.service.spec.ts` — Locks the follow-mutation service contract
 * (TKT-6.6.C1).
 *
 * Coverage:
 *   - followUser happy path (204 No Content resolves void)
 *   - followUser → SOCIAL_ALREADY_FOLLOWING
 *   - followUser → SOCIAL_SELF_FOLLOW
 *   - followUser → SOCIAL_USER_BLOCKED
 *   - followUser → UNAUTHORIZED
 *   - unfollowUser happy path (204 No Content resolves void)
 *   - unfollowUser → SOCIAL_FOLLOW_NOT_FOUND (non-idempotent DELETE terminal state)
 *   - unfollowUser → UNAUTHORIZED
 *   - refreshSocialStats happy path (envelope unwraps, projection returned)
 *   - refreshSocialStats → missing envelope → GLOBAL_INTERNAL_ERROR
 *   - Internal-id leakage: followId / friendshipId never appear in return values
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

import {
  followUser,
  refreshSocialStats,
  unfollowUser,
} from "@/features/social/services/follow-mutation.service";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockFollowUser = vi.fn();
const mockUnfollowUser = vi.fn();
const mockGetUserSocialStats = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getSocial: () => ({
      socialControllerFollowUser: (...args: unknown[]) => mockFollowUser(...args),
      socialControllerUnfollowUser: (...args: unknown[]) => mockUnfollowUser(...args),
      socialControllerGetUserSocialStats: (...args: unknown[]) =>
        mockGetUserSocialStats(...args),
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeApiError(
  status: number,
  code: string,
  message: string,
): ApiError {
  // ApiError.status reads data?.status first (body.status), then responseStatus (top-level status).
  // ApiError.code reads data.extensions?.code first, then synthesizes from status.
  // Include status in BOTH places so the constructor can construct the object correctly.
  return new ApiError({
    name: "AxiosError",
    message,
    isAxiosError: true,
    response: {
      status,
      statusText: "X",
      headers: {},
      config: undefined as never,
      data: {
        type: "https://api.quiz.local/problems/x",
        title: "X",
        status, // required: ApiError.status reads data?.status first
        detail: message,
        instance: "/api/v1/x",
        extensions: { code, requestId: "req-test" },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

// ─── followUser ───────────────────────────────────────────────────────────────

describe("follow-mutation.service — followUser", () => {
  it("resolves void on 204 No Content", async () => {
    mockFollowUser.mockResolvedValue(undefined);

    const result = await followUser("user-2");

    expect(mockFollowUser).toHaveBeenCalledTimes(1);
    expect(mockFollowUser).toHaveBeenCalledWith("user-2");
    expect(result).toBeUndefined();
  });

  it("throws ApiError on SOCIAL_ALREADY_FOLLOWING", async () => {
    mockFollowUser.mockRejectedValue(
      makeApiError(409, "SOCIAL_ALREADY_FOLLOWING", "already following"),
    );

    await expect(followUser("user-2")).rejects.toMatchObject({
      code: "SOCIAL_ALREADY_FOLLOWING",
      status: 409,
    });
  });

  it("throws ApiError on SOCIAL_SELF_FOLLOW", async () => {
    mockFollowUser.mockRejectedValue(
      makeApiError(403, "SOCIAL_SELF_FOLLOW", "cannot follow yourself"),
    );

    await expect(followUser("user-self")).rejects.toMatchObject({
      code: "SOCIAL_SELF_FOLLOW",
      status: 403,
    });
  });

  it("throws ApiError on SOCIAL_USER_BLOCKED", async () => {
    mockFollowUser.mockRejectedValue(
      makeApiError(403, "SOCIAL_USER_BLOCKED", "user blocked"),
    );

    await expect(followUser("user-2")).rejects.toMatchObject({
      code: "SOCIAL_USER_BLOCKED",
      status: 403,
    });
  });

  it("throws ApiError on UNAUTHORIZED", async () => {
    mockFollowUser.mockRejectedValue(
      makeApiError(401, "UNAUTHORIZED", "not signed in"),
    );

    await expect(followUser("user-2")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });
});

// ─── unfollowUser ────────────────────────────────────────────────────────────

describe("follow-mutation.service — unfollowUser", () => {
  it("resolves void on 204 No Content", async () => {
    mockUnfollowUser.mockResolvedValue(undefined);

    const result = await unfollowUser("user-2");

    expect(mockUnfollowUser).toHaveBeenCalledTimes(1);
    expect(mockUnfollowUser).toHaveBeenCalledWith("user-2");
    expect(result).toBeUndefined();
  });

  it("throws ApiError on SOCIAL_FOLLOW_NOT_FOUND (terminal state)", async () => {
    mockUnfollowUser.mockRejectedValue(
      makeApiError(404, "SOCIAL_FOLLOW_NOT_FOUND", "not currently following"),
    );

    await expect(unfollowUser("user-2")).rejects.toMatchObject({
      code: "SOCIAL_FOLLOW_NOT_FOUND",
      status: 404,
    });
  });

  it("throws ApiError on UNAUTHORIZED", async () => {
    mockUnfollowUser.mockRejectedValue(
      makeApiError(401, "UNAUTHORIZED", "not signed in"),
    );

    await expect(unfollowUser("user-2")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });
});

// ─── refreshSocialStats ──────────────────────────────────────────────────────

describe("follow-mutation.service — refreshSocialStats", () => {
  it("unwraps the envelope and returns a frozen SocialUserStatsDto", async () => {
    mockGetUserSocialStats.mockResolvedValue({
      data: { friends: 12, followers: 34, following: 56 },
    });

    const result = await refreshSocialStats("user-2");

    expect(mockGetUserSocialStats).toHaveBeenCalledTimes(1);
    expect(mockGetUserSocialStats).toHaveBeenCalledWith("user-2");
    expect(result).toEqual({
      friends: 12,
      followers: 34,
      following: 56,
    });
    // Frozen so callers cannot mutate the cache.
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("throws GLOBAL_INTERNAL_ERROR on missing envelope", async () => {
    // Mock resolves to { data: undefined } — the defensive `?.` access on
    // the envelope allows this shape through to the null/undefined check.
    mockGetUserSocialStats.mockResolvedValue({ data: undefined });

    await expect(refreshSocialStats("user-2")).rejects.toMatchObject({
      code: "GLOBAL_INTERNAL_ERROR",
    });
  });
});
