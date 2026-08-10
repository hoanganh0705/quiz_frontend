/**
 * `useRelationship.spec.tsx` — locks the relationship read hook
 * (TKT-6.1.D1).
 *
 * Tests cover:
 *   - `userId === currentUserId` → no service call; `relationship: 'self'`.
 *   - Unauthenticated → no service call; `relationship: 'none'`.
 *   - `social_relationship_live === 'placeholder'` → no service
 *     call; `relationship: 'none'`.
 *   - Successful call returns the normalized `Relationship` value.
 *   - `SOCIAL_USER_NOT_FOUND` (404) → `relationship: 'none'`;
 *     `error: null`.
 *   - `retry()` clears the error and revalidates.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useRelationship } from "@/features/social/hooks/useRelationship";
import { ApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetRelationshipStatus = vi.fn();
vi.mock("@/features/social/services", () => ({
  getRelationshipStatus: (...args: unknown[]) => mockGetRelationshipStatus(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

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

function authenticated(userId = "user-123") {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "authenticated",
    isAuthenticated: true,
    currentUser: { userId, id: userId },
  });
}

function unauthenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "unauthenticated",
    isAuthenticated: false,
    currentUser: null,
  });
}

function makeApiError(
  status: number,
  code: string,
  detail: string,
): ApiError {
  const axiosLike = {
    response: {
      status,
      statusText: code,
      data: {
        type: "about:blank",
        title: code,
        status,
        detail,
        extensions: { code },
      },
    },
    message: detail,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
  return new ApiError(axiosLike);
}

describe("useRelationship", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => {
    cleanup();
  });

  describe("feature flag gating", () => {
    it("returns relationship: 'none' when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");
      mockGetRelationshipStatus.mockResolvedValue({});

      const { result } = renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      expect(result.current.relationship).toBe("none");
      expect(mockGetRelationshipStatus).not.toHaveBeenCalled();
    });

    it("does not call getRelationshipStatus when flag is placeholder", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");
      mockGetRelationshipStatus.mockResolvedValue({});

      renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await new Promise((r) => setTimeout(r, 10));
      expect(mockGetRelationshipStatus).not.toHaveBeenCalled();
    });
  });

  describe("auth gating", () => {
    it("returns relationship: 'none' when unauthenticated", () => {
      unauthenticated();
      mockGetRelationshipStatus.mockResolvedValue({});

      const { result } = renderHook(
        () => useRelationship("target-1"),
        { wrapper: TestSwrProvider },
      );

      expect(result.current.relationship).toBe("none");
      expect(mockGetRelationshipStatus).not.toHaveBeenCalled();
    });
  });

  describe("self short-circuit", () => {
    it("returns relationship: 'self' when target equals viewer", () => {
      mockGetRelationshipStatus.mockResolvedValue({});

      const { result } = renderHook(
        () => useRelationship("user-123", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      expect(result.current.relationship).toBe("self");
      expect(mockGetRelationshipStatus).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("normalizes the boolean-tuple DTO into the canonical Relationship value", async () => {
      mockGetRelationshipStatus.mockResolvedValue({
        data: {
          isFriend: true,
          hasPendingRequest: false,
          isFollower: false,
          isFollowing: false,
          isBlocked: false,
          isBlockedBy: false,
        },
      });

      const { result } = renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(
        () => {
          expect(result.current.relationship).toBe("friend");
        },
        { timeout: 3000 },
      );
      expect(result.current.error).toBeNull();
    });

    it("returns 'blocked' when the viewer has blocked the target", async () => {
      mockGetRelationshipStatus.mockResolvedValue({
        data: {
          isFriend: false,
          hasPendingRequest: false,
          isFollower: false,
          isFollowing: false,
          isBlocked: true,
          isBlockedBy: false,
        },
      });

      const { result } = renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(
        () => {
          expect(result.current.relationship).toBe("blocked");
        },
        { timeout: 3000 },
      );
    });

    it("returns 'blocked_by' when the target has blocked the viewer", async () => {
      mockGetRelationshipStatus.mockResolvedValue({
        data: {
          isFriend: false,
          hasPendingRequest: false,
          isFollower: false,
          isFollowing: false,
          isBlocked: false,
          isBlockedBy: true,
        },
      });

      const { result } = renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(
        () => {
          expect(result.current.relationship).toBe("blocked_by");
        },
        { timeout: 3000 },
      );
    });
  });

  describe("error mapping", () => {
    it("maps 404 / USER_NOT_FOUND to relationship: 'none' with error: null", async () => {
      mockGetRelationshipStatus.mockRejectedValue(
        makeApiError(404, "USER_NOT_FOUND", "User not found"),
      );

      const { result } = renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(
        () => {
          expect(result.current.relationship).toBe("none");
          expect(result.current.error).toBeNull();
        },
        { timeout: 3000 },
      );
    });

    it("maps GLOBAL_NOT_FOUND to relationship: 'none' with error: null", async () => {
      mockGetRelationshipStatus.mockRejectedValue(
        makeApiError(404, "GLOBAL_NOT_FOUND", "Not found"),
      );

      const { result } = renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(
        () => {
          expect(result.current.relationship).toBe("none");
          expect(result.current.error).toBeNull();
        },
        { timeout: 3000 },
      );
    });

    it("surfaces typed SocialErrorCode on non-404 errors", async () => {
      mockGetRelationshipStatus.mockRejectedValue(
        makeApiError(500, "GLOBAL_INTERNAL_ERROR", "Server error"),
      );

      const { result } = renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
      expect(result.current.error?.code).toBe("GLOBAL_INTERNAL_ERROR");
    });

    it("exposes a retry() that revalidates and resets the error", async () => {
      const mockFn = mockGetRelationshipStatus as unknown as {
        mockRejectedValueOnce: (err: unknown) => typeof mockFn;
        mockImplementationOnce: (
          impl: () => Promise<unknown>,
        ) => typeof mockFn;
      };
      let resolveNext: ((value: unknown) => void) | null = null;
      mockFn
        .mockRejectedValueOnce(
          makeApiError(500, "GLOBAL_INTERNAL_ERROR", "Server error"),
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveNext = resolve;
            }),
        );

      const { result } = renderHook(
        () => useRelationship("target-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Kick off retry (don't await — we resolve manually).
      const retryPromise = result.current.retry();

      // Resolve the second call with a successful payload.
      await waitFor(() => {
        expect(mockGetRelationshipStatus).toHaveBeenCalledTimes(2);
      });
      const resolve = resolveNext as ((value: unknown) => void) | null;
      if (resolve) {
        resolve({
          data: {
            isFriend: true,
            hasPendingRequest: false,
            isFollower: false,
            isFollowing: false,
            isBlocked: false,
            isBlockedBy: false,
          },
        });
      }

      await retryPromise;
      await waitFor(
        () => {
          expect(result.current.relationship).toBe("friend");
        },
        { timeout: 3000 },
      );
      expect(result.current.error).toBeNull();
    });
  });
});