

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MutualFollowersList } from "@/features/social/lists/MutualFollowersList";
import { ApiError } from "@/lib/api";

import type { SocialMutualDto, SocialUserSummaryDto } from "@/features/social/types";

const mockUseMutualFollowers = vi.fn();
vi.mock("@/features/social/hooks/useMutualFollowers", () => ({
useMutualFollowers: (...args: unknown[]) => mockUseMutualFollowers(...args),
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
mockUseMutualFollowers.mockReset();
mockUseRelationship.mockReset();
mockUseRelationship.mockReturnValue({
relationship: "none",
isLoading: false,
isStale: false,
error: null,
retry: vi.fn(),
  });
});

describe("MutualFollowersList — privacy branch", () => {
it("renders the privacy notice when the hook reports 'blocked_viewer'", () => {
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "blocked_viewer",
    });
render(<MutualFollowersList targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
  });

it("renders the 'friends_only' privacy notice when the hook reports 'private'", () => {
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "private",
    });
render(<MutualFollowersList targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-friends_only")).toBeInTheDocument();
  });
});

describe("MutualFollowersList — loading branch", () => {
it("renders MutualListSkeleton when the hook is loading with no cached items", () => {
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
isLoading: true,
    });
render(<MutualFollowersList targetUserId="user-1" />);
expect(screen.getByTestId("mutual-list-skeleton")).toBeInTheDocument();
  });
});

describe("MutualFollowersList — error branch", () => {
it("renders MutualErrorState for a SOCIAL_BLOCKED_USER error with no cached items", () => {
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
error: makeApiError("SOCIAL_BLOCKED_USER", 403),
    });
render(<MutualFollowersList targetUserId="user-1" />);
const error = screen.getByTestId("mutual-error-state");
expect(error).toBeInTheDocument();
expect(error.textContent).toContain("This user isn't available");
  });
});

describe("MutualFollowersList — empty branch", () => {
it("renders MutualEmptyState (followers copy) when visible with no items", () => {
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
    });
render(<MutualFollowersList targetUserId="user-1" />);
const empty = screen.getByTestId("mutual-empty-state-followers");
expect(empty).toBeInTheDocument();
expect(empty.textContent).toContain("No mutual followers");
  });
});

describe("MutualFollowersList — populated branch", () => {
it("renders one SocialListRow per item with internal-id-free href", () => {
const rows = [makeMutual(1), makeMutual(2), makeMutual(3)];
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items: rows,
total: 3,
    });
render(<MutualFollowersList targetUserId="user-1" />);
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
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items: rows,
total: 25,
hasMore: true,
loadMore,
    });
render(<MutualFollowersList targetUserId="user-1" />);
const footer = screen.getByTestId("mutual-followers-list-load-more");
expect(footer).toBeInTheDocument();
footer.click();
expect(loadMore).toHaveBeenCalledTimes(1);
  });
});

describe("MutualFollowersList — blocked-content gate", () => {
it("does not render rows when the cached relationship resolves to 'blocked_by'", () => {
const rows = [makeMutual(1), makeMutual(2)];
mockUseMutualFollowers.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items: rows,
total: 2,
    });
mockUseRelationship.mockReturnValue({
relationship: "blocked_by",
isLoading: false,
isStale: false,
error: null,
retry: vi.fn(),
    });
render(<MutualFollowersList targetUserId="user-1" />);
expect(screen.getByTestId("blocked-content-gate-fallback")).toBeInTheDocument();
expect(screen.queryByTestId("mutual-followers-list")).toBeNull();
  });
});
