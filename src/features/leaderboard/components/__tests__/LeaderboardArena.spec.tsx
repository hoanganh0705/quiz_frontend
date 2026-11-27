import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { LeaderboardArena } from "@/features/leaderboard/components/LeaderboardArena";
import { useArenaFriendsLeaderboard } from "@/features/leaderboard/hooks/useArenaFriendsLeaderboard";
import { useLeaderboard } from "@/features/leaderboard/hooks/useLeaderboard";
import { useLeaderboardDistribution } from "@/features/leaderboard/hooks/useLeaderboardDistribution";
import { useLiveWinners } from "@/features/leaderboard/hooks/useLiveWinners";
import {
  useMyPercentile,
  useMyRankMovement,
  useMyRankingHistory,
  useMyRankingMilestones,
} from "@/features/leaderboard/hooks/useMyRankInsights";
import { useMyRanking } from "@/features/leaderboard/hooks/useMyRanking";
import { useNearbyRanks } from "@/features/leaderboard/hooks/useNearbyRanks";
import { usePlayerDossier } from "@/features/leaderboard/hooks/usePlayerDossier";
import { useTopMovers } from "@/features/leaderboard/hooks/useTopMovers";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/auth/hooks/use-auth-state", () => ({
  useAuthState: vi.fn(),
}));

vi.mock("@/features/leaderboard/hooks/useLeaderboard", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/leaderboard/hooks/useLeaderboard")
  >("@/features/leaderboard/hooks/useLeaderboard");
  return {
    ...actual,
    useLeaderboard: vi.fn(),
  };
});

vi.mock("@/features/leaderboard/hooks/useMyRanking", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/leaderboard/hooks/useMyRanking")
  >("@/features/leaderboard/hooks/useMyRanking");
  return {
    ...actual,
    useMyRanking: vi.fn(),
  };
});

vi.mock("@/features/leaderboard/hooks/useNearbyRanks", () => ({
  useNearbyRanks: vi.fn(),
}));

vi.mock("@/features/leaderboard/hooks/useMyRankInsights", () => ({
  useMyPercentile: vi.fn(),
  useMyRankMovement: vi.fn(),
  useMyRankingHistory: vi.fn(),
  useMyRankingMilestones: vi.fn(),
}));

vi.mock("@/features/leaderboard/hooks/useTopMovers", () => ({
  useTopMovers: vi.fn(),
}));

vi.mock("@/features/leaderboard/hooks/useLeaderboardDistribution", () => ({
  useLeaderboardDistribution: vi.fn(),
}));

vi.mock("@/features/leaderboard/hooks/useLiveWinners", () => ({
  useLiveWinners: vi.fn(),
}));

vi.mock("@/features/leaderboard/hooks/usePlayerDossier", () => ({
  usePlayerDossier: vi.fn(),
}));

vi.mock("@/features/leaderboard/hooks/useArenaFriendsLeaderboard", () => ({
  useArenaFriendsLeaderboard: vi.fn(),
}));

vi.mock("@/features/leaderboard/components/FindFriendsPopup", () => ({
  FindFriendsPopup: () => null,
}));

const useAuthStateMock = vi.mocked(useAuthState);
const useLeaderboardMock = vi.mocked(useLeaderboard);
const useMyRankingMock = vi.mocked(useMyRanking);
const useNearbyRanksMock = vi.mocked(useNearbyRanks);
const useMyPercentileMock = vi.mocked(useMyPercentile);
const useMyRankMovementMock = vi.mocked(useMyRankMovement);
const useMyRankingHistoryMock = vi.mocked(useMyRankingHistory);
const useMyRankingMilestonesMock = vi.mocked(useMyRankingMilestones);
const useTopMoversMock = vi.mocked(useTopMovers);
const useLeaderboardDistributionMock = vi.mocked(useLeaderboardDistribution);
const useLiveWinnersMock = vi.mocked(useLiveWinners);
const usePlayerDossierMock = vi.mocked(usePlayerDossier);
const useArenaFriendsLeaderboardMock = vi.mocked(useArenaFriendsLeaderboard);

