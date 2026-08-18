

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MutualFollowersPreview } from "@/features/social/components/MutualFollowersPreview";
import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";

import type { SocialMutualDto, SocialUserSummaryDto } from "@/features/social/types";

const mockUseMutualFollowers = vi.fn();
vi.mock("@/features/social/hooks/useMutualFollowers", () => ({
useMutualFollowers: (...args: unknown[]) => mockUseMutualFollowers(...args),
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
mockUseMutualFollowers.mockReset();
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

describe("MutualFollowersPreview — privacy branches", () => {
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
mockUseMutualFollowers.mockReturnValue(visibleWith([]));
render(<MutualFollowersPreview targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-preview-avatar")).toBeNull();
expect(screen.queryByTestId("mutual-followers-preview-see-all")).toBeNull();
  });

it("renders the privacy notice when the hook surfaces 'blocked_viewer'", () => {
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "blocked_viewer",
    });
render(<MutualFollowersPreview targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
  });

it("renders the privacy notice when the hook surfaces 'private'", () => {
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "private",
    });
render(<MutualFollowersPreview targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
  });
});

describe("MutualFollowersPreview — loading branch", () => {
it("renders MutualPreviewSkeleton when the hook is loading with no cached items", () => {
mockUseMutualFollowers.mockReturnValue({
...visibleWith([]),
isLoading: true,
    });
render(<MutualFollowersPreview targetUserId="user-1" />);
expect(screen.getByTestId("mutual-preview-skeleton")).toBeInTheDocument();
  });
});

describe("MutualFollowersPreview — visible branch", () => {
it("renders up to MUTUAL_PREVIEW_CAP avatars", () => {
const many = Array.from({ length: MUTUAL_PREVIEW_CAP + 4 }, (_, i) =>
makeMutual(i + 1),
    );
mockUseMutualFollowers.mockReturnValue(visibleWith(many, many.length));
render(<MutualFollowersPreview targetUserId="user-1" />);
const avatars = screen.getAllByTestId("mutual-preview-avatar");
expect(avatars.length).toBe(MUTUAL_PREVIEW_CAP);
  });

it("renders the overflow chip + 'See all' link when total > MUTUAL_PREVIEW_CAP", () => {
const many = Array.from({ length: MUTUAL_PREVIEW_CAP }, (_, i) =>
makeMutual(i + 1),
    );
mockUseMutualFollowers.mockReturnValue(visibleWith(many, 25));
render(<MutualFollowersPreview targetUserId="user-1" />);
const seeAll = screen.getByTestId("mutual-followers-preview-see-all");
expect(seeAll).toBeInTheDocument();
expect(seeAll.getAttribute("href")).toBe(
"/social/users/user-1/mutual-followers",
    );
  });

it("hides the 'See all' link when total does not exceed the cap", () => {
const three = Array.from({ length: 3 }, (_, i) => makeMutual(i + 1));
mockUseMutualFollowers.mockReturnValue(visibleWith(three, 3));
render(<MutualFollowersPreview targetUserId="user-1" />);
expect(screen.queryByTestId("mutual-followers-preview-see-all")).toBeNull();
  });

it("avatar link href contains only userId (no internal-id leakage)", () => {
const rows = [makeMutual(1), makeMutual(2)];
mockUseMutualFollowers.mockReturnValue(visibleWith(rows, 2));
render(<MutualFollowersPreview targetUserId="user-1" />);
const avatars = screen.getAllByTestId("mutual-preview-avatar");
for (const avatar of avatars) {
const href = avatar.getAttribute("href") ?? "";
expect(href).toMatch(/^\/users\/user-[12]$/);
expect(href).not.toMatch(/followId|friendshipId|blockId/);
    }
  });
});

describe("MutualFollowersPreview — empty branch", () => {
it("renders the documented empty copy when visible with no rows", () => {
mockUseMutualFollowers.mockReturnValue(visibleWith([], 0));
render(<MutualFollowersPreview targetUserId="user-1" />);
const empty = screen.getByTestId("mutual-preview-followers-empty");
expect(empty).toBeInTheDocument();
expect(empty.textContent).toContain("No mutual followers");
  });
});
