/**
 * `RankingsPage.spec.tsx` — locks the F1 ranking surfaces composition.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * The page-level tests verify the F1 acceptance criteria:
 * - F1 AC #1 — placeholder view rendered when `phase5_rankings === 'placeholder'`.
 * - F1 AC #2 — personal surfaces self-gate on auth bootstrap (their
 *   own mocks return `null` to authenticated users, so children
 *   register on the page).
 * - F1 AC #3 — public leaderboard always visible.
 * - F1 AC #4 — period filter writes to URL query state.
 * - F1 AC #5 — period selector + leaderboard wired correctly.
 *
 * The page composition is mocked at the child-component boundary to
 * keep the assertion surface focused on page-level orchestration
 * (feature flag branch, period URL state, child wiring).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { RankingsPage } from "@/features/rankings/components/RankingsPage";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock("@/features/rankings/components/RankingSummaryCard", () => ({
  RankingSummaryCard: () => <div data-testid="ranking-summary-card-stub" />,
}));
vi.mock("@/features/rankings/components/MilestonesList", () => ({
  MilestonesList: () => <div data-testid="milestones-list-stub" />,
}));
vi.mock("@/features/rankings/components/LeaderboardTable", () => ({
  LeaderboardTable: ({
    period,
  }: {
    period?: string;
    limit?: number;
    className?: string;
  }) => (
    <div data-testid={`leaderboard-table-stub-${period ?? "default"}`} />
  ),
}));
vi.mock("@/features/rankings/components/RankingHistory", () => ({
  RankingHistory: () => <div data-testid="ranking-history-stub" />,
}));
vi.mock("@/features/rankings/components/shared/Placeholder", () => ({
  RankingsPlaceholder: () => (
    <div data-testid="rankings-placeholder-stub">coming soon</div>
  ),
}));

const mockRouterReplace = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/rankings",
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function seedSearchParams(value?: string) {
  mockSearchParams.delete("period");
  if (value) mockSearchParams.set("period", value);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("RankingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the placeholder view when the ranking surface flag is off", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    render(<RankingsPage />);

    expect(screen.getByTestId("rankings-page-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("rankings-placeholder-stub")).toBeInTheDocument();
    // Live-mode children must not mount.
    expect(
      screen.queryByTestId("ranking-summary-card-stub"),
    ).not.toBeInTheDocument();
  });

  it("renders the live composition when the ranking surface flag is live", () => {
    seedSearchParams();

    render(<RankingsPage />);

    expect(screen.getByTestId("rankings-page")).toBeInTheDocument();
    expect(screen.getByTestId("ranking-summary-card-stub")).toBeInTheDocument();
    expect(screen.getByTestId("milestones-list-stub")).toBeInTheDocument();
    expect(screen.getByTestId("leaderboard-table-stub-all_time")).toBeInTheDocument();
    expect(screen.getByTestId("ranking-history-stub")).toBeInTheDocument();
  });

  it("defaults to the all_time period when no query is present", () => {
    seedSearchParams();

    render(<RankingsPage />);

    expect(
      screen.getByTestId("leaderboard-table-stub-all_time"),
    ).toBeInTheDocument();
  });

  it("respects a weekly query parameter and forwards it to LeaderboardTable", () => {
    seedSearchParams("weekly");

    render(<RankingsPage />);

    expect(
      screen.getByTestId("leaderboard-table-stub-weekly"),
    ).toBeInTheDocument();
  });

  it("respects a monthly query parameter and forwards it to LeaderboardTable", () => {
    seedSearchParams("monthly");

    render(<RankingsPage />);

    expect(
      screen.getByTestId("leaderboard-table-stub-monthly"),
    ).toBeInTheDocument();
  });

  it("ignores invalid period query values and falls back to all_time", () => {
    seedSearchParams("yearly");

    render(<RankingsPage />);

    expect(
      screen.getByTestId("leaderboard-table-stub-all_time"),
    ).toBeInTheDocument();
  });

  it("writes the selected period to the URL when a period chip is clicked", () => {
    seedSearchParams();

    render(<RankingsPage />);

    fireEvent.click(screen.getByTestId("rankings-period-weekly"));

    expect(mockRouterReplace).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/rankings?period=weekly",
      { scroll: false },
    );
  });

  it("removes the period param from the URL when the all-time chip is selected", () => {
    seedSearchParams("weekly");

    render(<RankingsPage />);

    fireEvent.click(screen.getByTestId("rankings-period-all time"));

    expect(mockRouterReplace).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/rankings",
      { scroll: false },
    );
  });
});
