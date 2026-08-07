/**
 * `RankingHistory.spec.tsx` — locks the chronological ranking history
 * list from TKT-5.5.D1.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` → renders `null`.
 * - Unauthenticated → renders `null`.
 * - Loading → skeleton.
 * - Empty → "no history" empty state.
 * - Authenticated with items → renders chronological list.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { RankingHistory } from "@/features/rankings/components/RankingHistory";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

const mockUseRankingHistory = vi.fn();
vi.mock("@/features/rankings/hooks/useRankingHistory", () => ({
  useRankingHistory: (...args: unknown[]) => mockUseRankingHistory(...args),
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

describe("RankingHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders null when feature flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    mockUseRankingHistory.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    const { container } = render(<RankingHistory />);

    expect(container.firstChild).toBeNull();
  });

  it("renders null when unauthenticated", () => {
    unauthenticated();
    mockUseRankingHistory.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    const { container } = render(<RankingHistory />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the skeleton when loading with no cached items", () => {
    mockUseRankingHistory.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<RankingHistory />);

    expect(
      screen.getByTestId("ranking-history-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("ranking-history"),
    ).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no history entries", () => {
    mockUseRankingHistory.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<RankingHistory />);

    expect(
      screen.queryByTestId("ranking-history"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/no ranking history yet/i),
    ).toBeInTheDocument();
  });

  it("renders the chronological list with rank snapshot entries", () => {
    mockUseRankingHistory.mockReturnValue({
      items: [
        { id: "2025-04-01", date: "2025-04-01", rank: 42 },
        { id: "2025-04-02", date: "2025-04-02", rank: 30 },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<RankingHistory />);

    const section = screen.getByTestId("ranking-history");
    expect(section).toBeInTheDocument();

    const list = screen.getByRole("list", { name: /daily rank snapshots/i });
    expect(list).toBeInTheDocument();
    expect(list.children.length).toBe(2);
  });
});
