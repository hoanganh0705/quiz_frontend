

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MutualFriendsList } from "@/features/social/lists/MutualFriendsList";
import { ApiError } from "@/lib/api";

import type { SocialMutualDto, SocialUserSummaryDto } from "@/features/social/types";

const mockUseMutualFriends = vi.fn();
vi.mock("@/features/social/hooks/useMutualFriends", () => ({
useMutualFriends: (...args: unknown[]) => mockUseMutualFriends(...args),
}));

const mockUseRelationship = vi.fn();
vi.mock("@/features/social/hooks/useRelationship", () => ({
useRelationship: (...args: unknown[]) => mockUseRelationship(...args),
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

function makeMutual(idx: number): SocialMutualDto {
return {
id: `mutual-${idx}`,
user: makeSummary(idx),
mutualFriendsCount: 1,
mutualFollowersCount: 1,
  };
}

function makeApiError(code: string, status = 403): ApiError {
const axiosLike = {
response: {
status,
statusText: code,
data: {
type: "about:blank",
title: code,
status,
detail: `test error ${code}`,
extensions: { code },
      },
    },
message: `test error ${code}`,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
return new ApiError(axiosLike);
}

const PLACEHOLDER_RESULT = {
items: [] as readonly SocialMutualDto[],
total: 0,
visibility: "not_found" as const,
isLoading: false,
isStale: false,
hasMore: false,
loadMore: vi.fn(),
error: null as ApiError | null,
retry: vi.fn(() => Promise.resolve()),
};

beforeEach(() => {
mockUseMutualFriends.mockReset();
mockUseRelationship.mockReset();

mockUseRelationship.mockReturnValue({
relationship: "none",
isLoading: false,
isStale: false,
error: null,
retry: vi.fn(),
  });
});

describe("MutualFriendsList — privacy branch", () => {
it("renders the privacy notice when the hook reports 'blocked_by_viewer'", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "blocked_by_viewer",
    });
render(<MutualFriendsList targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-friends-list")).toBeNull();
  });

it("renders the 'friends_only' privacy notice when the hook reports 'private'", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "private",
    });
render(<MutualFriendsList targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-friends_only")).toBeInTheDocument();
  });

it("renders the privacy notice when the hook reports 'not_found'", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "not_found",
    });
render(<MutualFriendsList targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
  });
});

describe("MutualFriendsList — loading branch", () => {
it("renders MutualListSkeleton when the hook is loading with no cached items", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
isLoading: true,
    });
render(<MutualFriendsList targetUserId="user-1" />);
expect(screen.getByTestId("mutual-list-skeleton")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-friends-list")).toBeNull();
  });
});

describe("MutualFriendsList — error branch", () => {
it("renders MutualErrorState for an unknown-shape error with no cached items", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
error: makeApiError("SOCIAL_USER_NOT_FOUND", 404),
    });
render(<MutualFriendsList targetUserId="user-1" />);
const error = screen.getByTestId("mutual-error-state");
expect(error).toBeInTheDocument();
expect(error.textContent).toContain("This account is no longer available");
  });

it("calls retry() when the retry button is clicked", () => {
const retry = vi.fn(() => Promise.resolve());
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
error: makeApiError("GLOBAL_INTERNAL_ERROR", 500),
retry,
    });
render(<MutualFriendsList targetUserId="user-1" />);
screen.getByTestId("mutual-error-state-retry").click();
expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("MutualFriendsList — empty branch", () => {
it("renders MutualEmptyState (friends copy) when visible with no items", () => {
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
    });
render(<MutualFriendsList targetUserId="user-1" />);
const empty = screen.getByTestId("mutual-empty-state-friends");
expect(empty).toBeInTheDocument();
expect(empty.textContent).toContain("No mutual friends");
  });
});

describe("MutualFriendsList — populated branch", () => {
it("renders one SocialListRow per item with internal-id-free href", () => {
const rows = [makeMutual(1), makeMutual(2), makeMutual(3)];
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items: rows,
total: 3,
    });
render(<MutualFriendsList targetUserId="user-1" />);
const list = screen.getByTestId("mutual-friends-list");
expect(list.getAttribute("data-total")).toBe("3");
const items = screen.getAllByTestId("social-list-row-summary");
expect(items.length).toBe(3);
for (const row of items) {
const href = row.getAttribute("href") ?? "";
expect(href).toMatch(/^\/users\/user-[123]$/);
expect(href).not.toMatch(/followId|friendshipId|blockId/);
    }
  });

it("renders the load-more footer when hasMore === true and calls loadMore on click", () => {
const rows = [makeMutual(1), makeMutual(2)];
const loadMore = vi.fn();
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items: rows,
total: 25,
hasMore: true,
loadMore,
    });
render(<MutualFriendsList targetUserId="user-1" />);
const footer = screen.getByTestId("mutual-friends-list-load-more");
expect(footer).toBeInTheDocument();
footer.click();
expect(loadMore).toHaveBeenCalledTimes(1);
  });

it("hides the load-more footer when hasMore === false", () => {
const rows = [makeMutual(1)];
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items: rows,
total: 1,
hasMore: false,
    });
render(<MutualFriendsList targetUserId="user-1" />);
expect(screen.queryByTestId("mutual-friends-list-load-more")).toBeNull();
  });
});

describe("MutualFriendsList — blocked-content gate", () => {
it("does not render rows when the cached relationship resolves to 'blocked'", () => {

const rows = [makeMutual(1), makeMutual(2)];
mockUseMutualFriends.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items: rows,
total: 2,
    });

mockUseRelationship.mockReturnValue({
relationship: "blocked",
isLoading: false,
isStale: false,
error: null,
retry: vi.fn(),
    });
render(<MutualFriendsList targetUserId="user-1" />);

expect(screen.getByTestId("blocked-content-gate-fallback")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-friends-list")).toBeNull();
  });
});
