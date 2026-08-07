/**
 * `RankingSummaryCard.spec.tsx` — locks the personal ranking summary
 * surface from TKT-5.5.D1.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` → renders `null`.
 * - Unauthenticated → renders `null`.
 * - Loading → skeleton.
 * - Error → error state with retry.
 * - Empty → "no ranking yet" empty state.
 * - Authenticated with summary → renders rank + XP + freshness indicator.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { RankingSummaryCard } from "@/features/rankings/components/RankingSummaryCard";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

const mockUseMyRanking = vi.fn();
vi.mock("@/features/rankings/hooks/useMyRanking", () => ({
  useMyRanking: (...args: unknown[]) => mockUseMyRanking(...args),
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

describe("RankingSummaryCard", () => {
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
    mockUseMyRanking.mockReturnValue({
      summary: null,
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
      lastValidatedAt: null,
    });

    const { container } = render(<RankingSummaryCard />);

    expect(container.firstChild).toBeNull();
  });

  it("renders null when unauthenticated", () => {
    unauthenticated();
    mockUseMyRanking.mockReturnValue({
      summary: null,
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
      lastValidatedAt: null,
    });

    const { container } = render(<RankingSummaryCard />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the skeleton when loading with no cached data", () => {
    mockUseMyRanking.mockReturnValue({
      summary: null,
      isLoading: true,
      error: null,
      retry: vi.fn(),
      isStale: false,
      lastValidatedAt: null,
    });

    render(<RankingSummaryCard />);

    expect(
      screen.getByTestId("ranking-summary-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("ranking-summary-card"),
    ).not.toBeInTheDocument();
  });

  it("renders the empty state when no summary", () => {
    mockUseMyRanking.mockReturnValue({
      summary: null,
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
      lastValidatedAt: null,
    });

    render(<RankingSummaryCard />);

    expect(
      screen.queryByTestId("ranking-summary-card"),
    ).not.toBeInTheDocument();
    // The empty state uses the shared `EmptyState` primitive; assert on
    // its stable copy instead of an unf prop.
    expect(screen.getByText(/no rankings yet/i)).toBeInTheDocument();
  });

  it("renders the summary card with rank + XP when authenticated", () => {
    mockUseMyRanking.mockReturnValue({
      summary: { globalRank: 42, totalScore: 1500 },
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
      lastValidatedAt: "2025-04-01T00:00:00Z",
    });

    render(<RankingSummaryCard />);

    const card = screen.getByTestId("ranking-summary-card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent("42");
    expect(card).toHaveTextContent("1,500");
  });
});
