

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserStatsCard } from "@/features/social/lists/UserStatsCard";

const mockUseUserSocialStats = vi.fn();
vi.mock("@/features/social/hooks/useUserSocialStats", () => ({
useUserSocialStats: (...args: unknown[]) => mockUseUserSocialStats(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: (...args: unknown[]) => mockUseAuthBootstrap(...args),
}));

function visibleResult(overrides: Record<string, unknown> = {}) {
return {
stats: {
friends: 2,
followers: 10,
following: 20,
staleAt: undefined,
isStale: false,
    },
isLoading: false,
isStale: false,
error: null,
retry: vi.fn(),
visibility: "visible" as const,
...overrides,
  };
}

beforeEach(() => {
mockUseUserSocialStats.mockReset();
mockUseAuthBootstrap.mockReset();

mockUseAuthBootstrap.mockReturnValue({
currentUser: { userId: "viewer-id", username: "v", email: null, role: "user", isVerified: true },
isAuthenticated: true,
  });
});

describe("UserStatsCard — privacy branch", () => {
it("renders PrivacyRestrictedNotice and no AnalyticsChart when visibility is not_found", () => {
mockUseUserSocialStats.mockReturnValue(
visibleResult({ stats: null, visibility: "not_found" }),
    );
render(<UserStatsCard targetUserId="user-1" />);
expect(
screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
expect(screen.queryByTestId("user-stats-card")).not.toBeInTheDocument();
  });

it("renders PrivacyRestrictedNotice when visibility is blocked_viewer", () => {
mockUseUserSocialStats.mockReturnValue(
visibleResult({ stats: null, visibility: "blocked_viewer" }),
    );
render(<UserStatsCard targetUserId="user-1" />);
expect(
screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
  });

it("renders PrivacyRestrictedNotice when visibility is private", () => {
mockUseUserSocialStats.mockReturnValue(
visibleResult({ stats: null, visibility: "private" }),
    );
render(<UserStatsCard targetUserId="user-1" />);
expect(
screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
  });
});

describe("UserStatsCard — loading branch", () => {
it("renders UserStatsSkeleton when loading and no cached data", () => {
mockUseUserSocialStats.mockReturnValue(
visibleResult({ stats: null, isLoading: true }),
    );
render(<UserStatsCard targetUserId="user-1" />);
expect(screen.getByRole("status")).toBeInTheDocument();
expect(screen.queryByTestId("user-stats-card")).not.toBeInTheDocument();
  });
});

describe("UserStatsCard — populated branch", () => {
it("renders one AnalyticsChart per non-zero widget", () => {
mockUseUserSocialStats.mockReturnValue(visibleResult());
render(<UserStatsCard targetUserId="user-1" />);
expect(screen.getByTestId("user-stats-card")).toBeInTheDocument();
expect(screen.getByTestId("user-stats-card-grid")).toBeInTheDocument();
expect(screen.getByTestId("analytics-chart-friend_count")).toBeInTheDocument();
expect(screen.getByTestId("analytics-chart-follower_count")).toBeInTheDocument();
expect(screen.getByTestId("analytics-chart-following_count")).toBeInTheDocument();
  });

it("does not render role=alert in the populated branch", () => {
mockUseUserSocialStats.mockReturnValue(visibleResult());
render(<UserStatsCard targetUserId="user-1" />);
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("UserStatsCard — consistency notice", () => {
it("renders the ConsistencyNotice when stats are stale", () => {
mockUseUserSocialStats.mockReturnValue(
visibleResult({
stats: {
friends: 1,
followers: 2,
following: 3,
isStale: true,
        },
      }),
    );
render(<UserStatsCard targetUserId="user-1" />);
expect(screen.getByTestId("consistency-notice-stale")).toBeInTheDocument();
  });

it("does not render the ConsistencyNotice when stats are fresh", () => {
mockUseUserSocialStats.mockReturnValue(
visibleResult({
stats: {
friends: 1,
followers: 2,
following: 3,
isStale: false,
        },
      }),
    );
render(<UserStatsCard targetUserId="user-1" />);
expect(
screen.queryByTestId("consistency-notice-stale"),
    ).not.toBeInTheDocument();
expect(
screen.queryByTestId("consistency-notice-recent"),
    ).not.toBeInTheDocument();
  });
});

describe("UserStatsCard — error branch", () => {
it("renders AnalyticsErrorState when an error is present and no cached data", () => {
mockUseUserSocialStats.mockReturnValue(
visibleResult({
stats: null,
error: { code: "GLOBAL_RATE_LIMITED", status: 429, message: "x" } as never,
      }),
    );
render(<UserStatsCard targetUserId="user-1" />);
expect(screen.getByTestId("analytics-error")).toBeInTheDocument();
expect(screen.getByTestId("analytics-error-retry")).toBeInTheDocument();
  });
});

describe("UserStatsCard — self branch", () => {
it("renders the self variant with the skeleton when the viewer IS the target", () => {
mockUseAuthBootstrap.mockReturnValue({
currentUser: { userId: "self-id" },
isAuthenticated: true,
    });
mockUseUserSocialStats.mockReturnValue(
visibleResult({ stats: null, visibility: "visible" }),
    );
render(<UserStatsCard targetUserId="self-id" />);
expect(screen.getByTestId("user-stats-card-self")).toBeInTheDocument();
  });
});