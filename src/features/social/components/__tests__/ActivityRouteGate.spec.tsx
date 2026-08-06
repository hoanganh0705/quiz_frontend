/**
 * `ActivityRouteGate.spec.tsx` — Locks the gate / placeholder
 * behaviour for the Story 6.4 activity route.
 *
 * Source epic:   Epic 6.4.
 * Source tickets: TKT-6.4.G2 (route scaffold), TKT-6.4.G3
 *                 (live-branch wiring).
 *
 * Asserts:
 *
 *   - `phase6_social_activity === 'placeholder'` → renders
 *     `<SocialActivityPlaceholder />`.
 *   - `phase6_social === 'placeholder'` → also renders the
 *     placeholder (the parent flag is the second short-circuit).
 *   - `phase6_social === 'live'` + `phase6_social_activity === 'live'`
 *     → renders `<UserActivityStream />` (TKT-6.4.F1 / TKT-6.4.G3).
 *   - Unauthenticated viewer → `PrivacyRestrictedNotice` with the
 *     `not_available` variant (defensive branch; the authoritative
 *     redirect lives in `proxy.ts`).
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityRouteGate } from "@/features/social/components/ActivityRouteGate";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthState = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-state", () => ({
  useAuthState: () => mockUseAuthState(),
}));

// The live branch renders `<UserActivityStream />`, which depends on
// `useUserActivity` and `useSocialListVisibility`. We mock the chain
// here so the gate's "live" branch can be asserted without dragging
// the rest of the social-feature surface into the test.
const mockUseUserActivity = vi.fn();
const mockUseSocialListVisibility = vi.fn();

vi.mock("@/features/social/hooks/useUserActivity", () => ({
  useUserActivity: (...args: unknown[]) => mockUseUserActivity(...args),
}));
vi.mock("@/features/social/hooks/useSocialListVisibility", () => ({
  useSocialListVisibility: (...args: unknown[]) =>
    mockUseSocialListVisibility(...args),
}));

describe("ActivityRouteGate", () => {
  beforeEach(() => {
    mockGetFeatureFlagValue.mockReset();
    mockUseAuthState.mockReset();
    mockUseUserActivity.mockReset();
    mockUseSocialListVisibility.mockReset();

    mockUseAuthState.mockReturnValue({ isAuthenticated: true });
    mockUseSocialListVisibility.mockReturnValue({
      canViewFriends: true,
      canViewCounts: true,
      isOwner: false,
      isMutualFriend: false,
      isAuthenticated: true,
      isPrivateProfile: false,
    });
    mockUseUserActivity.mockReturnValue({
      items: [],
      total: 0,
      visibility: "visible",
      isLoading: false,
      isStale: false,
      staleness: "fresh",
      error: null,
      loadMore: () => undefined,
      hasMore: false,
      retry: () => Promise.resolve(),
      rateLimitedUntil: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the placeholder for `phase6_social_activity === 'placeholder'`", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) => {
      if (flag === "phase6_social") return "live";
      if (flag === "phase6_social_activity") return "placeholder";
      return "live";
    });
    render(
      <ActivityRouteGate targetUserId="11111111-1111-1111-1111-111111111111" />,
    );
    expect(screen.getByTestId("social-activity-placeholder")).toBeInTheDocument();
  });

  it("renders the placeholder for `phase6_social === 'placeholder'`", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) => {
      if (flag === "phase6_social") return "placeholder";
      if (flag === "phase6_social_activity") return "live";
      return "live";
    });
    render(
      <ActivityRouteGate targetUserId="11111111-1111-1111-1111-111111111111" />,
    );
    expect(screen.getByTestId("social-activity-placeholder")).toBeInTheDocument();
  });

  it("renders the live UserActivityStream when both flags are 'live' (TKT-6.4.G3)", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    render(
      <ActivityRouteGate targetUserId="11111111-1111-1111-1111-111111111111" />,
    );
    expect(screen.getByTestId("user-activity-stream")).toBeInTheDocument();
  });

  it("renders the privacy notice for unauthenticated viewer", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    mockUseAuthState.mockReturnValue({ isAuthenticated: false });
    render(
      <ActivityRouteGate targetUserId="11111111-1111-1111-1111-111111111111" />,
    );
    expect(
      screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("privacy-restricted-notice-not_available").getAttribute(
        "data-resource-kind",
      ),
    ).toBe("activity");
  });
});