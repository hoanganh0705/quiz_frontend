/**
 * `useFollow.spec.tsx` — locks the `useFollow` mutation hook contract
 * (TKT-6.6.D1).
 *
 * Coverage:
 *   - Placeholder flag: `follow` is a no-op, `isPending` always false
 *   - `canFollow === false`: `follow()` is a no-op, no service call
 *   - `targetUserId === null`: `follow()` is a no-op
 *   - Double-click guard: `isPending === true` blocks a second dispatch
 *   - Server success: `followUser` called, SWR keys revalidated
 *   - Server error: error code set, optimistic state discarded
 *   - Optimistic path: service called with correct userId
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useFollow } from "@/features/social/hooks/useFollow";
import { ApiError } from "@/lib/api";

// ─── Mocks ───────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockFollowUser = vi.fn();
vi.mock("@/features/social/services", () => ({
  followUser: (...args: unknown[]) => mockFollowUser(...args),
}));

const mockUseSocialPermissions = vi.fn();
vi.mock("@/features/social/hooks/useSocialPermissions", () => ({
  useSocialPermissions: (...args: unknown[]) => mockUseSocialPermissions(...args),
}));

const mockMutate = vi.fn();
vi.mock("swr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("swr")>();
  return {
    ...actual,
    useSWRConfig: () => ({ mutate: mockMutate }),
  };
});

// ─── Test provider ──────────────────────────────────────────────────────

function TestSwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function makeApiError(
  status: number,
  code: string,
  detail: string,
): ApiError {
  return new ApiError({
    response: {
      status,
      statusText: code,
      headers: {},
      config: undefined as never,
      data: {
        status,
        detail,
        extensions: { code },
      },
    },
    message: detail,
  } as unknown as ConstructorParameters<typeof ApiError>[0]);
}

// ─── Setup ─────────────────────────────────────────────────────────────

describe("useFollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    mockFollowUser.mockResolvedValue(undefined);
    mockMutate.mockResolvedValue(undefined);
    // Default: viewer can follow
    mockUseSocialPermissions.mockReturnValue({
      canFollow: true,
      canUnfollow: false,
      canFriendRequest: false,
      canCancelRequest: false,
      canRespond: false,
      canUnfriend: false,
      canBlock: false,
      canUnblock: false,
      isSelf: false,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  // ── Placeholder flag ────────────────────────────────────────────────

  describe("placeholder flag", () => {
    it("follow is a no-op when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();
      expect(mockFollowUser).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });

    it("isPending is always false when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      expect(result.current.isPending).toBe(false);
    });
  });

  // ── Permissions guard ──────────────────────────────────────────────

  describe("permissions guard", () => {
    it("follow() is a no-op when canFollow is false", () => {
      mockUseSocialPermissions.mockReturnValue({
        canFollow: false,
        canUnfollow: false,
        canFriendRequest: false,
        canCancelRequest: false,
        canRespond: false,
        canUnfriend: false,
        canBlock: false,
        canUnblock: false,
        isSelf: false,
        isAuthenticated: true,
      });

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();
      expect(mockFollowUser).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });

    it("error is null when canFollow is false (no error surface)", () => {
      mockUseSocialPermissions.mockReturnValue({
        canFollow: false,
        canUnfollow: false,
        canFriendRequest: false,
        canCancelRequest: false,
        canRespond: false,
        canUnfriend: false,
        canBlock: false,
        canUnblock: false,
        isSelf: false,
        isAuthenticated: true,
      });

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      expect(result.current.error).toBe(null);
    });
  });

  // ── Null target ────────────────────────────────────────────────────

  describe("null target userId", () => {
    it("follow() is a no-op when targetUserId is null", () => {
      const { result } = renderHook(
        () => useFollow(null, { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();
      expect(mockFollowUser).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });
  });

  // ── Double-click guard ─────────────────────────────────────────────

  describe("double-click guard", () => {
    it("follow() does not dispatch when isPending is true", async () => {
      // The service call hangs indefinitely to simulate in-flight state.
      mockFollowUser.mockImplementation(
        () => new Promise(() => {}), // never resolves
      );

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Second click — should be a no-op.
      result.current.follow();
      // Follow should have been called only once.
      expect(mockFollowUser).toHaveBeenCalledTimes(1);
    });
  });

  // ── Server success ────────────────────────────────────────────────

  describe("server success", () => {
    it("calls followUser with the correct target userId", async () => {
      mockFollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalledWith("target-1");
      });
    });

    it("revalidates the relationship SWR key on success", async () => {
      mockFollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.arrayContaining(["social", "v1", "relationship", "target-1"]),
          undefined,
          { revalidate: true },
        );
      });
    });

    it("revalidates the social counts SWR key on success", async () => {
      mockFollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.arrayContaining(["social", "v1", "counts", "target-1"]),
          undefined,
          { revalidate: true },
        );
      });
    });

    it("sets error to null on success", async () => {
      mockFollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });
  });

  // ── Server error ──────────────────────────────────────────────────

  describe("server error", () => {
    it("sets error to the appropriate FollowErrorCode on SOCIAL_ALREADY_FOLLOWING", async () => {
      mockFollowUser.mockRejectedValue(
        makeApiError(409, "SOCIAL_ALREADY_FOLLOWING", "already following"),
      );

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(result.current.error).toBe("SOCIAL_ALREADY_FOLLOWING");
      });
    });

    it("sets error to the appropriate FollowErrorCode on SOCIAL_USER_BLOCKED", async () => {
      mockFollowUser.mockRejectedValue(
        makeApiError(403, "SOCIAL_USER_BLOCKED", "user blocked"),
      );

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(result.current.error).toBe("SOCIAL_USER_BLOCKED");
      });
    });

    it("sets error to the appropriate FollowErrorCode on UNAUTHORIZED", async () => {
      mockFollowUser.mockRejectedValue(
        makeApiError(401, "UNAUTHORIZED", "not signed in"),
      );

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(result.current.error).toBe("UNAUTHORIZED");
      });
    });

    it("rolls back isPending to false on error", async () => {
      mockFollowUser.mockRejectedValue(
        makeApiError(409, "SOCIAL_ALREADY_FOLLOWING", "already following"),
      );

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it("does NOT revalidate SWR keys on error (optimistic state discarded)", async () => {
      mockFollowUser.mockRejectedValue(
        makeApiError(409, "SOCIAL_ALREADY_FOLLOWING", "already following"),
      );

      const { result } = renderHook(
        () => useFollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.follow();

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      // No revalidation calls on error — the optimistic state was discarded.
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});
