

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/features/auth/hooks/use-auth-state", () => ({
useAuthState: () => ({ isAuthenticated: true }),
}));

const mockUseSocialCounts = vi.fn();
vi.mock("@/features/social/hooks/useSocialCounts", () => ({
useSocialCounts: (...args: unknown[]) => mockUseSocialCounts(...args),
}));

const mockUseUserSocialStats = vi.fn();
vi.mock("@/features/social/hooks/useUserSocialStats", () => ({
useUserSocialStats: (...args: unknown[]) => mockUseUserSocialStats(...args),
}));

const mockUseMySocialAnalytics = vi.fn();
vi.mock("@/features/social/hooks/useMySocialAnalytics", () => ({
useMySocialAnalytics: (...args: unknown[]) =>
mockUseMySocialAnalytics(...args),
}));

const mockUseFriendLeaderboard = vi.fn();
vi.mock("@/features/social/hooks/useFriendLeaderboard", () => ({
useFriendLeaderboard: (...args: unknown[]) =>
mockUseFriendLeaderboard(...args),
}));

const mockUsePeriodFilter = vi.fn();
vi.mock("@/features/social/hooks/usePeriodFilter", () => ({
usePeriodFilter: () => mockUsePeriodFilter(),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: (...args: unknown[]) => mockUseAuthBootstrap(...args),
}));

const featureFlags: { social_live: "live" | "placeholder" } = {
social_live: "placeholder",
};

vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (name: string) => {
if (name === "social_live") return featureFlags.social_live;
return "placeholder";
  },
}));

import { AnalyticsRouteGate } from "@/features/social/components/AnalyticsRouteGate";

describe("AnalyticsRouteGate — placeholder branch", () => {
beforeEach(() => {
featureFlags.social_live = "placeholder";
mockUseSocialCounts.mockReset();
mockUseUserSocialStats.mockReset();
mockUseAuthBootstrap.mockReset();
mockUseAuthBootstrap.mockReturnValue({
currentUser: { userId: "viewer-id" },
isAuthenticated: true,
    });
mockUseSocialCounts.mockReturnValue({
counts: { followers: 7, following: 12, friends: 3, blocked: 0 },
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
    });
mockUseUserSocialStats.mockReturnValue({
stats: null,
isLoading: false,
isStale: false,
error: null,
retry: () => undefined,
visibility: "visible",
    });
  });

it("renders the hub placeholder when the parent flag is 'placeholder'", () => {
render(<AnalyticsRouteGate kind="hub" />);
expect(screen.getByTestId("social-hub-placeholder")).toBeInTheDocument();
  });

it("renders the my-analytics placeholder when the parent flag is 'placeholder'", () => {
render(<AnalyticsRouteGate kind="my-analytics" requireAuth />);
expect(screen.getByTestId("analytics-placeholder-my-analytics")).toBeInTheDocument();
  });

it("renders the stats placeholder when the parent flag is 'placeholder'", () => {
render(<AnalyticsRouteGate kind="stats" targetUserId="00000000-0000-4000-8000-000000000000" />);
expect(screen.getByTestId("analytics-placeholder-stats")).toBeInTheDocument();
  });

it("renders the leaderboard placeholder when the parent flag is 'placeholder'", () => {
render(<AnalyticsRouteGate kind="leaderboard" requireAuth />);
expect(screen.getByTestId("analytics-placeholder-leaderboard")).toBeInTheDocument();
  });
});

describe("AnalyticsRouteGate — live branch (Batch E / F)", () => {
beforeEach(() => {
featureFlags.social_live = "live";
mockUseSocialCounts.mockReset();
mockUseUserSocialStats.mockReset();
mockUseMySocialAnalytics.mockReset();
mockUseFriendLeaderboard.mockReset();
mockUsePeriodFilter.mockReset();
mockUseAuthBootstrap.mockReset();
mockUseAuthBootstrap.mockReturnValue({
currentUser: { userId: "viewer-id" },
isAuthenticated: true,
    });
mockUseSocialCounts.mockReturnValue({
counts: { followers: 7, following: 12, friends: 3, blocked: 0 },
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
    });
mockUseUserSocialStats.mockReturnValue({
stats: {
friends: 2,
followers: 10,
following: 20,
isStale: false,
      },
isLoading: false,
isStale: false,
error: null,
retry: () => undefined,
visibility: "visible",
    });
mockUseMySocialAnalytics.mockReturnValue({
analytics: null,
isLoading: true,
isStale: false,
error: null,
retry: () => undefined,
staleness: "fresh",
    });
mockUseFriendLeaderboard.mockReturnValue({
entries: [],
isLoading: true,
isStale: false,
error: null,
retry: () => undefined,
hasMore: false,
loadMore: () => undefined,
staleness: "fresh",
    });
mockUsePeriodFilter.mockReturnValue({
period: "week",
isValid: true,
setPeriod: vi.fn(),
reset: vi.fn(),
    });
  });

it("renders SocialHubPage when the parent flag is 'live' (TKT-6.3.E4)", () => {
render(<AnalyticsRouteGate kind="hub" />);
expect(screen.getByTestId("social-hub-page")).toBeInTheDocument();
  });

it("renders UserStatsCard when the parent flag is 'live' and a UUID targetUserId is supplied (TKT-6.3.E4)", () => {
render(
<AnalyticsRouteGate
kind="stats"
targetUserId="00000000-0000-4000-8000-000000000000"
      />,
    );
expect(screen.getByTestId("user-stats-card")).toBeInTheDocument();
  });

it("renders MyAnalyticsPage when the parent flag is 'live' and authenticated (TKT-6.3.F3)", () => {
render(<AnalyticsRouteGate kind="my-analytics" requireAuth />);

expect(
screen.getByTestId("my-analytics-page-loading"),
    ).toBeInTheDocument();
  });

it("renders FriendLeaderboardPage when the parent flag is 'live' and authenticated (TKT-6.3.G3)", () => {

render(<AnalyticsRouteGate kind="leaderboard" requireAuth />);
expect(
screen.getByTestId("friend-leaderboard-page-loading"),
    ).toBeInTheDocument();
  });
});