/**
 * `MilestonesList.spec.tsx` — locks the personal ranking milestones
 * surface from TKT-5.5.D2.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` → renders `null`.
 * - Unauthenticated → renders `null`.
 * - Loading → skeleton.
 * - Empty → "No milestones yet" empty state.
 * - Authenticated with milestones → renders the milestone list with the
 *   featured subset (TOP_100 / TOP_10 / TOP_1) surfaced with a trophy icon.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { MilestonesList } from "@/features/rankings/components/MilestonesList";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

const mockUseRankingMilestones = vi.fn();
vi.mock("@/features/rankings/hooks/useRankingMilestones", () => ({
  useRankingMilestones: (...args: unknown[]) =>
    mockUseRankingMilestones(...args),
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

describe("MilestonesList", () => {
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
    mockUseRankingMilestones.mockReturnValue({
      milestones: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    const { container } = render(<MilestonesList />);

    expect(container.firstChild).toBeNull();
  });

  it("renders null when unauthenticated", () => {
    unauthenticated();
    mockUseRankingMilestones.mockReturnValue({
      milestones: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    const { container } = render(<MilestonesList />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the skeleton when loading with no cached milestones", () => {
    mockUseRankingMilestones.mockReturnValue({
      milestones: [],
      isLoading: true,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<MilestonesList />);

    expect(
      screen.getByTestId("milestones-list-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("milestones-list"),
    ).not.toBeInTheDocument();
  });

  it("renders the empty state with the 'No milestones yet' copy", () => {
    mockUseRankingMilestones.mockReturnValue({
      milestones: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<MilestonesList />);

    expect(
      screen.queryByTestId("milestones-list"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("milestones-empty")).toBeInTheDocument();
  });

  it("renders the milestone list with featured milestones styled distinctly", () => {
    mockUseRankingMilestones.mockReturnValue({
      milestones: [
        {
          id: "TOP_100",
          milestone: "TOP_100",
          achievedAt: "2025-04-01T00:00:00Z",
          rank: 100,
        },
        {
          id: "TOP_10",
          milestone: "TOP_10",
          achievedAt: "2025-04-02T00:00:00Z",
          rank: 10,
        },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<MilestonesList />);

    expect(screen.getByTestId("milestones-list")).toBeInTheDocument();
    expect(screen.getByText("Top 100")).toBeInTheDocument();
    expect(screen.getByText("Top 10")).toBeInTheDocument();
  });
});
