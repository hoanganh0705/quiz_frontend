

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

it("renders the placeholder for `social_mutuals_live === 'placeholder'`", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "live";
if (flag === "social_mutuals_live") return "placeholder";
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

it("renders the placeholder for `social_live === 'placeholder'`", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "placeholder";
if (flag === "social_mutuals_live") return "live";
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

mockUseMutualFriends.mockReturnValue({
items: [
{
id: "mutual-1",
user: {
userId: "11111111-1111-1111-1111-111111111111",
userName: "mutualperson",
displayName: "Mutual Person",
avatarUrl: null,
          },
        },
      ],
total: 1,
visibility: "visible",
isLoading: false,
isStale: false,
hasMore: false,
loadMore: () => undefined,
error: null,
retry: () => Promise.resolve(),
    });
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

mockUseMutualFollowers.mockReturnValue({
items: [
{
id: "follower-mutual-1",
user: {
userId: "11111111-1111-1111-1111-111111111111",
userName: "followerperson",
displayName: "Follower Person",
avatarUrl: null,
          },
        },
      ],
total: 1,
visibility: "visible",
isLoading: false,
isStale: false,
hasMore: false,
loadMore: () => undefined,
error: null,
retry: () => Promise.resolve(),
    });
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