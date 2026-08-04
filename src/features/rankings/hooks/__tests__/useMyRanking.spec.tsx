/**
 * `useMyRanking.spec.tsx` — locks the authenticated user's personal
 * ranking summary hook from TKT-5.5.B1.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G1.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` fallback (no service call).
 * - Unauthenticated fallback (no service call).
 * - Service forwarding returns a projected `RankingSummary`.
 * - Auth-gated read — only fetches when authenticated AND flag is `'live'`.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useMyRanking } from "@/features/rankings/hooks/useMyRanking";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetMyRanking = vi.fn();
vi.mock(
  "@/features/rankings/services/rankings.service",
  () => ({
    getMyRanking: (...args: unknown[]) => mockGetMyRanking(...args),
  }),
);

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

function authenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "authenticated",
    currentUser: { userId: "user-123", id: "user-123" },
  });
}

function unauthenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "unauthenticated",
    currentUser: null,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("useMyRanking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("feature flag gating", () => {
    it("returns safe fallback when flag is placeholder", () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(() => useMyRanking());

      expect(result.current.summary).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isStale).toBe(false);
      expect(result.current.lastValidatedAt).toBeNull();
    });

    it("does not call getMyRanking when flag is placeholder", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      renderHook(() => useMyRanking());

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGetMyRanking).not.toHaveBeenCalled();
    });
  });

  describe("auth gating", () => {
    it("returns safe fallback when unauthenticated", () => {
      unauthenticated();

      const { result } = renderHook(() => useMyRanking());

      expect(result.current.summary).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("does not call getMyRanking when unauthenticated", async () => {
      unauthenticated();

      renderHook(() => useMyRanking());

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGetMyRanking).not.toHaveBeenCalled();
    });
  });

  describe("service forwarding", () => {
    it("projects a wire response to RankingSummary", async () => {
      mockGetMyRanking.mockResolvedValueOnce({
        global: {
          allTime: { rank: 42, xp: 1234 },
          weekly: null,
          monthly: null,
        },
      });

      const { result } = renderHook(() => useMyRanking());

      await waitFor(() => {
        expect(result.current.summary).not.toBeNull();
      });

      expect(result.current.summary).toMatchObject({
        globalRank: 42,
        totalScore: 1234,
      });
      expect(mockGetMyRanking).toHaveBeenCalledTimes(1);
    });

    it("exposes lastValidatedAt after a successful response", async () => {
      mockGetMyRanking.mockResolvedValueOnce({
        global: { allTime: { rank: 7, xp: 1000 } },
      });

      const { result } = renderHook(() => useMyRanking());

      await waitFor(() => {
        expect(result.current.lastValidatedAt).not.toBeNull();
      });

      expect(typeof result.current.lastValidatedAt).toBe("string");
    });
  });
});
