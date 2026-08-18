

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserSearchResults } from "@/features/social/lists/UserSearchResults";
import type { SocialUserSummaryDto } from "@/features/social/types";

const mockUseUserSearch = vi.fn();
vi.mock("@/features/social/hooks/useUserSearch", () => ({
useUserSearch: (..._args: unknown[]) => mockUseUserSearch(),
}));

const mockBlockedContentGate = vi.fn(({ children }: { children: React.ReactNode }) => children);
vi.mock("@/features/social/components/BlockedContentGate", () => ({
BlockedContentGate: (props: { children: React.ReactNode }) => mockBlockedContentGate(props),
}));

const mockSocialListRow = vi.fn(({ user }: { user: SocialUserSummaryDto }) => (
<div data-testid="social-list-row" data-user-id={user.userId}>
{user.userName}
</div>
));
vi.mock("@/features/social/components/SocialListRow", () => ({
SocialListRow: (props: { user: SocialUserSummaryDto }) => mockSocialListRow(props),
}));

const alice: SocialUserSummaryDto = {
userId: "u1",
userName: "alice",
displayName: "Alice A.",
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
};

const bob: SocialUserSummaryDto = {
userId: "u2",
userName: "bob",
displayName: "Bob B.",
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-02T00:00:00.000Z",
};

const successResult = {
items: [alice, bob],
total: 2,
isLoading: false,
isStale: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
retry: vi.fn(),
cooldownSeconds: null as number | null,
wasStale: false,
remainingSeconds: 0,
isRateLimited: false,
rateLimitedUntil: null as number | null,
};

beforeEach(() => {
mockUseUserSearch.mockReset();
mockUseUserSearch.mockReturnValue(successResult);
mockBlockedContentGate.mockClear();
mockSocialListRow.mockClear();
});

describe("UserSearchResults", () => {
describe("query-too-short state", () => {
it("renders SearchEmptyState for empty query", () => {
render(<UserSearchResults query="" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("search-empty-state")).toHaveAttribute(
"data-kind",
"query-too-short",
      );
    });

it("renders SearchEmptyState for single character query", () => {
render(<UserSearchResults query="a" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("search-empty-state")).toHaveAttribute(
"data-kind",
"query-too-short",
      );
    });

it("renders SearchEmptyState for whitespace-only query", () => {
render(<UserSearchResults query="   " onQueryChange={vi.fn()} />);

expect(screen.getByTestId("search-empty-state")).toHaveAttribute(
"data-kind",
"query-too-short",
      );
    });
  });

describe("no-results state", () => {
it("renders SearchEmptyState with no-results kind for empty items", () => {
mockUseUserSearch.mockReturnValueOnce({
...successResult,
items: [],
      });

render(<UserSearchResults query="nonexistent" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("search-empty-state")).toHaveAttribute(
"data-kind",
"no-results",
      );
    });
  });

describe("rate-limit state", () => {
it("renders SearchRateLimitNotice for GLOBAL_RATE_LIMITED error", () => {
const error = new Error("Rate limited") as Error & { code: string };
Object.defineProperty(error, "code", {
value: "GLOBAL_RATE_LIMITED",
configurable: true,
      });

mockUseUserSearch.mockReturnValueOnce({
...successResult,
items: [],
error,
      });

render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("search-rate-limit-notice")).toBeInTheDocument();
    });

it("renders SearchRateLimitNotice for SOCIAL_SEARCH_RATE_LIMITED error", () => {
const error = new Error("Rate limited") as Error & { code: string };
Object.defineProperty(error, "code", {
value: "SOCIAL_SEARCH_RATE_LIMITED",
configurable: true,
      });

mockUseUserSearch.mockReturnValueOnce({
...successResult,
items: [],
error,
      });

render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("search-rate-limit-notice")).toBeInTheDocument();
    });
  });

describe("loading state", () => {
it("renders SearchResultSkeleton when loading with no cached data", () => {
mockUseUserSearch.mockReturnValueOnce({
...successResult,
items: [],
isLoading: true,
      });

render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("search-result-skeleton-search")).toBeInTheDocument();
    });
  });

describe("error state", () => {
it("renders SearchErrorState for other errors", () => {
const error = new Error("Server error") as Error & { code: string };
Object.defineProperty(error, "code", {
value: "GLOBAL_INTERNAL_ERROR",
configurable: true,
      });

mockUseUserSearch.mockReturnValueOnce({
...successResult,
items: [],
error,
      });

render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("search-error-state")).toBeInTheDocument();
    });
  });

describe("populated state", () => {
it("renders search results when items are present", () => {
render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

expect(screen.getAllByTestId("social-list-row")).toHaveLength(2);
    });

it("renders section with correct data-testid", () => {
render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("user-search-results")).toBeInTheDocument();
    });

it("renders load more button when hasMore is true", () => {
mockUseUserSearch.mockReturnValueOnce({
...successResult,
hasMore: true,
      });

render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

expect(screen.getByTestId("user-search-load-more")).toBeInTheDocument();
    });

it("calls loadMore when load more button is clicked", () => {
const loadMore = vi.fn();
mockUseUserSearch.mockReturnValueOnce({
...successResult,
hasMore: true,
loadMore,
      });

render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

screen.getByTestId("user-search-load-more").click();

expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });

describe("calls useUserSearch with query", () => {
it("calls useUserSearch when rendered", () => {
render(<UserSearchResults query="alice" onQueryChange={vi.fn()} />);

expect(mockUseUserSearch).toHaveBeenCalled();
    });
  });
});
