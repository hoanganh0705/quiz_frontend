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
 *   - `social_activity_live === 'placeholder'` → renders
 *     `<SocialActivityPlaceholder />`.
 *   - `social_live === 'placeholder'` → also renders the
 *     placeholder (the parent flag is the second short-circuit).
 *   - `social_live === 'live'` + `social_activity_live === 'live'`
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

const OTHER_USER_ID = "11111111-1111-1111-1111-111111111111";

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

  it("renders the placeholder for `social_activity_live === 'placeholder'`", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) => {
      if (flag === "social_live") return "live";
      if (flag === "social_activity_live") return "placeholder";
      return "live";
    });
    render(
      <ActivityRouteGate targetUserId="11111111-1111-1111-1111-111111111111" />,
    );
    expect(screen.getByTestId("social-activity-placeholder")).toBeInTheDocument();
  });

  it("renders the placeholder for `social_live === 'placeholder'`", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) => {
      if (flag === "social_live") return "placeholder";
      if (flag === "social_activity_live") return "live";
      return "live";
    });
    render(
      <ActivityRouteGate targetUserId="11111111-1111-1111-1111-111111111111" />,
    );
    expect(screen.getByTestId("social-activity-placeholder")).toBeInTheDocument();
  });

  it("renders the live UserActivityStream when both flags are 'live' (TKT-6.4.G3)", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    // The live branch renders `<UserActivityStream>`, which only
    // emits the `data-testid="user-activity-stream"` wrapper when
    // `items.length > 0`. Pre-populate one item so the assertion
    // can target the wrapper rather than the empty state.
    mockUseUserActivity.mockReturnValue({
      items: [
        {
          id: "act-1",
          kind: "quiz_authored",
          actorUser: {
            userId: OTHER_USER_ID,
            username: "otheruser",
            displayName: "Other User",
            avatarUrl: null,
          },
          occurredAt: new Date().toISOString(),
          payload: {
            quizId: "00000000-0000-0000-0000-000000000001",
            quizTitle: "A quiz",
          },
        },
      ],
      total: 1,
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