function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("LeaderboardArena — redesigned Competitive Standings Arena", () => {
  beforeEach(() => {
    useAuthStateMock.mockReturnValue({
      isAuthenticated: true,
      setAuthenticated: vi.fn(),
    });

    useLeaderboardMock.mockReturnValue({
      entries: [
        {
          id: "u-2",
          userId: "u-2",
          rank: 2,
          denseRank: 2,
          displayName: "RunnerUp",
          avatarUrl: null,
          xp: 4500,
          isTied: false,
          isCurrentUser: false,
        },
        {
          id: "u-1",
          userId: "u-1",
          rank: 1,
          denseRank: 1,
          displayName: "Champion",
          avatarUrl: null,
          xp: 5000,
          isTied: false,
          isCurrentUser: false,
        },
        {
          id: "u-3",
          userId: "u-3",
          rank: 3,
          denseRank: 3,
          displayName: "BronzeStar",
          avatarUrl: null,
          xp: 4000,
          isTied: false,
          isCurrentUser: false,
        },
        {
          id: "u-4",
          userId: "u-4",
          rank: 4,
          denseRank: 4,
          displayName: "ContenderFour",
          avatarUrl: null,
          xp: 3500,
          isTied: false,
          isCurrentUser: false,
        },
      ],
      totalParticipants: 1280,
      resetInSeconds: 172800,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
    });

    useMyRankingMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
      data: {
        global: {
          weekly: {
            rank: 12,
            xp: 1450,
            xpToNextRank: 150,
            nextRankXp: 1600,
            percentileLabel: "Top 10%",
            trend: "up",
            trendAmount: 4,
          },
          monthly: {
            rank: null,
            xp: 0,
            xpToNextRank: null,
            nextRankXp: null,
            percentileLabel: null,
          },
          allTime: {
            rank: 1,
            xp: 25000,
            xpToNextRank: null,
            nextRankXp: null,
            percentileLabel: "Top 1%",
          },
        },
        peakRanks: {
          daily: { rank: 3, achievedAt: "2026-05-10T00:00:00.000Z" },
          weekly: { rank: 5, achievedAt: "2026-05-12T00:00:00.000Z" },
          monthly: { rank: 8, achievedAt: "2026-05-01T00:00:00.000Z" },
          allTime: { rank: 1, achievedAt: "2026-05-15T00:00:00.000Z" },
        },
        badges: {
          isNew: false,
          isRisingStar: true,
          isActive: true,
        },
      } as unknown as ReturnType<typeof useMyRanking>["data"],
    });

    useNearbyRanksMock.mockReturnValue({
      above: [{ rank: 11, userId: "r-11", username: "RivalAhead", xp: 1599 }],
      me: { rank: 12, userId: "me-id", username: "ViewerHero", xp: 1450 },
      below: [{ rank: 13, userId: "r-13", username: "RivalBehind", xp: 1390 }],
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });

    useMyPercentileMock.mockReturnValue({
      data: {
        rank: 12,
        totalUsers: 1280,
        percentile: 99.06,
        percentileLabel: "Top 5%",
        betterThanUsers: 1268,
        worseThanUsers: 11,
      },
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });

    useMyRankMovementMock.mockReturnValue({
      data: {
        previousRank: 16,
        currentRank: 12,
        change: 4,
        direction: "up",
      },
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });

    useMyRankingHistoryMock.mockReturnValue({
      history: [
        { date: "2026-05-10", rank: 20 },
        { date: "2026-05-11", rank: 15 },
        { date: "2026-05-12", rank: 12 },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });

    useMyRankingMilestonesMock.mockReturnValue({
      milestones: [
        {
          milestone: "TOP_100",
          rank: 88,
          achievedAt: "2026-05-02T00:00:00.000Z",
        },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });

    useTopMoversMock.mockReturnValue({
      movers: [
        {
          userId: "m-1",
          username: "RocketQuizzer",
          currentRank: 18,
          previousRank: 140,
          change: 122,
        },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });

    useLeaderboardDistributionMock.mockReturnValue({
      totalUsers: 1280,
      remainingUsers: 280,
      buckets: [
        { label: "Top 10", count: 10 },
        { label: "Top 100", count: 100 },
        { label: "Top 1,000", count: 1000 },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });

    useLiveWinnersMock.mockReturnValue({
      winners: [
        {
          userId: "w-1",
          username: "tourney_champ",
          displayName: "TourneyChamp",
          avatarUrl: null,
          quizTitle: "Friday Blitz Cup",
          amountWon: "500",
          timeAgo: "12m ago",
          wonAt: "2026-05-15T10:00:00.000Z",
        },
      ],
      lastUpdated: "2026-05-15T10:05:00.000Z",
      isLoading: false,
      error: null,
      refresh: vi.fn(async () => undefined),
      isRetrying: false,
    });

    usePlayerDossierMock.mockReturnValue({
      profileRank: {
        global: {
          weekly: {
            rank: 1,
            denseRank: 1,
            percentile: 99.9,
            percentileLabel: "Top 1%",
            xp: 5000,
            xpToNextRank: null,
            nextRankXp: null,
            trend: "up",
            trendAmount: 2,
          },
          monthly: null,
          allTime: null,
        },
        peakRanks: {
          daily: { rank: 1, achievedAt: "2026-05-14T00:00:00.000Z" },
          weekly: { rank: 1, achievedAt: "2026-05-14T00:00:00.000Z" },
          monthly: null,
          allTime: null,
        },
        lastActivityAt: "2026-05-15T08:00:00.000Z",
        badges: { isNew: false, isRisingStar: true, isActive: true },
      } as unknown as ReturnType<typeof usePlayerDossier>["profileRank"],
      history: [
        { date: "2026-05-13", rank: 3 },
        { date: "2026-05-14", rank: 1 },
      ],
      resolvedUsername: "champion_one",
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });

    useArenaFriendsLeaderboardMock.mockReturnValue({
      isAuthenticated: true,
      entries: [
        {
          rank: 1,
          userId: "f-1",
          username: "best_friend",
          displayName: "BestFriend",
          avatarUrl: null,
          xp: 2100,
          friendSince: "2025-11-01T00:00:00.000Z",
        },
      ],
      currentUserRank: { rank: 2, xp: 1450, totalParticipants: 5 },
      totalParticipants: 5,
      isStale: false,
      isLoading: false,
      error: null,
      retry: vi.fn(async () => undefined),
    });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders one unified period selector that syncs header telemetry, personal standing, and leaderboard query", () => {
    render(
      <TestQueryProvider>
        <LeaderboardArena />
      </TestQueryProvider>,
    );

    expect(screen.getAllByRole("button", { name: "Weekly" })).toHaveLength(1);
    expect(screen.getByText("1,280 players")).toBeInTheDocument();
    expect(screen.getByText("Your weekly standing")).toBeInTheDocument();
    expect(screen.getAllByText("#12").length).toBeGreaterThanOrEqual(1);

    // Switch to Monthly (unranked 0 XP user)
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(useLeaderboardMock).toHaveBeenLastCalledWith("monthly");
    expect(screen.getByText("Your monthly standing")).toBeInTheDocument();
    expect(screen.getByText("Unranked")).toBeInTheDocument();
    expect(screen.getByText("Play a quiz to place")).toBeInTheDocument();

    // Switch to All-time (#1 leader — 100% progress)
    fireEvent.click(screen.getByRole("button", { name: "All-time" }));
    expect(useLeaderboardMock).toHaveBeenLastCalledWith("all_time");
    expect(screen.getByText("Your all-time standing")).toBeInTheDocument();
    expect(screen.getByText("#1 — Leading the pack")).toBeInTheDocument();
  });

  it("orders unified standings #1 -> #2 -> #3 -> #4 in rank order with leader pace and XP gaps", () => {
    render(
      <TestQueryProvider>
        <LeaderboardArena />
      </TestQueryProvider>,
    );

    expect(screen.queryByTestId("leaderboard-podium")).toBeNull();
    const rows = screen.getByTestId("leaderboard-rows");
    const items = Array.from(rows.querySelectorAll("li"));
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveAttribute("data-leaderboard-row", "u-1");
    expect(items[1]).toHaveAttribute("data-leaderboard-row", "u-2");
    expect(items[2]).toHaveAttribute("data-leaderboard-row", "u-3");
    expect(items[3]).toHaveAttribute("data-leaderboard-row", "u-4");
    expect(screen.getByText("100% pace")).toBeInTheDocument();
    expect(screen.getByText("-500 XP")).toBeInTheDocument();
    expect(screen.getByText("-1,000 XP")).toBeInTheDocument();
    expect(screen.getByText("-1,500 XP")).toBeInTheDocument();
  });

  it("switches seamlessly between Global XP and Friends scopes", () => {
    render(
      <TestQueryProvider>
        <LeaderboardArena />
      </TestQueryProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Friends/i }));
    expect(screen.getByTestId("friends-leaderboard-stage")).toBeInTheDocument();
    expect(screen.getByText("BestFriend")).toBeInTheDocument();
  });

  it("renders Rivals Radar, Rank Trajectory, Milestones, and Arena Pulse tabs", () => {
    render(
      <TestQueryProvider>
        <LeaderboardArena />
      </TestQueryProvider>,
    );

    // Rivals radar visible by default
    expect(screen.getByText("RivalAhead")).toBeInTheDocument();
    expect(screen.getByText("RivalBehind")).toBeInTheDocument();

    // Switch to Trajectory
    fireEvent.click(screen.getByRole("tab", { name: "Trajectory" }));
    expect(screen.getByText("All-time best")).toBeInTheDocument();

    // Switch to Milestones
    fireEvent.click(screen.getByRole("tab", { name: "Milestones" }));
    expect(screen.getByText("Top 100")).toBeInTheDocument();

    // Arena Pulse: Climbers -> Tier Pyramid -> Champions
    expect(screen.getByText("RocketQuizzer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Tier Pyramid" }));
    expect(screen.getByText("Your tier")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Champions" }));
    expect(screen.getByText("TourneyChamp")).toBeInTheDocument();
  });

  it("opens the slide-over Player Dossier when clicking a podium or contender player", () => {
    render(
      <TestQueryProvider>
        <LeaderboardArena />
      </TestQueryProvider>,
    );

    fireEvent.click(screen.getByText("Champion"));
    expect(screen.getByTestId("player-dossier-sheet")).toBeInTheDocument();
    expect(
      screen.getByText("Global Standings by Season"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /View Public Profile/i }),
    ).toHaveAttribute("href", "/users/u-1");
  });

  it("passes axe-core structural accessibility audit across the full Arena and Friends scope", async () => {
    const { container } = render(
      <TestQueryProvider>
        <LeaderboardArena />
      </TestQueryProvider>,
    );
    document.body.appendChild(container);

    const axeOptions = { rules: { "color-contrast": { enabled: false } } };
    const globalAudit = await axe.run(container, axeOptions);
    const globalBlockers = globalAudit.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(globalBlockers, JSON.stringify(globalBlockers, null, 2)).toHaveLength(
      0,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Friends/i }));
    const friendsAudit = await axe.run(container, axeOptions);
    const friendsBlockers = friendsAudit.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      friendsBlockers,
      JSON.stringify(friendsBlockers, null, 2),
    ).toHaveLength(0);
  });
});
