/**
 * `useInstancePermissions.spec.tsx` — locks the permissions derivation hook.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G1.
 *
 * Tests cover:
 * - host + lobby → canStart
 * - host + running → canClose
 * - player → no host permissions (canStart=false, canClose=false)
 * - closed → no permissions
 * - null role → no permissions
 * - unauthenticated → no permissions
 * - host fallback from currentUserId match when server role not yet exposed
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useInstancePermissions } from "@/features/instances/hooks/useInstancePermissions";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetInstance = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
  getInstance: (...args: unknown[]) => mockGetInstance(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
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

const baseDetail = (overrides: Record<string, unknown>) => ({
  data: {
    instanceId: "inst-1",
    quizId: "quiz-1",
    status: "open",
    hostUserId: "host-1",
    maxPlayers: 12,
    currentPlayers: 3,
    currentUserRole: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  },
});

describe("useInstancePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => {
    cleanup();
  });

  describe("feature flag gating", () => {
    it("returns no permissions when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(
        () => useInstancePermissions("inst-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      expect(result.current.canJoin).toBe(false);
      expect(result.current.canLeave).toBe(false);
      expect(result.current.canStart).toBe(false);
      expect(result.current.canClose).toBe(false);
    });

    it("does not call getInstance when flag is placeholder", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      renderHook(
        () => useInstancePermissions("inst-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await new Promise((r) => setTimeout(r, 10));
      expect(mockGetInstance).not.toHaveBeenCalled();
    });
  });

  describe("host + lobby", () => {
    it("grants canStart to host when status is lobby", async () => {
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "open", hostUserId: "user-123", currentUserRole: "host" }),
      );

      const { result } = renderHook(
        () => useInstancePermissions("inst-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.canStart).toBe(true);
      });
    });
  });

  describe("host + running", () => {
    it("grants canClose to host when status is running", async () => {
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "running", hostUserId: "user-123", currentUserRole: "host" }),
      );

      const { result } = renderHook(
        () => useInstancePermissions("inst-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.canClose).toBe(true);
      });
    });
  });

  describe("player", () => {
    it("does not grant canStart to player", async () => {
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "open", hostUserId: "host-1", currentUserRole: "player" }),
      );

      const { result } = renderHook(
        () =>
          useInstancePermissions("inst-1", {
            currentUserId: "user-123",
            isInRoster: true,
          }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.canStart).toBe(false);
      });
      expect(result.current.canClose).toBe(false);
    });

    it("grants canLeave to player when in lobby", async () => {
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "open", hostUserId: "host-1", currentUserRole: "player" }),
      );

      const { result } = renderHook(
        () =>
          useInstancePermissions("inst-1", {
            currentUserId: "user-123",
            isInRoster: true,
          }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.canLeave).toBe(true);
      });
    });
  });

  describe("closed / finished", () => {
    it("returns no permissions for closed status", async () => {
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "closed", hostUserId: "user-123", currentUserRole: "host" }),
      );

      const { result } = renderHook(
        () => useInstancePermissions("inst-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.canStart).toBe(false);
      });
      expect(result.current.canJoin).toBe(false);
      expect(result.current.canLeave).toBe(false);
      expect(result.current.canClose).toBe(false);
    });

    it("returns no permissions for finished status", async () => {
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "finished", hostUserId: "user-123", currentUserRole: "host" }),
      );

      const { result } = renderHook(
        () => useInstancePermissions("inst-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.canStart).toBe(false);
      });
    });
  });

  describe("null role / unauthenticated", () => {
    it("returns no permissions when currentUserRole is null and id does not match host", async () => {
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "open", hostUserId: "host-1", currentUserRole: null }),
      );

      const { result } = renderHook(
        () => useInstancePermissions("inst-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.canStart).toBe(false);
      });
      expect(result.current.canClose).toBe(false);
    });

    it("returns no permissions when unauthenticated", async () => {
      unauthenticated();
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "open", hostUserId: "host-1", currentUserRole: null }),
      );

      const { result } = renderHook(() => useInstancePermissions("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.canJoin).toBe(false);
      });
      expect(result.current.canStart).toBe(false);
    });
  });

  describe("host fallback", () => {
    it("upgrades role to host when currentUserId matches hostUserId", async () => {
      mockGetInstance.mockResolvedValue(
        baseDetail({ status: "open", hostUserId: "user-123", currentUserRole: null }),
      );

      const { result } = renderHook(
        () => useInstancePermissions("inst-1", { currentUserId: "user-123" }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(result.current.canStart).toBe(true);
      });
    });
  });

  describe("null id", () => {
    it("returns no permissions when instanceId is null", () => {
      const { result } = renderHook(() => useInstancePermissions(null), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.canJoin).toBe(false);
      expect(result.current.canStart).toBe(false);
      expect(mockGetInstance).not.toHaveBeenCalled();
    });
  });
});