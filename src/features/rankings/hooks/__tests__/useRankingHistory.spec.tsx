/**
 * `useRankingHistory.spec.tsx` — locks the authenticated user's
 * ranking history hook from TKT-5.5.B3.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G1.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` fallback (empty items, no service call).
 * - Unauthenticated fallback (no service call).
 * - Service forwarding with bare-array wire response projects to
 *   `RankingHistoryEntry[]` with the `id` alias.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useRankingHistory } from "@/features/rankings/hooks/useRankingHistory";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetMyRankingHistory = vi.fn();
vi.mock(
  "@/features/rankings/services/rankings.service",
  () => ({
    getMyRankingHistory: (...args: unknown[]) =>
      mockGetMyRankingHistory(...args),
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

describe("useRankingHistory", () => {
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

    const { result } = renderHook(() => useRankingHistory());

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("does not call service when flag is placeholder", async () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    renderHook(() => useRankingHistory());

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockGetMyRankingHistory).not.toHaveBeenCalled();
  });

  it("returns safe fallback when unauthenticated", () => {
    unauthenticated();

    const { result } = renderHook(() => useRankingHistory());

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("does not call service when unauthenticated", async () => {
    unauthenticated();

    renderHook(() => useRankingHistory());

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockGetMyRankingHistory).not.toHaveBeenCalled();
  });

  it("projects bare-array wire response with id alias from date", async () => {
    mockGetMyRankingHistory.mockResolvedValueOnce([
      { date: "2025-01-01", rank: 100 },
      { date: "2025-01-02", rank: 80 },
    ]);

    const { result } = renderHook(() => useRankingHistory());

    await waitFor(() => {
      expect(result.current.items.length).toBe(2);
    });

    expect(result.current.items[0]?.id).toBe("2025-01-01");
    expect(result.current.items[1]?.id).toBe("2025-01-02");
    expect(result.current.items[0]?.rank).toBe(100);
  });

  it("handles null wire response gracefully", async () => {
    mockGetMyRankingHistory.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useRankingHistory());

    await waitFor(() => {
      expect(result.current.items).toBeDefined();
    });

    expect(result.current.items).toEqual([]);
  });
});
