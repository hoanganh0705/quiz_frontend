

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SocialCountsBadge } from "@/features/social/components/SocialCountsBadge";

const mockUseSocialCountsBadge = vi.fn();
vi.mock("@/features/social/hooks/useSocialCountsBadge", () => ({
useSocialCountsBadge: (...args: unknown[]) => mockUseSocialCountsBadge(...args),
}));

const mockUseSocialListVisibility = vi.fn();
vi.mock("@/features/social/hooks/useSocialListVisibility", () => ({
useSocialListVisibility: (...args: unknown[]) =>
mockUseSocialListVisibility(...args),
}));

const DEFAULT_COUNTS = {
followers: 5,
following: 3,
friends: 7,
blocked: 0,
};

beforeEach(() => {
mockUseSocialCountsBadge.mockReset();
mockUseSocialListVisibility.mockReset();
mockUseSocialCountsBadge.mockReturnValue({
counts: DEFAULT_COUNTS,
isLoading: false,
isStale: false,
error: null,
refresh: () => undefined,
  });
mockUseSocialListVisibility.mockReturnValue({
canViewFriends: true,
canViewBlocked: true,
canViewCounts: true,
isOwner: false,
isMutualFriend: true,
isAuthenticated: true,
isPrivateProfile: false,
  });
});

describe("SocialCountsBadge", () => {
it("renders each count chip with the documented values", () => {
render(<SocialCountsBadge targetUserId="user-1" />);
const followers = screen.getByTestId("social-counts-badge-followers");
expect(followers.textContent).toMatch(/5/);
expect(followers.textContent).toMatch(/Followers/);
const following = screen.getByTestId("social-counts-badge-following");
expect(following.textContent).toMatch(/3/);
expect(following.textContent).toMatch(/Following/);
const friends = screen.getByTestId("social-counts-badge-friends");
expect(friends.textContent).toMatch(/7/);
expect(friends.textContent).toMatch(/Friends/);
  });

it("hides the Friends chip when canViewFriends is false", () => {
mockUseSocialListVisibility.mockReturnValue({
canViewFriends: false,
canViewBlocked: true,
canViewCounts: true,
isOwner: false,
isMutualFriend: false,
isAuthenticated: true,
isPrivateProfile: false,
    });
render(<SocialCountsBadge targetUserId="user-1" />);
expect(
screen.queryByTestId("social-counts-badge-friends"),
    ).toBeNull();
expect(
screen.getByTestId("social-counts-badge-followers"),
    ).toBeInTheDocument();
  });

it("renders the stale indicator when isStale is true", () => {
mockUseSocialCountsBadge.mockReturnValue({
counts: DEFAULT_COUNTS,
isLoading: false,
isStale: true,
error: null,
refresh: () => undefined,
    });
render(<SocialCountsBadge targetUserId="user-1" />);
expect(
screen.getByTestId("social-counts-badge-stale-indicator"),
    ).toBeInTheDocument();
  });

it("returns null when counts is null and not loading", () => {
mockUseSocialCountsBadge.mockReturnValue({
counts: null,
isLoading: false,
isStale: false,
error: null,
refresh: () => undefined,
    });
const { container } = render(<SocialCountsBadge targetUserId="user-1" />);
expect(container.firstChild).toBeNull();
  });

it("renders the chip links to the documented list routes", () => {
render(<SocialCountsBadge targetUserId="user-1" />);
const followers = screen.getByTestId("social-counts-badge-followers");
expect(followers.getAttribute("href")).toBe(
"/social/users/user-1/followers",
    );
const following = screen.getByTestId("social-counts-badge-following");
expect(following.getAttribute("href")).toBe(
"/social/users/user-1/following",
    );
const friends = screen.getByTestId("social-counts-badge-friends");
expect(friends.getAttribute("href")).toBe(
"/social/users/user-1/friends",
    );
  });
});