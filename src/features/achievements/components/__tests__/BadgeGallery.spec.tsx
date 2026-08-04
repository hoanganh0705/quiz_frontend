/**
 * `BadgeGallery.spec.tsx` — locks the badge catalog gallery surface
 * from TKT-5.5.D3.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` → renders `null`.
 * - Loading → skeleton.
 * - Empty → "No badges available" empty state.
 * - Items are grouped by tier and rendered.
 * - Tier chip click writes to URL query state.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { BadgeGallery } from "@/features/achievements/components/BadgeGallery";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseBadges = vi.fn();
vi.mock("@/features/achievements/hooks/useBadges", () => ({
  useBadges: (...args: unknown[]) => mockUseBadges(...args),
}));

const mockRouterReplace = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/achievements",
}));

function seedSearchParams(initial?: { tier?: string; category?: string }) {
  mockSearchParams.delete("tier");
  mockSearchParams.delete("category");
  if (initial?.tier) mockSearchParams.set("tier", initial.tier);
  if (initial?.category) mockSearchParams.set("category", initial.category);
}

describe("BadgeGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    mockUseBadges.mockReturnValue({
      badges: [],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders null when feature flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    const { container } = render(<BadgeGallery />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the skeleton when loading with no cached badges", () => {
    mockSearchParams.delete("tier");
    mockUseBadges.mockReturnValue({
      badges: [],
      isLoading: true,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<BadgeGallery />);

    expect(
      screen.getByTestId("badge-gallery-skeleton"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("badge-gallery")).not.toBeInTheDocument();
  });

  it("renders the empty state when the catalog has no badges", () => {
    seedSearchParams();

    render(<BadgeGallery />);

    expect(screen.queryByTestId("badge-gallery")).not.toBeInTheDocument();
    expect(screen.getByText(/no badges available/i)).toBeInTheDocument();
  });

  it("groups badges by tier and renders a section per non-empty tier", () => {
    seedSearchParams();
    mockUseBadges.mockReturnValue({
      badges: [
        {
          id: "first-quiz",
          code: "first-quiz",
          name: "First Quiz",
          description: "Completed your first quiz.",
          tier: "BRONZE",
          totalEarned: 1234,
        },
        {
          id: "weekly-winner",
          code: "weekly-winner",
          name: "Weekly Winner",
          description: "Top of the weekly leaderboard.",
          tier: "GOLD",
          totalEarned: 100,
        },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<BadgeGallery />);

    expect(screen.getByTestId("badge-gallery")).toBeInTheDocument();
    // The tier chip and the section header both contain the tier name;
    // we assert on the section header (h2) to lock the grouping.
    expect(
      screen.getByRole("heading", { name: /bronze/i, level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /gold/i, level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText("First Quiz")).toBeInTheDocument();
    expect(screen.getByText("Weekly Winner")).toBeInTheDocument();
  });

  it("writes the tier filter to the URL when a tier chip is clicked", () => {
    seedSearchParams();
    mockUseBadges.mockReturnValue({
      badges: [
        {
          id: "weekly-winner",
          code: "weekly-winner",
          name: "Weekly Winner",
          description: "Top of the weekly leaderboard.",
          tier: "GOLD",
          totalEarned: 100,
        },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<BadgeGallery />);

    fireEvent.click(screen.getByTestId("badge-tier-chip-gold"));

    expect(mockRouterReplace).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/achievements?tier=GOLD",
      { scroll: false },
    );
  });

  it("filters badges by tier when a tier query is present", () => {
    seedSearchParams({ tier: "GOLD" });
    mockUseBadges.mockReturnValue({
      badges: [
        {
          id: "first-quiz",
          code: "first-quiz",
          name: "First Quiz",
          description: "Completed your first quiz.",
          tier: "BRONZE",
          totalEarned: 1234,
        },
        {
          id: "weekly-winner",
          code: "weekly-winner",
          name: "Weekly Winner",
          description: "Top of the weekly leaderboard.",
          tier: "GOLD",
          totalEarned: 100,
        },
      ],
      isLoading: false,
      error: null,
      retry: vi.fn(),
      isStale: false,
    });

    render(<BadgeGallery />);

    // Bronze tier header must not appear because the URL filters to GOLD.
    expect(
      screen.queryByTestId("badge-tier-chip-bronze"),
    ).not.toHaveAttribute("aria-pressed", "true");
    // The Gold chip should be active.
    expect(
      screen.getByTestId("badge-tier-chip-gold"),
    ).toHaveAttribute("aria-pressed", "true");
    // Only the Gold badge is rendered.
    expect(screen.getByText("Weekly Winner")).toBeInTheDocument();
    expect(screen.queryByText("First Quiz")).not.toBeInTheDocument();
  });
});
