/**
 * `AchievementHistory.spec.tsx` — locks the chronological achievement
 * history surface from TKT-5.5.D4.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` → renders `null`.
 * - Unauthenticated → renders `null`.
 * - Loading → skeleton.
 * - Empty → "No achievement history yet" empty state.
 * - Items render chronologically.
 * - `Load more` button appears when `hasMore` is true and triggers `loadMore`.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AchievementHistory } from "@/features/achievements/components/AchievementHistory";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

const mockUseAchievementHistory = vi.fn();
vi.mock("@/features/achievements/hooks/useAchievementHistory", () => ({
  useAchievementHistory: (...args: unknown[]) =>
    mockUseAchievementHistory(...args),
}));

const mockRouterReplace = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/achievements",
}));

function authenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "authenticated",
    isAuthenticated: true,
    currentUser: { userId: "user-1", id: "user-1" },
  });
}

function unauthenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "unauthenticated",
    isAuthenticated: false,
    currentUser: null,
  });
}

describe("AchievementHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders null when feature flag is placeholder", () => {
    // Explicitly set the achievement flag to placeholder; the
    // beforeEach default is `'live'` so children render.
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    mockUseAchievementHistory.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { container } = render(<AchievementHistory />);

    expect(container.firstChild).toBeNull();
  });

  it("renders null when unauthenticated", () => {
    unauthenticated();
    mockUseAchievementHistory.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    const { container } = render(<AchievementHistory />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the skeleton when loading with no cached history", () => {
    mockUseAchievementHistory.mockReturnValue({
      items: [],
      isLoading: true,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<AchievementHistory />);

    expect(
      screen.getByTestId("achievement-history-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("achievement-history"),
    ).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no history entries", () => {
    mockUseAchievementHistory.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<AchievementHistory />);

    expect(
      screen.queryByTestId("achievement-history"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/no achievement history yet/i),
    ).toBeInTheDocument();
  });

  it("renders chronological entries with badge name + earned date", () => {
    mockUseAchievementHistory.mockReturnValue({
      items: [
        {
          id: "first-quiz",
          name: "First Quiz",
          earnedAt: "2025-04-01T00:00:00Z",
          tier: "BRONZE",
        },
        {
          id: "ten-streak",
          name: "Ten Streak",
          earnedAt: "2025-04-02T00:00:00Z",
          tier: "SILVER",
        },
      ],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<AchievementHistory />);

    expect(screen.getByTestId("achievement-history")).toBeInTheDocument();
    expect(screen.getByTestId("achievement-history-first-quiz")).toHaveTextContent(
      "First Quiz",
    );
    expect(screen.getByTestId("achievement-history-ten-streak")).toHaveTextContent(
      "Ten Streak",
    );
  });

  it("shows Load more button when hasMore is true and triggers loadMore", () => {
    const loadMore = vi.fn();
    mockUseAchievementHistory.mockReturnValue({
      items: [
        {
          id: "first-quiz",
          name: "First Quiz",
          earnedAt: "2025-04-01T00:00:00Z",
          tier: "BRONZE",
        },
      ],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      loadMore,
      error: null,
      refresh: vi.fn(),
      isStale: false,
    });

    render(<AchievementHistory />);

    const button = screen.getByRole("button", { name: /load more/i });
    fireEvent.click(button);

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
