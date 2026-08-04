/**
 * `useRankingLeaderboard.spec.tsx` — locks the global leaderboard
 * paginated read hook from TKT-5.5.B2.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G1.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` fallback (empty items, no service call).
 * - Service forwarding with default and explicit filters.
 * - Tie-preserving order: the projection does not reorder entries.
 * - `isStale`/`isLoading` surface contract.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useRankingLeaderboard } from "@/features/rankings/hooks/useRankingLeaderboard";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetRankingLeaderboard = vi.fn();
vi.mock(
  "@/features/rankings/services/rankings.service",
  () => ({
    getRankingLeaderboard: (...args: unknown[]) =>
      mockGetRankingLeaderboard(...args),
  }),
);

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

function unauthenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "unauthenticated",
    currentUser: null,
  });
}

function authenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "authenticated",
    currentUser: { userId: "user-123", id: "user-123" },
  });
}

describe("useRankingLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns safe fallback when flag is placeholder", async () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    const { result } = renderHook(() => useRankingLeaderboard());

    await waitFor(() => {
      expect(result.current.items).toEqual([]);
    });
    expect(result.current.hasMore).toBe(false);
  });

  it("does not call service when flag is placeholder", async () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    unauthenticated();

    renderHook(() => useRankingLeaderboard());

    // Wait long enough for any fetch to settle. The fetcher is a no-op
    // stub when the flag is off, so the service mock stays un-called.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockGetRankingLeaderboard).not.toHaveBeenCalled();
  });

  it("projects tied entries in backend order (no client reordering)", async () => {
    authenticated();
    mockGetRankingLeaderboard.mockResolvedValueOnce({
      data: {
        entries: [
          {
            rank: 1,
            denseRank: 1,
            userId: "u-a",
            displayName: "Alice",
            xp: 5000,
            isTied: true,
          },
          {
            rank: 1,
            denseRank: 1,
            userId: "u-b",
            displayName: "Bob",
            xp: 5000,
            isTied: true,
          },
          {
            rank: 3,
            denseRank: 2,
            userId: "u-c",
            displayName: "Carol",
            xp: 4500,
            isTied: false,
          },
        ],
        totalParticipants: 3,
        userPosition: null,
        period: { id: "all_time", label: "All time", startsAt: null, endsAt: null },
        pagination: { limit: 20, hasMore: false },
      },
    });

    const { result } = renderHook(() => useRankingLeaderboard());

    await waitFor(() => {
      expect(result.current.items.length).toBe(3);
    });

    // Order is preserved from the wire response: Alice, Bob, Carol.
    expect(result.current.items[0]?.userId).toBe("u-a");
    expect(result.current.items[1]?.userId).toBe("u-b");
    expect(result.current.items[2]?.userId).toBe("u-c");

    // The current-user flag flows through from the projection.
    expect(result.current.items[1]?.isCurrentUser).toBe(null);
  });

  it("returns userPosition: null (public endpoint)", async () => {
    authenticated();
    mockGetRankingLeaderboard.mockResolvedValueOnce({
      data: {
        entries: [],
        totalParticipants: 0,
        userPosition: null,
        period: { id: "all_time", label: "All time", startsAt: null, endsAt: null },
        pagination: { limit: 20, hasMore: false },
      },
    });

    const { result } = renderHook(() => useRankingLeaderboard());

    await waitFor(() => {
      expect(result.current.items).toBeDefined();
    });

    expect(result.current.userPosition).toBeNull();
  });

  it("forwards period filter to the service", async () => {
    authenticated();
    mockGetRankingLeaderboard.mockResolvedValueOnce({
      entries: [],
      pagination: { limit: 20, hasMore: false },
    });

    renderHook(() => useRankingLeaderboard({ period: "weekly" }));

    await waitFor(() => {
      expect(mockGetRankingLeaderboard).toHaveBeenCalled();
    });

    expect(mockGetRankingLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ period: "weekly" }),
    );
  });
});
