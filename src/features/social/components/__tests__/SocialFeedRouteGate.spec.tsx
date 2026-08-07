/**
 * `SocialFeedRouteGate.spec.tsx` — Locks the gate / placeholder
 * behaviour for the Story 6.9 global feed route (TKT-6.9.G1).
 *
 * Asserts:
 *
 *   - `phase6_social_feed === 'placeholder'` → renders
 *     `<SocialFeedPlaceholder />`.
 *   - `phase6_social === 'placeholder'` → also renders the
 *     placeholder (the parent flag is the first short-circuit).
 *   - `phase6_social === 'live'` + `phase6_social_feed === 'live'`
 *     + authenticated viewer → renders `<SocialFeedPage />` (live
 *     branch).
 *   - Unauthenticated viewer → `PrivacyRestrictedNotice` with the
 *     `not_available` variant (defensive branch; the authoritative
 *     redirect lives in `proxy.ts`).
 *   - Unauthenticated viewer is NOT gated by the placeholder branch
 *     (the placeholder is informational and is not surfaced when
 *     both flags are `'live'`).
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SocialFeedRouteGate } from "@/features/social/components/SocialFeedRouteGate";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) =>
    mockGetFeatureFlagValue(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthBootstrap(),
}));

// The live branch renders `<SocialFeedPage />`, which depends on
// `useFeed` and `useSocialListLifecycleReset`. We mock the chain here
// so the gate's "live" branch can be asserted without dragging the
// rest of the social-feature surface into the test.
const mockUseFeed = vi.fn();
const mockUseSocialListLifecycleReset = vi.fn();
const mockUseRelationship = vi.fn();

vi.mock("@/features/social/hooks/useFeed", () => ({
  useFeed: (...args: unknown[]) => mockUseFeed(...args),
}));
vi.mock("@/features/social/hooks/useSocialListLifecycleReset", () => ({
  useSocialListLifecycleReset: (
    ...args: ReadonlyArray<unknown>
  ) => mockUseSocialListLifecycleReset(...args),
}));
vi.mock("@/features/social/hooks/useRelationship", () => ({
  useRelationship: (...args: unknown[]) => mockUseRelationship(...args),
}));

describe("SocialFeedRouteGate", () => {
  beforeEach(() => {
    mockGetFeatureFlagValue.mockReset();
    mockUseAuthBootstrap.mockReset();
    mockUseFeed.mockReset();
    mockUseSocialListLifecycleReset.mockReset();
    mockUseRelationship.mockReset();

    mockUseAuthBootstrap.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      currentUser: { userId: "viewer-1" },
    });
    mockUseRelationship.mockReturnValue({
      relationship: "none",
      isLoading: false,
      isStale: false,
      error: null,
      retry: () => Promise.resolve(),
      isAuthenticated: true,
    });
    mockUseFeed.mockReturnValue({
      items: [],
      hasMore: false,
      loadMore: () => undefined,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      refresh: () => Promise.resolve(),
      staleness: "fresh",
      visibility: "visible",
      rateLimitedUntil: null,
      cooldownSeconds: undefined,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the placeholder for `phase6_social_feed === 'placeholder'`", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) => {
      if (flag === "phase6_social") return "live";
      if (flag === "phase6_social_feed") return "placeholder";
      return "live";
    });
    render(<SocialFeedRouteGate />);
    expect(
      screen.getByTestId("social-feed-placeholder"),
    ).toBeInTheDocument();
  });

  it("renders the placeholder for `phase6_social === 'placeholder'`", () => {
    mockGetFeatureFlagValue.mockImplementation((flag: string) => {
      if (flag === "phase6_social") return "placeholder";
      if (flag === "phase6_social_feed") return "live";
      return "live";
    });
    render(<SocialFeedRouteGate />);
    expect(
      screen.getByTestId("social-feed-placeholder"),
    ).toBeInTheDocument();
  });

  it("renders the live SocialFeedPage when both flags are 'live' (TKT-6.9.G1)", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    render(<SocialFeedRouteGate />);
    // The page mounts and renders one of its branches. The empty
    // branch is the safest assertion because the hook mock returns
    // an empty visible list.
    expect(
      screen.getByTestId("social-feed-page-empty"),
    ).toBeInTheDocument();
  });

  it("renders the privacy notice for unauthenticated viewer", () => {
    mockGetFeatureFlagValue.mockImplementation(() => "live");
    mockUseAuthBootstrap.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
      currentUser: null,
    });
    render(<SocialFeedRouteGate />);
    expect(
      screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId("privacy-restricted-notice-not_available")
        .getAttribute("data-resource-kind"),
    ).toBe("feed");
  });
});
