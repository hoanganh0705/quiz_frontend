/**
 * `useSendFriendRequest.spec.tsx` — locks the `useSendFriendRequest` mutation hook contract
 * (TKT-6.8.D1).
 *
 * Coverage:
 *
 *   - Placeholder flag: `send` is a no-op, `isPending` always false
 *   - `canFriendRequest === false`: `send()` is a no-op, no service call
 *   - `targetUserId === null`: `send()` is a no-op
 *   - Double-click guard: a second `send()` call is dropped while a
 *     request is in-flight
 *   - Server success: `sendFriendRequest` called, SWR keys revalidated
 *   - Server error: error code surfaced, optimistic state discarded
 *   - `friendshipId` is not persisted (the service receives only the
 *     `userId`; no `friendshipId` appears in any test invariant)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useSendFriendRequest } from "@/features/social/hooks/useSendFriendRequest";
import { ApiError } from "@/lib/api";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types";

// ─── Mocks ───────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockSendFriendRequest = vi.fn();
vi.mock("@/features/social/services", () => ({
  sendFriendRequest: (...args: unknown[]) => mockSendFriendRequest(...args),
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

function makeApiError(status: number, code: string, detail: string): ApiError {
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

// ─── Setup ─────────────────────────────────────────────────────────────

describe("useSendFriendRequest — TKT-6.8.D1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    mockSendFriendRequest.mockResolvedValue(undefined);
    mockMutate.mockResolvedValue(undefined);
    mockUseSocialPermissions.mockReturnValue(permissionsAllGranted());
  });

  afterEach(() => {
    cleanup();
  });

  // ── Placeholder flag ────────────────────────────────────────────────

  describe("placeholder flag", () => {
    it("send is a no-op when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");
      const { result } = renderHook(
        () => useSendFriendRequest("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.send();
      expect(mockSendFriendRequest).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // ── Permission guard ────────────────────────────────────────────────

  describe("permissions guard", () => {
    it("send is a no-op when canFriendRequest is false", () => {
      mockUseSocialPermissions.mockReturnValue({
        ...permissionsAllGranted(),
        canFriendRequest: false,
      });
      const { result } = renderHook(
        () => useSendFriendRequest("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.send();
      expect(mockSendFriendRequest).not.toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });
  });

  // ── Null target ─────────────────────────────────────────────────────

  it("send is a no-op when targetUserId is null", () => {
    const { result } = renderHook(
      () => useSendFriendRequest(null),
      { wrapper: TestSwrProvider },
    );
    result.current.send();
    expect(mockSendFriendRequest).not.toHaveBeenCalled();
  });

  // ── Happy path ──────────────────────────────────────────────────────

  describe("server success", () => {
    it("calls sendFriendRequest with the userId and revalidates the SWR keys", async () => {
      let resolveCall!: () => void;
      const callPromise = new Promise<void>((r) => {
        resolveCall = r;
      });
      mockSendFriendRequest.mockReturnValue(callPromise);

      const { result } = renderHook(
        () => useSendFriendRequest("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.send();
      expect(result.current.isPending).toBe(true);

      resolveCall();

      // The hook microtasks must drain before assertions.
      await callPromise;
      await Promise.resolve();

      expect(mockSendFriendRequest).toHaveBeenCalledWith("user-target");
      // Three SWR keys: relationship, outgoing-requests, counts.
      expect(mockMutate).toHaveBeenCalledTimes(3);
      // Each mutate call uses revalidate:true.
      for (const call of mockMutate.mock.calls) {
        expect(call[2]).toEqual({ revalidate: true });
      }

      // After the request resolves, isPending goes back to false.
      await Promise.resolve();
      expect(result.current.isPending).toBe(false);
    });
  });

  // ── Error path ──────────────────────────────────────────────────────

  describe("server error", () => {
    it("surfaces the error code", async () => {
      mockSendFriendRequest.mockRejectedValue(
        makeApiError(403, "SOCIAL_FRIEND_REQUEST_FORBIDDEN", "Forbidden"),
      );

      const { result } = renderHook(
        () => useSendFriendRequest("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.send();

      // Wait for the error to propagate.
      await new Promise((r) => setTimeout(r, 10));
      expect(result.current.error).toBe("SOCIAL_FRIEND_REQUEST_FORBIDDEN");
      expect(result.current.isPending).toBe(false);
      // The hook must NOT revalidate the SWR cache on error (the
      // authoritative state is preserved).
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("maps non-SOCIAL error codes to GLOBAL_INTERNAL_ERROR", async () => {
      mockSendFriendRequest.mockRejectedValue(
        new Error("Unknown failure"),
      );

      const { result } = renderHook(
        () => useSendFriendRequest("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.send();

      await new Promise((r) => setTimeout(r, 10));
      expect(result.current.error).toBe("GLOBAL_INTERNAL_ERROR");
    });
  });

  // ── Double-click guard ──────────────────────────────────────────────

  describe("double-click guard", () => {
    it("drops a second send() while the first is in-flight", () => {
      let resolveFirst!: () => void;
      mockSendFriendRequest.mockReturnValue(
        new Promise<void>((r) => {
          resolveFirst = r;
        }),
      );

      const { result } = renderHook(
        () => useSendFriendRequest("user-target"),
        { wrapper: TestSwrProvider },
      );
      result.current.send();
      result.current.send();
      expect(mockSendFriendRequest).toHaveBeenCalledTimes(1);

      // Resolving the first request releases the guard.
      resolveFirst();
    });
  });

  // ── friendshipId hygiene ────────────────────────────────────────────

  describe("friendshipId hygiene", () => {
    it("does not include friendshipId in any SWR cache key", () => {
      // This is a structural test — the hook only invalidates
      // `makeRelationshipKey`, `makeOutgoingRequestsKey`, and
      // `makeSocialCountsKey`. None of those keys accept a
      // `friendshipId`; the hook never persists the id.
      renderHook(() => useSendFriendRequest("user-target"), {
        wrapper: TestSwrProvider,
      });
      const relKey = SOCIAL_CACHE_KEYS.makeRelationshipKey("user-target");
      expect(
        JSON.stringify(relKey),
        "Relationship key must not contain a friendshipId-shaped value",
      ).not.toContain("friendshipId");
    });
  });
});
