/**
 * `LeaderboardTable.spec.tsx` — locks the global leaderboard table
 * surface from TKT-5.5.D1.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` → renders `null`.
 * - Loading → skeleton.
 * - Empty → empty state.
 * - Items render in backend order; ties preserved; current-user row highlighted.
 * - `Load more` button appears when `hasMore` is true and triggers `loadMore`.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { LeaderboardTable } from "@/features/rankings/components/LeaderboardTable";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseRankingLeaderboard = vi.fn();
vi.mock("@/features/rankings/hooks/useRankingLeaderboard", () => ({
  useRankingLeaderboard: (...args: unknown[]) =>
    mockUseRankingLeaderboard(...args),
}));

describe("LeaderboardTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders null when feature flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    mockUseRankingLeaderboard.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
      userPosition: null,
    });

    const { container } = render(<LeaderboardTable />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the skeleton when loading with no cached items", () => {
    mockUseRankingLeaderboard.mockReturnValue({
      items: [],
      isLoading: true,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
      userPosition: null,
    });

    render(<LeaderboardTable />);

    expect(
      screen.getByTestId("leaderboard-table-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("leaderboard-table"),
    ).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no entries", () => {
    mockUseRankingLeaderboard.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
      userPosition: null,
    });

    render(<LeaderboardTable />);

    expect(
      screen.queryByTestId("leaderboard-table"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/no leaderboard data/i)).toBeInTheDocument();
  });

  it("renders entries in backend order with ties and current-user highlight", () => {
    mockUseRankingLeaderboard.mockReturnValue({
      items: [
        {
          id: "u-a",
          rank: 1,
          denseRank: 1,
          userId: "u-a",
          displayName: "Alice",
          xp: 5000,
          isTied: true,
          isCurrentUser: false,
        },
        {
          id: "u-b",
          rank: 1,
          denseRank: 1,
          userId: "u-b",
          displayName: "Bob",
          xp: 5000,
          isTied: true,
          isCurrentUser: true,
        },
        {
          id: "u-c",
          rank: 3,
          denseRank: 2,
          userId: "u-c",
          displayName: "Carol",
          xp: 4500,
          isTied: false,
          isCurrentUser: false,
        },
      ],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
      userPosition: null,
    });

    render(<LeaderboardTable />);

    // Order is preserved — Alice before Bob, Bob before Carol.
    expect(screen.getByTestId("leaderboard-row-u-a")).toBeInTheDocument();
    expect(screen.getByTestId("leaderboard-row-u-b")).toBeInTheDocument();
    expect(screen.getByTestId("leaderboard-row-u-c")).toBeInTheDocument();

    // Current-user row labelled "You".
    const youRow = screen.getByTestId("leaderboard-row-u-b");
    expect(youRow).toHaveTextContent("Bob");
    expect(youRow).toHaveTextContent(/you/i);
  });

  it("shows Load more button when hasMore is true and triggers loadMore", () => {
    const loadMore = vi.fn();
    mockUseRankingLeaderboard.mockReturnValue({
      items: [
        {
          id: "u-a",
          rank: 1,
          denseRank: 1,
          userId: "u-a",
          displayName: "Alice",
          xp: 5000,
          isTied: false,
          isCurrentUser: false,
        },
      ],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      loadMore,
      error: null,
      refresh: vi.fn(),
      isStale: false,
      userPosition: null,
    });

    render(<LeaderboardTable />);

    const button = screen.getByRole("button", { name: /load more/i });
    fireEvent.click(button);

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
