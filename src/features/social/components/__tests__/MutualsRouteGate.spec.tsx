/**
 * `MutualsRouteGate.spec.tsx` — Locks the gate / placeholder
 * behaviour for the Story 6.4 mutual routes.
 *
 * Source epic:   Epic 6.4.
 * Source tickets: TKT-6.4.G1 (route scaffolds), TKT-6.4.G3
 *                 (live-branch wiring).
 *
 * Asserts:
 *
 *   - `phase6_social_mutuals === 'placeholder'` → renders the
 *     `<SocialMutualsPlaceholder>` for every kind.
 *   - `phase6_social === 'placeholder'` → also renders the
 *     placeholder (the parent flag is the second short-circuit).
 *   - `phase6_social === 'live'` + `phase6_social_mutuals === 'live'`
 *     → renders the live list component (the live branch lands in
 *     TKT-6.4.G3).
 *   - Unauthenticated viewer → `PrivacyRestrictedNotice` with the
 *     `not_available` variant (defensive branch; the authoritative
 *     redirect lives in `proxy.ts`).
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MutualsRouteGate } from "@/features/social/components/MutualsRouteGate";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthState = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-state", () => ({
  useAuthState: () => mockUseAuthState(),
}));

// The live branch renders the mutual list components (MutualFriendsList,
// MutualFollowersList). Those components depend on `useMutualFriends`,
// `useMutualFollowers`, and (for privacy) `useSocialListVisibility`.
// We mock the entire chain here so the gate's "live" branch can be
// asserted without dragging the rest of the social-feature surface
// into the test.
const mockUseMutualFriends = vi.fn();
const mockUseMutualFollowers = vi.fn();
const mockUseSocialListVisibility = vi.fn();

vi.mock("@/features/social/hooks/useMutualFriends", () => ({
  useMutualFriends: (...args: unknown[]) => mockUseMutualFriends(...args),
}));
vi.mock("@/features/social/hooks/useMutualFollowers", () => ({
  useMutualFollowers: (...args: unknown[]) => mockUseMutualFollowers(...args),
}));
vi.mock("@/features/social/hooks/useSocialListVisibility", () => ({
  useSocialListVisibility: (...args: unknown[]) =>
    mockUseSocialListVisibility(...args),
}));

describe("MutualsRouteGate", () => {
  beforeEach(() => {
    mockGetFeatureFlagValue.mockReset();
    mockUseAuthState.mockReset();
    mockUseMutualFriends.mockReset();
    mockUseMutualFollowers.mockReset();
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
    const emptyResult = {
      items: [],
      total: 0,
      visibility: "visible" as const,
      isLoading: false,
      isStale: false,
      hasMore: false,
      loadMore: () => undefined,
      error: null,
      retry: () => Promise.resolve(),
    };
    mockUseMutualFriends.mockReturnValue(emptyResult);
    mockUseMutualFollowers.mockReturnValue(emptyResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the placeholder for `phase6_social_mutuals === 'placeholder'`", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) => {
      if (flag === "phase6_social") return "live";
      if (flag === "phase6_social_mutuals") return "placeholder";
      return "live";
    });
    render(
      <MutualsRouteGate
        kind="friends"
        targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );
    expect(
      screen.getByTestId("social-mutuals-placeholder-friends"),
    ).toBeInTheDocument();
  });

  it("renders the placeholder for `phase6_social === 'placeholder'`", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) => {
      if (flag === "phase6_social") return "placeholder";
      if (flag === "phase6_social_mutuals") return "live";
      return "live";
    });
    render(
      <MutualsRouteGate
        kind="followers"
        targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );
    expect(
      screen.getByTestId("social-mutuals-placeholder-followers"),
    ).toBeInTheDocument();
  });

  it("renders the live MutualFriendsList when both flags are 'live' (TKT-6.4.G3)", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    render(
      <MutualsRouteGate
        kind="friends"
        targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );
    expect(
      screen.getByTestId("mutual-friends-list"),
    ).toBeInTheDocument();
  });

  it("renders the live MutualFollowersList when both flags are 'live' (TKT-6.4.G3)", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    render(
      <MutualsRouteGate
        kind="followers"
        targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );
    expect(
      screen.getByTestId("mutual-followers-list"),
    ).toBeInTheDocument();
  });

  it("renders the privacy notice for unauthenticated viewer (mutual-friends)", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    mockUseAuthState.mockReturnValue({ isAuthenticated: false });
    render(
      <MutualsRouteGate
        kind="friends"
        targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );
    expect(
      screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("privacy-restricted-notice-not_available").getAttribute(
        "data-resource-kind",
      ),
    ).toBe("mutual-friends");
  });

  it("renders the privacy notice for unauthenticated viewer (mutual-followers)", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    mockUseAuthState.mockReturnValue({ isAuthenticated: false });
    render(
      <MutualsRouteGate
        kind="followers"
        targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );
    expect(
      screen.getByTestId("privacy-restricted-notice-not_available").getAttribute(
        "data-resource-kind",
      ),
    ).toBe("mutual-followers");
  });
});