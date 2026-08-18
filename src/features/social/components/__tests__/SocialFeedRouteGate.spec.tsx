

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

it("renders the placeholder for `social_feed_live === 'placeholder'`", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "live";
if (flag === "social_feed_live") return "placeholder";
return "live";
    });
render(<SocialFeedRouteGate />);
expect(
screen.getByTestId("social-feed-placeholder"),
    ).toBeInTheDocument();
  });

it("renders the placeholder for `social_live === 'placeholder'`", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "placeholder";
if (flag === "social_feed_live") return "live";
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
