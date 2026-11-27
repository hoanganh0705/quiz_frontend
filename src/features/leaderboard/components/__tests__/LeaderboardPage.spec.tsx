import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

import {
  useLeaderboard,
  type LeaderboardEntryWithId,
} from "@/features/leaderboard/hooks/useLeaderboard";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";

import { LeaderboardPage } from "@/features/leaderboard/components/LeaderboardPage";

const getLeaderboardWithPaginationMock = vi.fn();

vi.mock("@/features/leaderboard/services/leaderboard.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/leaderboard/services/leaderboard.service")
  >("@/features/leaderboard/services/leaderboard.service");
  return {
    ...actual,
    getLeaderboardWithPagination: (...args: unknown[]) =>
      getLeaderboardWithPaginationMock(...args),
  };
});

vi.mock("@/features/leaderboard/hooks/useLeaderboard", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/leaderboard/hooks/useLeaderboard")
  >("@/features/leaderboard/hooks/useLeaderboard");
  return {
    ...actual,
    useLeaderboard: vi.fn(),
  };
});

vi.mock("@/features/auth/hooks/use-auth-state", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/hooks/use-auth-state")
  >("@/features/auth/hooks/use-auth-state");
  return {
    ...actual,
    useAuthState: vi.fn(),
  };
});

function makeEntry(
  overrides: Partial<LeaderboardEntryWithId> = {},
): LeaderboardEntryWithId {
  return {
    id: overrides.userId ?? "user-1",
    rank: 1,
    denseRank: 1,
    userId: "user-1",
    displayName: "Alice",
    avatarUrl: null,
    xp: 12345,
    isTied: false,
    isCurrentUser: false,
    ...overrides,
  };
}

function makeApiError(status: number): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: "AxiosError",
    message: `Mock ${status}`,
    code: `CODE_${status}`,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: { code: `CODE_${status}`, detail: "fixture" },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

const useLeaderboardMock = vi.mocked(useLeaderboard);
const useAuthStateMock = vi.mocked(useAuthState);

function setHookReturn(overrides: Partial<ReturnType<typeof useLeaderboard>>) {
  const stable = {
    entries: [] as ReturnType<typeof useLeaderboard>["entries"],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null as ReturnType<typeof useLeaderboard>["error"],
    refresh: vi.fn(async () => undefined),
    retryBannerVisible: false,
    ...overrides,
  };
  useLeaderboardMock.mockImplementation(() => stable);
}

function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getLeaderboardWithPaginationMock.mockReset();
  useLeaderboardMock.mockReset();
  useAuthStateMock.mockReset();

  useAuthStateMock.mockReturnValue({
    isAuthenticated: false,
    setAuthenticated: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
});

describe("LeaderboardPage — default period", () => {
  it("calls `useLeaderboard` with `weekly` on first paint", () => {
    setHookReturn({ entries: [] });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(useLeaderboardMock).toHaveBeenCalledWith("weekly");
  });
});

