

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SocialListRouteGate } from "@/features/social/components/SocialListRouteGate";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseAuthState = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-state", () => ({
useAuthState: () => mockUseAuthState(),
}));

const mockUseFollowers = vi.fn();
const mockUseFollowing = vi.fn();
const mockUseFriends = vi.fn();
const mockUseBlockedUsers = vi.fn();
const mockUseSocialListUrlState = vi.fn();
const mockUseSocialListLifecycleReset = vi.fn();
const mockUseSocialListVisibility = vi.fn();
const mockUseSocialCountsBadge = vi.fn();

vi.mock("@/features/social/hooks/useFollowers", () => ({
useFollowers: (...args: unknown[]) => mockUseFollowers(...args),
}));
vi.mock("@/features/social/hooks/useFollowing", () => ({
useFollowing: (...args: unknown[]) => mockUseFollowing(...args),
}));
vi.mock("@/features/social/hooks/useFriends", () => ({
useFriends: (...args: unknown[]) => mockUseFriends(...args),
}));
vi.mock("@/features/social/hooks/useBlockedUsers", () => ({
useBlockedUsers: (...args: unknown[]) => mockUseBlockedUsers(...args),
}));
vi.mock("@/features/social/hooks/useSocialListUrlState", () => ({
useSocialListUrlState: (...args: unknown[]) =>
mockUseSocialListUrlState(...args),
}));
vi.mock("@/features/social/hooks/useSocialListLifecycleReset", () => ({
useSocialListLifecycleReset: (...args: unknown[]) =>
mockUseSocialListLifecycleReset(...args),
}));
vi.mock("@/features/social/hooks/useSocialListVisibility", () => ({
useSocialListVisibility: (...args: unknown[]) =>
mockUseSocialListVisibility(...args),
}));
vi.mock("@/features/social/hooks/useSocialCountsBadge", () => ({
useSocialCountsBadge: (...args: unknown[]) => mockUseSocialCountsBadge(...args),
}));

describe("SocialListRouteGate", () => {
beforeEach(() => {
mockGetFeatureFlagValue.mockReset();
mockUseAuthState.mockReset();
mockUseFollowers.mockReset();
mockUseFollowing.mockReset();
mockUseFriends.mockReset();
mockUseBlockedUsers.mockReset();
mockUseSocialListUrlState.mockReset();
mockUseSocialListLifecycleReset.mockReset();
mockUseSocialListVisibility.mockReset();
mockUseSocialCountsBadge.mockReset();

mockUseAuthState.mockReturnValue({ isAuthenticated: true });
mockUseSocialListUrlState.mockReturnValue({
cursor: null,
limit: 20,
setCursor: vi.fn(),
setLimit: vi.fn(),
reset: vi.fn(),
    });
mockUseSocialListLifecycleReset.mockImplementation(() => undefined);
mockUseSocialListVisibility.mockReturnValue({
canViewFriends: true,
canViewBlocked: true,
canViewCounts: true,
isOwner: true,
isMutualFriend: false,
isAuthenticated: true,
isPrivateProfile: false,
    });
mockUseSocialCountsBadge.mockReturnValue({
counts: null,
isLoading: false,
isStale: false,
error: null,
refresh: () => undefined,
    });
const emptyResult = {
users: [],
isLoading: false,
isStale: false,
hasMore: false,
loadMore: () => undefined,
error: null,
retry: () => Promise.resolve(),
    };
mockUseFollowers.mockReturnValue(emptyResult);
mockUseFollowing.mockReturnValue(emptyResult);
mockUseFriends.mockReturnValue(emptyResult);
mockUseBlockedUsers.mockReturnValue(emptyResult);
  });

afterEach(() => {
vi.clearAllMocks();
  });

it("renders the placeholder for `social_live === 'placeholder'`", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "placeholder";
if (flag === "social_relationship_live") return "live";
return "live";
    });
render(<SocialListRouteGate kind="followers" />);
expect(
screen.getByTestId("social-list-placeholder-followers"),
    ).toBeInTheDocument();
  });

it("renders the placeholder for `social_relationship_live === 'placeholder'`", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "live";
if (flag === "social_relationship_live") return "placeholder";
return "live";
    });
render(<SocialListRouteGate kind="friends" />);
expect(
screen.getByTestId("social-list-placeholder-friends"),
    ).toBeInTheDocument();
  });

it("renders the live list component when both flags are 'live' (followers)", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "live";
if (flag === "social_relationship_live") return "live";
return "live";
    });
render(
<SocialListRouteGate
kind="followers"
targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );

expect(
screen.getByTestId("social-list-empty-state-followers"),
    ).toBeInTheDocument();
  });

it("renders the live list component when both flags are 'live' (following)", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "live";
if (flag === "social_relationship_live") return "live";
return "live";
    });
render(
<SocialListRouteGate
kind="following"
targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );
expect(
screen.getByTestId("social-list-empty-state-following"),
    ).toBeInTheDocument();
  });

it("renders the live list component when both flags are 'live' (friends)", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "live";
if (flag === "social_relationship_live") return "live";
return "live";
    });
render(
<SocialListRouteGate
kind="friends"
targetUserId="11111111-1111-1111-1111-111111111111"
      />,
    );
expect(
screen.getByTestId("social-list-empty-state-friends"),
    ).toBeInTheDocument();
  });

it("renders the live BlockedUsersList when both flags are 'live' (blocked)", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "live";
if (flag === "social_relationship_live") return "live";
return "live";
    });
render(<SocialListRouteGate kind="blocked" requireAuth />);
expect(
screen.getByTestId("social-list-empty-state-blocked"),
    ).toBeInTheDocument();
  });

it("renders the privacy notice when requireAuth is set and the viewer is unauthenticated", () => {
mockGetFeatureFlagValue.mockImplementation(() => "placeholder");
mockUseAuthState.mockReturnValue({ isAuthenticated: false });
render(<SocialListRouteGate kind="blocked" requireAuth />);
expect(
screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
expect(
screen.getByTestId("privacy-restricted-notice-not_available").getAttribute(
"data-resource-kind",
      ),
    ).toBe("blocked");
  });

it("falls through to placeholder when requireAuth + authenticated viewer", () => {
mockGetFeatureFlagValue.mockImplementation(() => "placeholder");
mockUseAuthState.mockReturnValue({ isAuthenticated: true });
render(<SocialListRouteGate kind="blocked" requireAuth />);
expect(
screen.getByTestId("social-list-placeholder-blocked"),
    ).toBeInTheDocument();
  });
});