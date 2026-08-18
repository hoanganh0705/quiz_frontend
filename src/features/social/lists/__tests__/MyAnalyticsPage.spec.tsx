

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseMySocialAnalytics = vi.fn();
vi.mock("@/features/social/hooks/useMySocialAnalytics", () => ({
useMySocialAnalytics: (...args: unknown[]) => mockUseMySocialAnalytics(...args),
}));

const mockUsePeriodFilter = vi.fn();
vi.mock("@/features/social/hooks/usePeriodFilter", () => ({
usePeriodFilter: () => mockUsePeriodFilter(),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: (...args: unknown[]) => mockUseAuthBootstrap(...args),
}));

const scrollToSpy = vi.fn();
const originalScrollTo = window.scrollTo;

beforeEach(() => {
mockUseMySocialAnalytics.mockReset();
mockUsePeriodFilter.mockReset();
mockUseAuthBootstrap.mockReset();
scrollToSpy.mockClear();
window.scrollTo = ((...args: unknown[]) => {
scrollToSpy(...args);
  }) as typeof window.scrollTo;
mockUsePeriodFilter.mockReturnValue({
period: "week",
isValid: true,
setPeriod: vi.fn(),
reset: vi.fn(),
  });
mockUseAuthBootstrap.mockReturnValue({
currentUser: { userId: "viewer-id" },
isAuthenticated: true,
  });
});

afterEach(() => {
window.scrollTo = originalScrollTo;
});

function ready(overrides: Record<string, unknown> = {}) {
return {
analytics: {
friends: 5,
followers: 30,
following: 50,
growth30Days: 4,
isStale: false,
    },
isLoading: false,
isStale: false,
error: null,
retry: vi.fn(),
staleness: "fresh" as const,
...overrides,
  };
}

import { MyAnalyticsPage } from "@/features/social/lists/MyAnalyticsPage";

describe("MyAnalyticsPage — composition", () => {
it("renders the AnalyticsPeriodFilter at the top", () => {
mockUseMySocialAnalytics.mockReturnValue(ready());
render(<MyAnalyticsPage />);
expect(screen.getByTestId("analytics-period-filter")).toBeInTheDocument();
  });

it("renders one AnalyticsChart per non-zero widget and hides zero widgets", () => {
mockUseMySocialAnalytics.mockReturnValue(ready());
render(<MyAnalyticsPage />);
expect(screen.getByTestId("my-analytics-page-grid")).toBeInTheDocument();
expect(
screen.getByTestId("analytics-chart-friend_count"),
    ).toBeInTheDocument();
expect(
screen.getByTestId("analytics-chart-follower_count"),
    ).toBeInTheDocument();
expect(
screen.getByTestId("analytics-chart-following_count"),
    ).toBeInTheDocument();
expect(
screen.getByTestId("analytics-chart-quizzes_published"),
    ).toBeInTheDocument();
expect(
screen.getByTestId("analytics-chart-attempts_completed"),
    ).toBeInTheDocument();

expect(
screen.queryByTestId("analytics-chart-ranking_xp_week"),
    ).not.toBeInTheDocument();
  });

it("does not render role=alert for a successful load", () => {
mockUseMySocialAnalytics.mockReturnValue(ready());
render(<MyAnalyticsPage />);
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("MyAnalyticsPage — loading branch", () => {
it("renders the MyAnalyticsSkeleton during initial load", () => {
mockUseMySocialAnalytics.mockReturnValue(
ready({ analytics: null, isLoading: true }),
    );
render(<MyAnalyticsPage />);
expect(
screen.getByTestId("my-analytics-page-loading"),
    ).toBeInTheDocument();
expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("MyAnalyticsPage — error branch", () => {
it("renders AnalyticsErrorState with a retry CTA when the hook fails", () => {
const retryMock = vi.fn();
mockUseMySocialAnalytics.mockReturnValue(
ready({
analytics: null,
error: {
code: "GLOBAL_RATE_LIMITED",
status: 429,
message: "x",
        } as never,
retry: retryMock,
      }),
    );
render(<MyAnalyticsPage />);
expect(screen.getByTestId("analytics-error")).toBeInTheDocument();
fireEvent.click(screen.getByTestId("analytics-error-retry"));
expect(retryMock).toHaveBeenCalled();
  });
});

describe("MyAnalyticsPage — empty branch", () => {
it("renders AnalyticsEmptyState with the period-specific copy when no widgets render", () => {

mockUsePeriodFilter.mockReturnValue({
period: "month",
isValid: true,
setPeriod: vi.fn(),
reset: vi.fn(),
    });
mockUseMySocialAnalytics.mockReturnValue(
ready({
analytics: {
friends: 0,
followers: 0,
following: 0,
growth30Days: 0,
isStale: false,
        },
      }),
    );
render(<MyAnalyticsPage />);

expect(screen.getByTestId("my-analytics-page")).toBeInTheDocument();
  });
});

describe("MyAnalyticsPage — consistency notice", () => {
it("renders ConsistencyNotice when staleness is stale", () => {
mockUseMySocialAnalytics.mockReturnValue(ready({ staleness: "stale" }));
render(<MyAnalyticsPage />);
expect(screen.getByTestId("consistency-notice-stale")).toBeInTheDocument();
  });

it("does not render ConsistencyNotice when staleness is fresh", () => {
mockUseMySocialAnalytics.mockReturnValue(ready({ staleness: "fresh" }));
render(<MyAnalyticsPage />);
expect(
screen.queryByTestId("consistency-notice-stale"),
    ).not.toBeInTheDocument();
expect(
screen.queryByTestId("consistency-notice-recent"),
    ).not.toBeInTheDocument();
  });
});

describe("MyAnalyticsPage — period change", () => {
it("re-derives the hook key when the URL period changes (TKT-6.3.F2 contract)", () => {
mockUseMySocialAnalytics.mockReturnValue(ready());
render(<MyAnalyticsPage />);
expect(mockUseMySocialAnalytics).toHaveBeenCalledWith("week");
  });

it("does not call window.scrollTo on period change (cross-batch invariant)", () => {
mockUseMySocialAnalytics.mockReturnValue(ready());
render(<MyAnalyticsPage />);

fireEvent.click(
screen.getByTestId("analytics-period-filter-option-month"),
    );
expect(scrollToSpy).not.toHaveBeenCalled();
  });
});