describe("LeaderboardPage — period switch", () => {
  it("changing the period passes the new period to `useLeaderboard`", async () => {
    setHookReturn({ entries: [] });
    const { rerender } = render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(useLeaderboardMock).toHaveBeenLastCalledWith("weekly");

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));

    await waitFor(() => {
      expect(useLeaderboardMock).toHaveBeenLastCalledWith("monthly");
    });

    fireEvent.click(screen.getByRole("button", { name: "All-time" }));

    await waitFor(() => {
      expect(useLeaderboardMock).toHaveBeenLastCalledWith("all_time");
    });

    rerender(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(useLeaderboardMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

describe("LeaderboardPage — unified #1–#N standings", () => {
  it("renders all entries from #1 onward in a single sorted standings list", () => {
    setHookReturn({
      entries: [
        makeEntry({ userId: "u-2", rank: 2, denseRank: 2, displayName: "Bob", xp: 900 }),
        makeEntry({
          userId: "u-1",
          rank: 1,
          denseRank: 1,
          displayName: "Alice",
          xp: 1200,
        }),
        makeEntry({
          userId: "u-3",
          rank: 3,
          denseRank: 3,
          displayName: "Carol",
          xp: 750,
        }),
        makeEntry({ userId: "u-4", rank: 4, denseRank: 4, displayName: "Dave", xp: 500 }),
        makeEntry({ userId: "u-5", rank: 5, denseRank: 5, displayName: "Eve", xp: 400 }),
      ],
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(screen.queryByTestId("leaderboard-podium")).toBeNull();
    const rows = screen.getByTestId("leaderboard-rows");
    expect(rows).toBeInTheDocument();

    const listItems = Array.from(rows.querySelectorAll("li"));
    expect(listItems).toHaveLength(5);
    expect(listItems[0]).toHaveAttribute("data-leaderboard-row", "u-1");
    expect(listItems[1]).toHaveAttribute("data-leaderboard-row", "u-2");
    expect(listItems[2]).toHaveAttribute("data-leaderboard-row", "u-3");
    expect(listItems[3]).toHaveAttribute("data-leaderboard-row", "u-4");
    expect(listItems[4]).toHaveAttribute("data-leaderboard-row", "u-5");

    expect(screen.getByText("100% pace")).toBeInTheDocument();
    expect(screen.getByText("-300 XP")).toBeInTheDocument();
    expect(screen.getByText("-450 XP")).toBeInTheDocument();
  });

  it("does NOT render the rows list when there are zero entries", () => {
    setHookReturn({
      entries: [],
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(screen.queryByTestId("leaderboard-rows")).toBeNull();
  });

  it("renders a single-entry standings table cleanly", () => {
    setHookReturn({
      entries: [makeEntry({ userId: "u-1", rank: 1, displayName: "Solo" })],
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(screen.getByTestId("leaderboard-rows")).toBeInTheDocument();
    expect(screen.getByText("Solo")).toBeInTheDocument();
  });

  it("sorts and renders entries even when rank is returned as a string from the backend", () => {
    setHookReturn({
      entries: [
        makeEntry({
          userId: "u-2",
          rank: "2" as unknown as number,
          displayName: "Bob",
        }),
        makeEntry({
          userId: "u-1",
          rank: "1" as unknown as number,
          displayName: "Alice",
        }),
        makeEntry({
          userId: "u-3",
          rank: "3" as unknown as number,
          displayName: "Carol",
        }),
      ],
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    const rows = screen.getByTestId("leaderboard-rows");
    const listItems = Array.from(rows.querySelectorAll("li"));
    expect(listItems[0]).toHaveAttribute("data-leaderboard-row", "u-1");
    expect(listItems[1]).toHaveAttribute("data-leaderboard-row", "u-2");
    expect(listItems[2]).toHaveAttribute("data-leaderboard-row", "u-3");
  });
});

describe("LeaderboardPage — load more", () => {
  it("renders the load-more button when `hasMore === true`", () => {
    setHookReturn({
      entries: [makeEntry({ userId: "u-1", rank: 1 })],
      hasMore: true,
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    const button = screen.getByTestId("leaderboard-load-more");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/load more/i);
  });

  it("does NOT render the load-more button when `hasMore === false`", () => {
    setHookReturn({
      entries: [makeEntry({ userId: "u-1", rank: 1 })],
      hasMore: false,
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(screen.queryByTestId("leaderboard-load-more")).toBeNull();
  });

  it("clicking the load-more button calls `loadMore` and reflects `isLoadingMore`", async () => {
    const loadMore = vi.fn();
    setHookReturn({
      entries: [makeEntry({ userId: "u-1", rank: 1 })],
      hasMore: true,
      loadMore,
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    const button = screen.getByTestId("leaderboard-load-more");

    expect(button).toHaveTextContent(/load more/i);
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });

  it("renders the loading state and disables the button when `isLoadingMore === true`", () => {
    setHookReturn({
      entries: [makeEntry({ userId: "u-1", rank: 1 })],
      hasMore: true,
      isLoadingMore: true,
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    const button = screen.getByTestId("leaderboard-load-more");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/loading/i);
  });
});

describe("LeaderboardPage — empty state", () => {
  it("renders the empty state when `entries.length === 0` and `isLoading === false`", () => {
    setHookReturn({
      entries: [],
      isLoading: false,
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(screen.getByTestId("leaderboard-empty-state")).toBeInTheDocument();
    expect(
      screen.getByText(
        /no leaderboard data yet.*play some quizzes to populate the ranks/i,
      ),
    ).toBeInTheDocument();
  });
});

describe("LeaderboardPage — skeleton", () => {
  it("renders the skeleton when `isLoading === true`", () => {
    setHookReturn({ isLoading: true, entries: [] });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(screen.getByTestId("leaderboard-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("leaderboard-empty-state")).toBeNull();
  });
});

describe("LeaderboardPage — errors", () => {
  it('renders the "This period isn\'t supported" inline error on 404', () => {
    setHookReturn({
      entries: [],
      error: makeApiError(404),
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(screen.getByTestId("leaderboard-404")).toBeInTheDocument();
    expect(
      screen.getByText(/this period isn't supported/i),
    ).toBeInTheDocument();
  });

  it("renders the 5xx retry banner with a Retry button", () => {
    const refresh = vi.fn(async () => undefined);
    setHookReturn({
      entries: [makeEntry({ userId: "u-1", rank: 1 })],
      error: makeApiError(500),
      refresh,
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    const banner = screen.getByTestId("leaderboard-5xx-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/something went wrong/i);

    const retry = within(banner).getByRole("button", { name: /retry/i });
    fireEvent.click(retry);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renders the retry banner when `retryBannerVisible` is set (cursor primitive D5)", () => {
    setHookReturn({
      entries: [],
      retryBannerVisible: true,
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    expect(screen.getByTestId("leaderboard-5xx-banner")).toBeInTheDocument();
  });
});

describe("LeaderboardPage — self-entry highlight", () => {
  it("highlights the self entry when `isAuthenticated === true` AND `entry.isCurrentUser === true`", () => {
    useAuthStateMock.mockReturnValue({
      isAuthenticated: true,
      setAuthenticated: vi.fn(),
    });
    setHookReturn({
      entries: [
        makeEntry({
          userId: "me",
          rank: 5,
          isCurrentUser: true,
          displayName: "Meee",
        }),
      ],
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    const selfRow = document.querySelector('[data-leaderboard-row="me"]');
    expect(selfRow).not.toBeNull();
    expect(selfRow).toHaveAttribute("aria-current", "true");
  });

  it("does NOT highlight when `isAuthenticated === false`", () => {
    setHookReturn({
      entries: [
        makeEntry({
          userId: "me",
          rank: 5,
          isCurrentUser: true,
          displayName: "Meee",
        }),
      ],
    });
    render(
      <TestQueryProvider>
        <LeaderboardPage />
      </TestQueryProvider>,
    );

    const selfRow = document.querySelector('[data-leaderboard-row="me"]');
    expect(selfRow).not.toBeNull();
    expect(selfRow).not.toHaveAttribute("aria-current");
  });
});
