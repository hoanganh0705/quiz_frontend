/**
 * `useRankingMilestones.spec.tsx` — locks the authenticated user's
 * ranking milestones hook from TKT-5.5.B3.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G1.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` fallback.
 * - Unauthenticated fallback.
 * - Service forwarding.
 * - Empty milestones array handling.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useRankingMilestones } from "@/features/rankings/hooks/useRankingMilestones";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetMyRankingMilestones = vi.fn();
vi.mock(
  "@/features/rankings/services/rankings.service",
  () => ({
    getMyRankingMilestones: (...args: unknown[]) =>
      mockGetMyRankingMilestones(...args),
  }),
);

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

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

describe("useRankingMilestones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns safe fallback when flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    const { result } = renderHook(() => useRankingMilestones());

    expect(result.current.milestones).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns safe fallback when unauthenticated", () => {
    unauthenticated();

    const { result } = renderHook(() => useRankingMilestones());

    expect(result.current.milestones).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("does not call service when flag is placeholder or unauthenticated", async () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    unauthenticated();

    renderHook(() => useRankingMilestones());

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockGetMyRankingMilestones).not.toHaveBeenCalled();
  });

  it("projects milestones from wire response", async () => {
    mockGetMyRankingMilestones.mockResolvedValueOnce([
      { milestone: "TOP_100", achievedAt: "2025-01-15", achievedAtIso: "2025-01-15T00:00:00Z" },
      { milestone: "TOP_10", achievedAt: "2025-02-01", achievedAtIso: "2025-02-01T00:00:00Z" },
    ]);

    const { result } = renderHook(() => useRankingMilestones());

    await waitFor(() => {
      expect(result.current.milestones.length).toBe(2);
    });

    expect(result.current.milestones[0]?.milestone).toBe("TOP_100");
    expect(result.current.milestones[1]?.milestone).toBe("TOP_10");
  });

  it("handles empty milestones array from server", async () => {
    mockGetMyRankingMilestones.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useRankingMilestones());

    await waitFor(() => {
      expect(result.current.milestones).toBeDefined();
    });

    expect(result.current.milestones).toEqual([]);
  });
});
