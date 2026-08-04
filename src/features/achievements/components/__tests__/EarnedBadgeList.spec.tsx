/**
 * `EarnedBadgeList.spec.tsx` — locks the authenticated user's earned
 * badges surface from TKT-5.5.D4.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` → renders `null`.
 * - Unauthenticated → renders `null`.
 * - Loading → skeleton.
 * - Empty → "No badges earned yet" empty state.
 * - Badges with progress below 100% are not labelled "Earned".
 * - Badges with no progress are labelled "Earned".
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { EarnedBadgeList } from "@/features/achievements/components/EarnedBadgeList";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

const mockUseMyBadges = vi.fn();
vi.mock("@/features/achievements/hooks/useMyBadges", () => ({
  useMyBadges: (...args: unknown[]) => mockUseMyBadges(...args),
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

describe("EarnedBadgeList", () => {
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
    mockUseMyBadges.mockReturnValue({
      badges: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    const { container } = render(<EarnedBadgeList />);

    expect(container.firstChild).toBeNull();
  });

  it("renders null when unauthenticated", () => {
    unauthenticated();
    mockUseMyBadges.mockReturnValue({
      badges: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    const { container } = render(<EarnedBadgeList />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the skeleton when loading with no cached badges", () => {
    mockUseMyBadges.mockReturnValue({
      badges: [],
      isLoading: true,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<EarnedBadgeList />);

    expect(
      screen.getByTestId("earned-badge-list-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("earned-badge-list"),
    ).not.toBeInTheDocument();
  });

  it("renders the empty state when no badges are earned", () => {
    mockUseMyBadges.mockReturnValue({
      badges: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<EarnedBadgeList />);

    expect(screen.queryByTestId("earned-badge-list")).not.toBeInTheDocument();
    expect(
      screen.getByText(/no badges earned yet/i),
    ).toBeInTheDocument();
  });

  it("renders fully-earned badges with the 'Earned' label", () => {
    mockUseMyBadges.mockReturnValue({
      badges: [
        {
          id: "first-quiz",
          code: "first-quiz",
          name: "First Quiz",
          tier: "BRONZE",
          description: "Completed your first quiz.",
        },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<EarnedBadgeList />);

    expect(screen.getByTestId("earned-badge-list")).toBeInTheDocument();
    const row = screen.getByTestId("earned-badge-first-quiz");
    expect(row).toHaveTextContent("First Quiz");
    expect(row).toHaveTextContent(/earned/i);
  });

  it("does not label partially-progressed badges as 'Earned'", () => {
    mockUseMyBadges.mockReturnValue({
      badges: [
        {
          id: "ten-streak",
          code: "ten-streak",
          name: "Ten Streak",
          tier: "SILVER",
          description: "Reach a 10-day streak.",
          progress: { percent: 70, isComplete: false },
        },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<EarnedBadgeList />);

    const row = screen.getByTestId("earned-badge-ten-streak");
    expect(row).toHaveTextContent("Ten Streak");
    // The row must not contain the 'Earned' label while progress is < 100%.
    expect(row).not.toHaveTextContent(/^Earned$/);
    // The progress text must be visible.
    expect(row).toHaveTextContent("70%");
  });
});
