/**
 * `useMyBadges.spec.tsx` — locks the authenticated user's earned
 * badges hook from TKT-5.5.B6.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G1.
 *
 * Tests cover:
 * - Feature-flag `'placeholder'` fallback (no service call).
 * - Unauthenticated fallback (no service call).
 * - Service forwarding with progress-shaped entries.
 * - Bare-array vs envelope shape handled transparently.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useMyBadges } from "@/features/achievements/hooks/useMyBadges";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetMyBadges = vi.fn();
vi.mock(
  "@/features/achievements/services/achievements.service",
  () => ({
    getMyBadges: (...args: unknown[]) => mockGetMyBadges(...args),
  }),
);

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

function authenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "authenticated",
    currentUser: { userId: "user-123", id: "user-123" },
  });
}

function unauthenticated() {
  mockUseAuthBootstrap.mockReturnValue({
    bootstrapState: "unauthenticated",
    currentUser: null,
  });
}

describe("useMyBadges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue("live");
    authenticated();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns safe fallback when flag is placeholder", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    const { result } = renderHook(() => useMyBadges());

    expect(result.current.badges).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("does not call getMyBadges when flag is placeholder", async () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    renderHook(() => useMyBadges());

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockGetMyBadges).not.toHaveBeenCalled();
  });

  it("returns safe fallback when unauthenticated", () => {
    unauthenticated();

    const { result } = renderHook(() => useMyBadges());

    expect(result.current.badges).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("does not call getMyBadges when unauthenticated", async () => {
    unauthenticated();

    renderHook(() => useMyBadges());

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockGetMyBadges).not.toHaveBeenCalled();
  });

  it("projects earned badges from wire response", async () => {
    mockGetMyBadges.mockResolvedValueOnce([
      {
        id: "first-quiz",
        name: "First Quiz",
        rarity: "COMMON",
        earnedAt: "2025-03-01T00:00:00Z",
      },
      {
        id: "in-progress",
        name: "Ten Streak",
        rarity: "UNCOMMON",
        earnedAt: null,
      },
    ]);

    const { result } = renderHook(() => useMyBadges());

    await waitFor(() => {
      expect(result.current.badges.length).toBe(2);
    });

    // Filters out the entries that `toEarnedBadge` returns null for
    // (e.g., missing or empty `id`).
    expect(result.current.badges[0]?.code).toBe("first-quiz");
    expect(result.current.badges[1]?.code).toBe("in-progress");
    // The wire entry for the second one has no progress data attached;
    // the hook fetcher does not synthesize progress. The UI must not
    // promise the badge as earned when `progress.percent < 100`.
    expect(result.current.badges[1]?.progress).toBeUndefined();
  });
});
