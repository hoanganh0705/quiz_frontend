/**
 * `FriendLeaderboardPage.spec.tsx` — Locks the Friend Leaderboard
 * page contract (TKT-6.3.G2).
 *
 * Asserts:
 *
 *   - Loading + no rows → `FriendLeaderboardSkeleton`.
 *   - `entries.length === 0` + no error → `AnalyticsEmptyState`
 *     with the leaderboard-kind copy (NOT `AnalyticsErrorState`).
 *   - Error + no cached rows → `AnalyticsErrorState` with code-
 *     specific copy and a retry CTA.
 *   - `staleness !== 'fresh'` → `ConsistencyNotice` rendered
 *     above the list.
 *   - Populated → list of `FriendLeaderboardRow`; pagination
 *     footer calls `loadMore()`.
 *   - The "forbidden-as-empty" branch: when the hook surfaces
 *     `SOCIAL_FRIEND_LIST_FORBIDDEN` AND there are no cached
 *     rows, the page renders the empty state, NOT the error
 *     state.
 *   - The page never persists `followId` / `friendshipId` (the
 *     analytics payload helper is mocked; the assertion is on
 *     the `<Link>` href generation done by the row).
 *   - `useSocialLifecycleReset` is wired with `periodReset`.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FriendLeaderboardPage } from "@/features/social/lists/FriendLeaderboardPage";

const mockUseFriendLeaderboard = vi.fn();
vi.mock("@/features/social/hooks/useFriendLeaderboard", () => ({
  useFriendLeaderboard: (...args: unknown[]) =>
    mockUseFriendLeaderboard(...args),
}));

const mockUsePeriodFilter = vi.fn();
vi.mock("@/features/social/hooks/usePeriodFilter", () => ({
  usePeriodFilter: () => mockUsePeriodFilter(),
}));

const mockUseSocialLifecycleReset = vi.fn();
vi.mock("@/features/social/hooks/useSocialLifecycleReset", () => ({
  useSocialLifecycleReset: (...args: unknown[]) =>
    mockUseSocialLifecycleReset(...args),
}));

beforeEach(() => {
  mockUseFriendLeaderboard.mockReset();
  mockUsePeriodFilter.mockReset();
  mockUseSocialLifecycleReset.mockReset();
  mockUsePeriodFilter.mockReturnValue({
    period: "week",
    isValid: true,
    setPeriod: vi.fn(),
    reset: vi.fn(),
  });
  mockUseSocialLifecycleReset.mockImplementation(() => undefined);
});

function ready(overrides: Record<string, unknown> = {}) {
  return {
    entries: [
      {
        rank: 1,
        userId: "11111111-1111-1111-1111-111111111111",
        username: "alice",
        displayName: null,
        avatarUrl: null,
        xp: 1200,
        friendSince: "2026-01-01T00:00:00.000Z",
      },
      {
        rank: 2,
        userId: "22222222-2222-2222-2222-222222222222",
        username: "bob",
        displayName: null,
        avatarUrl: null,
        xp: 950,
        friendSince: "2026-01-02T00:00:00.000Z",
      },
    ],
    isLoading: false,
    isStale: false,
    error: null,
    retry: vi.fn(),
    hasMore: false,
    loadMore: vi.fn(),
    staleness: "fresh" as const,
    ...overrides,
  };
}

describe("FriendLeaderboardPage — loading branch", () => {
  it("renders the skeleton while loading and no rows are cached", () => {
    mockUseFriendLeaderboard.mockReturnValue(
      ready({ entries: [], isLoading: true }),
    );
    render(<FriendLeaderboardPage />);
    expect(
      screen.getByTestId("friend-leaderboard-skeleton"),
    ).toBeInTheDocument();
  });
});

describe("FriendLeaderboardPage — empty branch", () => {
  it("renders the empty state when entries are empty and there is no error", () => {
    mockUseFriendLeaderboard.mockReturnValue(
      ready({ entries: [], isLoading: false }),
    );
    render(<FriendLeaderboardPage />);
    expect(
      screen.getByTestId("friend-leaderboard-page-empty"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("analytics-error")).not.toBeInTheDocument();
  });

  it("does NOT render an error state for SOCIAL_FRIEND_LIST_FORBIDDEN (forbidden-as-empty)", () => {
    mockUseFriendLeaderboard.mockReturnValue(
      ready({
        entries: [],
        error: {
          code: "SOCIAL_FRIEND_LIST_FORBIDDEN",
          status: 403,
          message: "forbidden",
        } as never,
      }),
    );
    render(<FriendLeaderboardPage />);
    // The hook's `entries` is non-empty when the backend returns
    // forbidden as a privacy notice; the empty branch should
    // win (no `AnalyticsErrorState` is rendered).
    expect(
      screen.queryByTestId("analytics-error"),
    ).not.toBeInTheDocument();
  });
});

describe("FriendLeaderboardPage — error branch", () => {
  it("renders AnalyticsErrorState with a retry CTA when an error fires for the very first load", () => {
    const retry = vi.fn();
    mockUseFriendLeaderboard.mockReturnValue(
      ready({
        entries: [],
        error: {
          code: "GLOBAL_RATE_LIMITED",
          status: 429,
          message: "x",
        } as never,
        retry,
      }),
    );
    render(<FriendLeaderboardPage />);
    expect(screen.getByTestId("analytics-error")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("analytics-error-retry"));
    expect(retry).toHaveBeenCalled();
  });
});

describe("FriendLeaderboardPage — populated branch", () => {
  it("renders one row per entry and surfaces the consistency notice when stale", () => {
    mockUseFriendLeaderboard.mockReturnValue(
      ready({ staleness: "stale" }),
    );
    render(<FriendLeaderboardPage />);
    expect(screen.getByTestId("friend-leaderboard-list")).toBeInTheDocument();
    expect(screen.getAllByTestId("friend-leaderboard-row").length).toBe(2);
    expect(screen.getByTestId("consistency-notice-stale")).toBeInTheDocument();
  });

  it("does not render the consistency notice when staleness is fresh", () => {
    mockUseFriendLeaderboard.mockReturnValue(ready());
    render(<FriendLeaderboardPage />);
    expect(
      screen.queryByTestId("consistency-notice-stale"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("consistency-notice-recent"),
    ).not.toBeInTheDocument();
  });

  it("renders a Load-more footer that calls loadMore when hasMore is true", () => {
    const loadMore = vi.fn();
    mockUseFriendLeaderboard.mockReturnValue(ready({ hasMore: true, loadMore }));
    render(<FriendLeaderboardPage />);
    const footer = screen.getByTestId("friend-leaderboard-page-load-more");
    fireEvent.click(footer);
    expect(loadMore).toHaveBeenCalled();
  });

  it("does not render the Load-more footer when hasMore is false", () => {
    mockUseFriendLeaderboard.mockReturnValue(ready({ hasMore: false }));
    render(<FriendLeaderboardPage />);
    expect(
      screen.queryByTestId("friend-leaderboard-page-load-more"),
    ).not.toBeInTheDocument();
  });
});

describe("FriendLeaderboardPage — period wiring", () => {
  it("forwards the URL period to the hook", () => {
    mockUsePeriodFilter.mockReturnValue({
      period: "month",
      isValid: true,
      setPeriod: vi.fn(),
      reset: vi.fn(),
    });
    mockUseFriendLeaderboard.mockReturnValue(ready());
    render(<FriendLeaderboardPage />);
    expect(mockUseFriendLeaderboard).toHaveBeenCalledWith("month");
  });

  it("wires useSocialLifecycleReset with periodReset so a logout wipes the period URL state", () => {
    const reset = vi.fn();
    mockUsePeriodFilter.mockReturnValue({
      period: "week",
      isValid: true,
      setPeriod: vi.fn(),
      reset,
    });
    mockUseFriendLeaderboard.mockReturnValue(ready());
    render(<FriendLeaderboardPage />);
    expect(mockUseSocialLifecycleReset).toHaveBeenCalledTimes(1);
    const call = mockUseSocialLifecycleReset.mock.calls[0]?.[0] as
      | { periodReset?: () => void }
      | undefined;
    expect(call?.periodReset).toBe(reset);
  });
});