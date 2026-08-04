/**
 * `AchievementsPage.spec.tsx` — locks the F2 achievement surfaces
 * composition.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G2.
 *
 * Verifies:
 * - F2 AC #1 — placeholder view rendered when `phase5_achievements === 'placeholder'`.
 * - F2 AC #2 — catalog visible to all visitors (live composition mounts `<BadgeGallery />`).
 * - F2 AC #3 — earned-badge / history slots exist (their auth-gating
 *   is a property of the child components, not the page).
 * - F2 AC #4 — notification revalidation bridge is mounted when live.
 * - F2 AC #5 — focus revalidation bridge is mounted when live.
 * - F2 AC #6 — bridges are NOT mounted in the placeholder branch.
 *
 * The page composition is mocked at the child-component / hook
 * boundary to keep assertions focused on page-level orchestration.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { AchievementsPage } from "@/features/achievements/components/AchievementsPage";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock("@/features/achievements/components/BadgeGallery", () => ({
  BadgeGallery: () => <div data-testid="badge-gallery-stub" />,
}));
vi.mock("@/features/achievements/components/EarnedBadgeList", () => ({
  EarnedBadgeList: () => <div data-testid="earned-badge-list-stub" />,
}));
vi.mock("@/features/achievements/components/AchievementHistory", () => ({
  AchievementHistory: () => <div data-testid="achievement-history-stub" />,
}));
vi.mock("@/features/rankings/components/shared/Placeholder", () => ({
  AchievementsPlaceholder: () => (
    <div data-testid="achievements-placeholder-stub">coming soon</div>
  ),
}));

const mockUseAchievementNotificationRevalidation = vi.fn();
vi.mock("@/features/achievements/hooks/useAchievementNotificationRevalidation", () => ({
  useAchievementNotificationRevalidation: () =>
    mockUseAchievementNotificationRevalidation(),
}));

const mockUseAchievementFocusRevalidation = vi.fn();
vi.mock("@/features/achievements/hooks/useAchievementFocusRevalidation", () => ({
  useAchievementFocusRevalidation: () =>
    mockUseAchievementFocusRevalidation(),
}));

describe("AchievementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the placeholder view when the achievement surface flag is off", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    render(<AchievementsPage />);

    expect(
      screen.getByTestId("achievements-page-placeholder"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("achievements-placeholder-stub"),
    ).toBeInTheDocument();
    // Live-mode children must not mount.
    expect(screen.queryByTestId("badge-gallery-stub")).not.toBeInTheDocument();
    // Bridges must NOT mount in placeholder branch.
    expect(mockUseAchievementNotificationRevalidation).not.toHaveBeenCalled();
    expect(mockUseAchievementFocusRevalidation).not.toHaveBeenCalled();
  });

  it("renders the live composition when the achievement surface flag is live", () => {
    mockGetFeatureFlagValue.mockReturnValue("live");

    render(<AchievementsPage />);

    expect(screen.getByTestId("achievements-page")).toBeInTheDocument();
    expect(screen.getByTestId("badge-gallery-stub")).toBeInTheDocument();
    expect(screen.getByTestId("earned-badge-list-stub")).toBeInTheDocument();
    expect(screen.getByTestId("achievement-history-stub")).toBeInTheDocument();
  });

  it("mounts both revalidation bridges when the flag is live", () => {
    mockGetFeatureFlagValue.mockReturnValue("live");

    render(<AchievementsPage />);

    expect(mockUseAchievementNotificationRevalidation).toHaveBeenCalledTimes(1);
    expect(mockUseAchievementFocusRevalidation).toHaveBeenCalledTimes(1);
  });
});
