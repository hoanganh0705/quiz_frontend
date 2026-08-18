

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MutualFriendsPreview } from "@/features/social/components/MutualFriendsPreview";
import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";

import type { SocialMutualDto, SocialUserSummaryDto } from "@/features/social/types";

const mockUseMutualFriends = vi.fn();
vi.mock("@/features/social/hooks/useMutualFriends", () => ({
useMutualFriends: (...args: unknown[]) => mockUseMutualFriends(...args),
}));

const mockUseSocialListVisibility = vi.fn();
vi.mock("@/features/social/hooks/useSocialListVisibility", () => ({
useSocialListVisibility: (...args: unknown[]) =>
mockUseSocialListVisibility(...args),
}));

function makeSummary(idx: number): SocialUserSummaryDto {
return {
id: `summary-${idx}`,
userId: `user-${idx}`,
userName: `user${idx}`,
displayName: `User ${idx}`,
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeMutual(idx: number, count = 1): SocialMutualDto {
return {
id: `mutual-${idx}`,
user: makeSummary(idx),
mutualFriendsCount: count,
mutualFollowersCount: count + 1,
  };
}

const PLACEHOLDER_RESULT = {
items: [] as readonly SocialMutualDto[],
total: 0,
visibility: "not_found" as const,
isLoading: false,
isStale: false,
hasMore: false,
loadMore: () => undefined,
error: null,
retry: () => Promise.resolve(),
};

function visibleWith(items: SocialMutualDto[], total = items.length) {
return {
...PLACEHOLDER_RESULT,
visibility: "visible" as const,
items,
total,
  };
}

beforeEach(() => {
mockUseMutualFriends.mockReset();
mockUseSocialListVisibility.mockReset();

mockUseSocialListVisibility.mockReturnValue({
canViewFriends: true,
canViewBlocked: false,
canViewCounts: true,
isOwner: false,
isMutualFriend: true,
isAuthenticated: true,
isPrivateProfile: false,
  });
});

describe("MutualFriendsPreview — privacy branches", () => {
it("renders the privacy notice when the social-visibility selector refuses", () => {
mockUseSocialListVisibility.mockReturnValue({
canViewFriends: false,
canViewBlocked: false,
canViewCounts: true,
isOwner: false,
isMutualFriend: false,
isAuthenticated: true,
isPrivateProfile: false,
    });
mockUseMutualFriends.mockReturnValue(visibleWith([]));
render(<MutualFriendsPreview targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-preview-avatar")).toBeNull();
expect(screen.queryByTestId("mutual-friends-preview-see-all")).toBeNull();
  });

it("renders the privacy notice when the hook surfaces a privacy code", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "blocked_by_viewer",
    });
render(<MutualFriendsPreview targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-preview-avatar")).toBeNull();
  });

it("renders the privacy notice when the hook surfaces 'private'", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "private",
    });
render(<MutualFriendsPreview targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
  });

it("renders the privacy notice when the hook surfaces 'not_found'", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "not_found",
    });
render(<MutualFriendsPreview targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
  });
});

describe("MutualFriendsPreview — loading branch", () => {
it("renders MutualPreviewSkeleton when the hook is loading with no cached items", () => {
mockUseMutualFriends.mockReturnValue({
...visibleWith([]),
isLoading: true,
    });
render(<MutualFriendsPreview targetUserId="user-1" />);
expect(screen.getByTestId("mutual-preview-skeleton")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-preview-friends")).toBeNull();
  });
});

describe("MutualFriendsPreview — visible branch", () => {
it("renders up to MUTUAL_PREVIEW_CAP avatars", () => {
const many = Array.from({ length: MUTUAL_PREVIEW_CAP + 4 }, (_, i) =>
makeMutual(i + 1),
    );
mockUseMutualFriends.mockReturnValue(visibleWith(many, many.length));
render(<MutualFriendsPreview targetUserId="user-1" />);
const avatars = screen.getAllByTestId("mutual-preview-avatar");
expect(avatars.length).toBe(MUTUAL_PREVIEW_CAP);
  });

it("renders the overflow chip + 'See all' link when total > MUTUAL_PREVIEW_CAP", () => {
const many = Array.from({ length: MUTUAL_PREVIEW_CAP }, (_, i) =>
makeMutual(i + 1),
    );
mockUseMutualFriends.mockReturnValue(visibleWith(many, 20));
render(<MutualFriendsPreview targetUserId="user-1" />);
const seeAll = screen.getByTestId("mutual-friends-preview-see-all");
expect(seeAll).toBeInTheDocument();
expect(seeAll.getAttribute("href")).toBe(
"/social/users/user-1/mutual-friends",
    );
  });

it("hides the 'See all' link when total does not exceed the cap", () => {
const three = Array.from({ length: 3 }, (_, i) => makeMutual(i + 1));
mockUseMutualFriends.mockReturnValue(visibleWith(three, 3));
render(<MutualFriendsPreview targetUserId="user-1" />);
expect(screen.queryByTestId("mutual-friends-preview-see-all")).toBeNull();
  });

it("avatar link href contains only userId (no internal-id leakage)", () => {
const rows = [makeMutual(1), makeMutual(2)];
mockUseMutualFriends.mockReturnValue(visibleWith(rows, 2));
render(<MutualFriendsPreview targetUserId="user-1" />);
const avatars = screen.getAllByTestId("mutual-preview-avatar");
for (const avatar of avatars) {
const href = avatar.getAttribute("href") ?? "";
expect(href).toMatch(/^\/users\/user-[12]$/);
expect(href).not.toMatch(/followId|friendshipId|blockId/);
    }
  });
});

describe("MutualFriendsPreview — empty branch", () => {
it("renders the documented empty copy when visible with no rows", () => {
mockUseMutualFriends.mockReturnValue(visibleWith([], 0));
render(<MutualFriendsPreview targetUserId="user-1" />);
const empty = screen.getByTestId("mutual-preview-friends-empty");
expect(empty).toBeInTheDocument();
expect(empty.textContent).toContain("No mutual friends");
  });
});

describe("MutualFriendsPreview — accessibility metadata", () => {
it("exposes the target user id as a data attribute (not in copy)", () => {
mockUseMutualFriends.mockReturnValue(visibleWith([]));
render(<MutualFriendsPreview targetUserId="user-target-123" />);
const root = screen.getByTestId("mutual-friends-preview");
expect(root.getAttribute("data-target-user-id")).toBe("user-target-123");
expect(root.textContent).not.toContain("user-target-123");
  });
});
