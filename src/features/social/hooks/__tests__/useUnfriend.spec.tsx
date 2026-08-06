/**
 * `useUnfriend.spec.tsx` — locks the `useUnfriend` mutation hook contract
 * (TKT-6.8.D4).
 *
 * Coverage:
 *
 *   - Placeholder flag: `unfriend` is a no-op
 *   - `canUnfriend === false`: `unfriend()` is a no-op
 *   - `targetUserId === null`: `unfriend()` is a no-op
 *   - Double-click guard
 *   - Server success: `unfriend` called, SWR keys revalidated
 *   - Non-idempotent DELETE terminal state: 404 with
 *     `SOCIAL_FRIENDSHIP_NOT_FOUND` → `alreadyNotFriends: true`,
 *     `error: null`, cache revalidated
 *   - Server error: error code surfaced, cache NOT revalidated
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useUnfriend } from "@/features/social/hooks/useUnfriend";
import { ApiError } from "@/lib/api";

// ─── Mocks ───────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUnfriend = vi.fn();
vi.mock("@/features/social/services", () => ({
  unfriend: (...args: unknown[]) => mockUnfriend(...args),
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

function makeApiError(status: number, code: string, detail: string): ApiError {
  return new ApiError({
    response: {
      status,
      statusText: code,
      headers: {},
      config: undefined as never,
      data: { status, detail, extensions: { code } },
    },
    message: detail,
  } as unknown as ConstructorParameters<typeof ApiError>[0]);
}

function permissionsAllGranted(): ReturnType<typeof mockUseSocialPermissions> {
  return {
    canFollow: true,
    canUnfollow: true,
    canFriendRequest: true,
    canCancelRequest: true,
    canRespond: true,
    canUnfriend: true,
    canBlock: true,
    canUnblock: true,
    isSelf: false,
    isAuthenticated: true,
  };
}

describe("useUnfriend — TKT-6.8.D4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    mockUnfriend.mockResolvedValue(undefined);
    mockMutate.mockResolvedValue(undefined);
    mockUseSocialPermissions.mockReturnValue(permissionsAllGranted());
  });

  afterEach(() => {
    cleanup();
  });

  describe("placeholder flag", () => {
    it("unfriend is a no-op when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");
      const { result } = renderHook(
        () => useUnfriend("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.unfriend();
      expect(mockUnfriend).not.toHaveBeenCalled();
    });
  });

  describe("permissions guard", () => {
    it("unfriend is a no-op when canUnfriend is false", () => {
      mockUseSocialPermissions.mockReturnValue({
        ...permissionsAllGranted(),
        canUnfriend: false,
      });
      const { result } = renderHook(
        () => useUnfriend("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.unfriend();
      expect(mockUnfriend).not.toHaveBeenCalled();
    });
  });

  it("unfriend is a no-op when targetUserId is null", () => {
    const { result } = renderHook(
      () => useUnfriend(null),
      { wrapper: TestSwrProvider },
    );
    result.current.unfriend();
    expect(mockUnfriend).not.toHaveBeenCalled();
  });

  describe("server success", () => {
    it("calls unfriend with the userId and revalidates the cache", async () => {
      mockUnfriend.mockResolvedValue(undefined);
      const { result } = renderHook(
        () => useUnfriend("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.unfriend();

      await new Promise((r) => setTimeout(r, 5));
      expect(mockUnfriend).toHaveBeenCalledWith("user-target");
      // Two SWR keys: relationship and counts (no outgoing-requests
      // key — the unfriend action does not touch outgoing requests).
      expect(mockMutate).toHaveBeenCalledTimes(2);
    });
  });

  describe("non-idempotent DELETE terminal state", () => {
    it("treats SOCIAL_FRIENDSHIP_NOT_FOUND as alreadyNotFriends and revalidates the cache", async () => {
      mockUnfriend.mockRejectedValue(
        makeApiError(
          404,
          "SOCIAL_FRIENDSHIP_NOT_FOUND",
          "Not friends",
        ),
      );

      const { result } = renderHook(
        () => useUnfriend("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.unfriend();

      await new Promise((r) => setTimeout(r, 10));
      expect(result.current.alreadyNotFriends).toBe(true);
      expect(result.current.error).toBeNull();
      // Cache IS revalidated even on the terminal state, so the UI
      // converges on the new (non-friends) state.
      expect(mockMutate).toHaveBeenCalledTimes(2);
    });
  });

  describe("server error", () => {
    it("surfaces a forbidden error code", async () => {
      mockUnfriend.mockRejectedValue(
        makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN", "Forbidden"),
      );
      const { result } = renderHook(
        () => useUnfriend("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.unfriend();

      await new Promise((r) => setTimeout(r, 10));
      expect(result.current.alreadyNotFriends).toBe(false);
      expect(result.current.error).toBe("SOCIAL_FRIEND_LIST_FORBIDDEN");
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe("double-click guard", () => {
    it("drops a second unfriend() while the first is in-flight", () => {
      let resolveFirst!: () => void;
      mockUnfriend.mockReturnValue(
        new Promise<void>((r) => {
          resolveFirst = r;
        }),
      );

      const { result } = renderHook(
        () => useUnfriend("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.unfriend();
      result.current.unfriend();
      expect(mockUnfriend).toHaveBeenCalledTimes(1);

      resolveFirst();
    });
  });
});
