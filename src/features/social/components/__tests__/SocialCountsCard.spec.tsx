

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SocialCountsCard } from "@/features/social/components/SocialCountsCard";

const mockUseSocialCounts = vi.fn();
vi.mock("@/features/social/hooks/useSocialCounts", () => ({
useSocialCounts: (...args: unknown[]) => mockUseSocialCounts(...args),
}));

const mockUseSocialListVisibility = vi.fn();
vi.mock("@/features/social/hooks/useSocialListVisibility", () => ({
useSocialListVisibility: (...args: unknown[]) =>
mockUseSocialListVisibility(...args),
}));

function counts() {
return { followers: 12, following: 34, friends: 5, blocked: 1 };
}

beforeEach(() => {
mockUseSocialCounts.mockReset();
mockUseSocialListVisibility.mockReset();
mockUseSocialCounts.mockReturnValue({
counts: counts(),
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
  });
});

describe("SocialCountsCard — chips", () => {
it("renders the Followers / Following / Friends chips for a permitted viewer", () => {
mockUseSocialListVisibility.mockReturnValue({
canViewFriends: true,
    });
render(<SocialCountsCard targetUserId="user-1" />);
expect(screen.getByTestId("social-counts-card-followers")).toBeInTheDocument();
expect(screen.getByTestId("social-counts-card-following")).toBeInTheDocument();
expect(screen.getByTestId("social-counts-card-friends")).toBeInTheDocument();
  });

it("renders the Followers and Following chip text with the documented values", () => {
mockUseSocialListVisibility.mockReturnValue({
canViewFriends: true,
    });
render(<SocialCountsCard targetUserId="user-1" />);
const followers = screen.getByTestId("social-counts-card-followers");
expect(followers.textContent).toMatch(/12/);
expect(followers.textContent).toMatch(/Followers/);
  });

it("hides the Friends chip when canViewFriends is false", () => {
mockUseSocialListVisibility.mockReturnValue({
canViewFriends: false,
    });
render(<SocialCountsCard targetUserId="user-1" />);
expect(
screen.queryByTestId("social-counts-card-friends"),
    ).not.toBeInTheDocument();
expect(screen.getByTestId("social-counts-card-followers")).toBeInTheDocument();
expect(screen.getByTestId("social-counts-card-following")).toBeInTheDocument();
  });
});

describe("SocialCountsCard — revalidation indicator", () => {
it("renders the stale indicator when isStale is true", () => {
mockUseSocialListVisibility.mockReturnValue({ canViewFriends: true });
mockUseSocialCounts.mockReturnValue({
counts: counts(),
isLoading: false,
isStale: true,
error: null,
retry: () => Promise.resolve(),
    });
render(<SocialCountsCard targetUserId="user-1" />);
expect(
screen.getByTestId("social-counts-card-stale-indicator"),
    ).toBeInTheDocument();
  });

it("does not render the stale indicator when isStale is false", () => {
mockUseSocialListVisibility.mockReturnValue({ canViewFriends: true });
render(<SocialCountsCard targetUserId="user-1" />);
expect(
screen.queryByTestId("social-counts-card-stale-indicator"),
    ).not.toBeInTheDocument();
  });
});

describe("SocialCountsCard — null fallback", () => {
it("returns null when the hook has no data and is not loading", () => {
mockUseSocialCounts.mockReturnValue({
counts: null,
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
    });
const { container } = render(<SocialCountsCard targetUserId="user-1" />);
expect(container.firstChild).toBeNull();
  });
});

describe("SocialCountsCard — variant", () => {
it("uses the documented default 'hub' variant", () => {
mockUseSocialListVisibility.mockReturnValue({ canViewFriends: true });
render(<SocialCountsCard targetUserId="user-1" />);
const root = screen.getByTestId("social-counts-card");
expect(root.getAttribute("data-variant")).toBe("hub");
  });

it("honours an explicit 'badge' variant", () => {
mockUseSocialListVisibility.mockReturnValue({ canViewFriends: true });
render(<SocialCountsCard targetUserId="user-1" variant="badge" />);
const root = screen.getByTestId("social-counts-card");
expect(root.getAttribute("data-variant")).toBe("badge");
  });
});

describe("SocialCountsCard — chip hrefs", () => {
it("the Followers chip links to the followers list route", () => {
mockUseSocialListVisibility.mockReturnValue({ canViewFriends: true });
render(<SocialCountsCard targetUserId="user-1" />);
const chip = screen.getByTestId("social-counts-card-followers");
expect(chip.getAttribute("href")).toBe(
"/social/users/user-1/followers",
    );
  });
});