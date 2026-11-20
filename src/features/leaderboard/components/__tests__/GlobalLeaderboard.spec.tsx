import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useLeaderboard } from "@/features/leaderboard/hooks/useLeaderboard";

import GlobalLeaderboard from "@/features/leaderboard/components/GlobalLeaderboard";

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
    useAuthState: vi.fn(() => ({
      isAuthenticated: false,
      setAuthenticated: vi.fn(),
    })),
  };
});

const useLeaderboardMock = vi.mocked(useLeaderboard);

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

describe("GlobalLeaderboard — delegation", () => {
  it("renders the LeaderboardPage composition", async () => {
    useLeaderboardMock.mockReturnValue({
      entries: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
    });

    render(
      <TestQueryProvider>
        <GlobalLeaderboard />
      </TestQueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Global leaderboard")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monthly" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "All-time" }),
    ).toBeInTheDocument();
  });

  it("does NOT import the legacy `players` mock-data module", async () => {
    useLeaderboardMock.mockReturnValue({
      entries: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
    });

    render(
      <TestQueryProvider>
        <GlobalLeaderboard />
      </TestQueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("leaderboard-empty-state")).toBeInTheDocument();
    });
  });
});
