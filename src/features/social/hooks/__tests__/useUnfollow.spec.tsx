/**
 * `useUnfollow.spec.tsx` — locks the `useUnfollow` mutation hook contract
 * (TKT-6.6.D2).
 *
 * Coverage:
 *   - Placeholder flag: `unfollow` is a no-op, `isPending` always false
 *   - `canUnfollow === false`: `unfollow()` is a no-op, no service call
 *   - `targetUserId === null`: `unfollow()` is a no-op
 *   - Double-click guard: `isPending === true` blocks a second dispatch
 *   - Server success (204 No Content): `unfollowUser` called, SWR keys revalidated
 *   - Server error on SOCIAL_FOLLOW_NOT_FOUND (404): `alreadyNotFollowing === true`,
 *     `error === null`, SWR keys revalidated (successful terminal state)
 *   - Other server errors: error code set, optimistic state discarded
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useUnfollow } from "@/features/social/hooks/useUnfollow";
import { ApiError } from "@/lib/api";

// ─── Mocks ─────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUnfollowUser = vi.fn();
vi.mock("@/features/social/services", () => ({
  unfollowUser: (...args: unknown[]) => mockUnfollowUser(...args),
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

const defaultPermissions = {
  canFollow: false,
  canUnfollow: true,
  canFriendRequest: false,
  canCancelRequest: false,
  canRespond: false,
  canUnfriend: false,
  canBlock: false,
  canUnblock: false,
  isSelf: false,
  isAuthenticated: true,
};

describe("useUnfollow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    mockUnfollowUser.mockResolvedValue(undefined);
    mockMutate.mockResolvedValue(undefined);
    mockUseSocialPermissions.mockReturnValue(defaultPermissions);
  });

  afterEach(() => {
    cleanup();
  });

  // ── Placeholder flag ────────────────────────────────────────────────

  describe("placeholder flag", () => {
    it("unfollow is a no-op when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();
      expect(mockUnfollowUser).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });

    it("alreadyNotFollowing is always false when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      expect(result.current.alreadyNotFollowing).toBe(false);
    });
  });

  // ── Permissions guard ──────────────────────────────────────────────

  describe("permissions guard", () => {
    it("unfollow() is a no-op when canUnfollow is false", () => {
      mockUseSocialPermissions.mockReturnValue({
        ...defaultPermissions,
        canUnfollow: false,
      });

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();
      expect(mockUnfollowUser).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });

    it("error and alreadyNotFollowing are both null/false when canUnfollow is false", () => {
      mockUseSocialPermissions.mockReturnValue({
        ...defaultPermissions,
        canUnfollow: false,
      });

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      expect(result.current.error).toBe(null);
      expect(result.current.alreadyNotFollowing).toBe(false);
    });
  });

  // ── Null target ───────────────────────────────────────────────────

  describe("null target userId", () => {
    it("unfollow() is a no-op when targetUserId is null", () => {
      const { result } = renderHook(
        () => useUnfollow(null, { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();
      expect(mockUnfollowUser).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
    });
  });

  // ── Double-click guard ─────────────────────────────────────────────

  describe("double-click guard", () => {
    it("unfollow() does not dispatch when isPending is true", async () => {
      mockUnfollowUser.mockImplementation(
        () => new Promise(() => {}), // never resolves
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Second click — should be a no-op.
      result.current.unfollow();
      expect(mockUnfollowUser).toHaveBeenCalledTimes(1);
    });
  });

  // ── Server success ────────────────────────────────────────────────

  describe("server success", () => {
    it("calls unfollowUser with the correct target userId", async () => {
      mockUnfollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(mockUnfollowUser).toHaveBeenCalledWith("target-1");
      });
    });

    it("revalidates the relationship SWR key on success", async () => {
      mockUnfollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.arrayContaining(["social", "v1", "relationship", "target-1"]),
          undefined,
          { revalidate: true },
        );
      });
    });

    it("revalidates the social counts SWR key on success", async () => {
      mockUnfollowUser.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.arrayContaining(["social", "v1", "counts", "target-1"]),
          undefined,
          { revalidate: true },
        );
      });
    });
  });

  // ── SOCIAL_FOLLOW_NOT_FOUND: successful terminal state ─────────────

  describe("SOCIAL_FOLLOW_NOT_FOUND — successful terminal state", () => {
    it("alreadyNotFollowing is set to true on SOCIAL_FOLLOW_NOT_FOUND", async () => {
      mockUnfollowUser.mockRejectedValue(
        makeApiError(404, "SOCIAL_FOLLOW_NOT_FOUND", "not currently following"),
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(result.current.alreadyNotFollowing).toBe(true);
      });
    });

    it("error is null on SOCIAL_FOLLOW_NOT_FOUND (no error banner)", async () => {
      mockUnfollowUser.mockRejectedValue(
        makeApiError(404, "SOCIAL_FOLLOW_NOT_FOUND", "not currently following"),
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });

    it("revalidates SWR keys on SOCIAL_FOLLOW_NOT_FOUND (successful terminal state)", async () => {
      mockUnfollowUser.mockRejectedValue(
        makeApiError(404, "SOCIAL_FOLLOW_NOT_FOUND", "not currently following"),
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        // Relationship key revalidated.
        expect(mockMutate).toHaveBeenCalledWith(
          expect.arrayContaining(["social", "v1", "relationship", "target-1"]),
          undefined,
          { revalidate: true },
        );
        // Counts key revalidated.
        expect(mockMutate).toHaveBeenCalledWith(
          expect.arrayContaining(["social", "v1", "counts", "target-1"]),
          undefined,
          { revalidate: true },
        );
      });
    });

    it("rolls back isPending to false on SOCIAL_FOLLOW_NOT_FOUND", async () => {
      mockUnfollowUser.mockRejectedValue(
        makeApiError(404, "SOCIAL_FOLLOW_NOT_FOUND", "not currently following"),
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });

  // ── Other errors ───────────────────────────────────────────────────

  describe("other server errors", () => {
    it("sets error to UNAUTHORIZED on 401", async () => {
      mockUnfollowUser.mockRejectedValue(
        makeApiError(401, "UNAUTHORIZED", "not signed in"),
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(result.current.error).toBe("UNAUTHORIZED");
      });
    });

    it("alreadyNotFollowing stays false on other errors", async () => {
      mockUnfollowUser.mockRejectedValue(
        makeApiError(401, "UNAUTHORIZED", "not signed in"),
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(result.current.alreadyNotFollowing).toBe(false);
      });
    });

    it("rolls back isPending to false on other errors", async () => {
      mockUnfollowUser.mockRejectedValue(
        makeApiError(401, "UNAUTHORIZED", "not signed in"),
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it("does NOT revalidate SWR keys on other errors (optimistic state discarded)", async () => {
      mockUnfollowUser.mockRejectedValue(
        makeApiError(401, "UNAUTHORIZED", "not signed in"),
      );

      const { result } = renderHook(
        () => useUnfollow("target-1", { currentUserId: "viewer-1" }),
        { wrapper: TestSwrProvider },
      );

      result.current.unfollow();

      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      // No revalidation calls on error — the optimistic state was discarded.
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});
