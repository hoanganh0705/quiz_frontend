

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserActivityStream } from "@/features/social/lists/UserActivityStream";
import { ApiError } from "@/lib/api";

import type { SocialActivityItemDto } from "@/features/social/types";

const mockUseUserActivity = vi.fn();
vi.mock("@/features/social/hooks/useUserActivity", () => ({
useUserActivity: (...args: unknown[]) => mockUseUserActivity(...args),
}));

const mockUseRelationship = vi.fn();
vi.mock("@/features/social/hooks/useRelationship", () => ({
useRelationship: (...args: unknown[]) => mockUseRelationship(...args),
}));

function makeActivityItem(idx: number): SocialActivityItemDto {
const at = new Date(2026, 0, 1, 12, idx, 0).toISOString();
return {
id: `item-${idx}`,
type: "quiz_completed",
at,
actorUser: {
id: `actor-${idx}`,
userId: `actor-${idx}`,
userName: `actor${idx}`,
displayName: null,
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
    },
payload: {
type: "quiz_completed",
quizId: `quiz-${idx}`,
quizSlug: `quiz-${idx}`,
scorePercent: 80 + idx,
    },
  };
}

function makeApiError(code: string, status = 403, extensions: Record<string, unknown> = { code }): ApiError {
const axiosLike = {
response: {
status,
statusText: code,
data: {
type: "about:blank",
title: code,
status,
detail: `test error ${code}`,
extensions,
      },
    },
message: `test error ${code}`,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
return new ApiError(axiosLike);
}

function rateLimitError(seconds: number): ApiError {
return makeApiError(
"ACTIVITY_RATE_LIMITED",
429,
{ code: "ACTIVITY_RATE_LIMITED", retryAfterMs: seconds * 1000 },
  );
}

const PLACEHOLDER_RESULT = {
items: [] as readonly SocialActivityItemDto[],
total: 0,
visibility: "not_found" as const,
isLoading: false,
isStale: false,
staleness: "fresh" as const,
error: null as ApiError | null,
hasMore: false,
loadMore: vi.fn(),
retry: vi.fn(() => Promise.resolve()),
rateLimitedUntil: null as number | null,
};

beforeEach(() => {
mockUseUserActivity.mockReset();
mockUseRelationship.mockReset();
mockUseRelationship.mockReturnValue({
relationship: "none",
isLoading: false,
isStale: false,
error: null,
retry: vi.fn(),
  });
});

describe("UserActivityStream — privacy branch", () => {
it("renders the privacy notice when visibility is 'blocked_viewer'", () => {
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "blocked_viewer",
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-not_available")).toBeInTheDocument();
expect(screen.queryByTestId("user-activity-stream")).toBeNull();
  });

it("renders the privacy notice when visibility is 'private'", () => {
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "private",
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.getByTestId("privacy-restricted-notice-friends_only")).toBeInTheDocument();
  });
});

describe("UserActivityStream — rate-limit branch", () => {
it("renders the ActivityRateLimitNotice when rateLimitedUntil is in the future", () => {
const future = Date.now() + 60_000;
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
rateLimitedUntil: future,
    });
render(<UserActivityStream targetUserId="user-1" />);
const notice = screen.getByTestId("activity-rate-limit-notice");
expect(notice).toBeInTheDocument();
expect(notice.getAttribute("data-cooldown-complete")).toBe("false");

expect(screen.queryByTestId("user-activity-stream")).toBeNull();
  });
});

describe("UserActivityStream — loading branch", () => {
it("renders ActivitySkeleton when the hook is loading with no cached items", () => {
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
isLoading: true,
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.getByTestId("activity-skeleton")).toBeInTheDocument();
expect(screen.queryByTestId("user-activity-stream")).toBeNull();
  });
});

describe("UserActivityStream — empty branch", () => {
it("renders ActivityEmptyState when visible with no items and no error", () => {
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.getByTestId("activity-empty-state")).toBeInTheDocument();
expect(screen.getByTestId("activity-empty-state").textContent).toContain("No activity yet");
  });

it("renders ActivityEmptyState (blocked) when the error code is SOCIAL_USER_BLOCKED", () => {
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
error: makeApiError("SOCIAL_USER_BLOCKED", 403),
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.getByTestId("activity-empty-state")).toBeInTheDocument();
expect(screen.getByTestId("activity-empty-state").getAttribute("data-blocked")).toBe("true");
  });
});

describe("UserActivityStream — error branch", () => {
it("renders ActivityErrorState for SOCIAL_USER_NOT_FOUND with no cached items", () => {
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
error: makeApiError("SOCIAL_USER_NOT_FOUND", 404),
    });
render(<UserActivityStream targetUserId="user-1" />);
const error = screen.getByTestId("activity-error-state");
expect(error).toBeInTheDocument();
expect(error.textContent).toContain("This account is no longer available");
  });

it("calls retry() when the retry button is clicked", () => {
const retry = vi.fn(() => Promise.resolve());
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
error: makeApiError("GLOBAL_INTERNAL_ERROR", 500),
retry,
    });
render(<UserActivityStream targetUserId="user-1" />);
screen.getByTestId("activity-error-state-retry").click();
expect(retry).toHaveBeenCalledTimes(1);
  });

it("does NOT route the ACTIVITY_RATE_LIMITED error to ActivityErrorState", () => {

mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
error: rateLimitError(30),
rateLimitedUntil: null,
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.queryByTestId("activity-error-state")).toBeNull();
  });
});

describe("UserActivityStream — populated branch", () => {
it("renders one ActivityStreamItem per item with stable test-ids", () => {
const items = [makeActivityItem(1), makeActivityItem(2)];
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items,
total: 2,
    });
render(<UserActivityStream targetUserId="user-1" />);
const rows = screen.getAllByTestId("user-activity-stream-row");
expect(rows.length).toBe(2);
expect(screen.getAllByTestId("activity-item-quiz_completed").length).toBe(2);
  });

it("renders the load-more footer when hasMore === true and calls loadMore on click", () => {
const items = [makeActivityItem(1)];
const loadMore = vi.fn();
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items,
total: 5,
hasMore: true,
loadMore,
    });
render(<UserActivityStream targetUserId="user-1" />);
const footer = screen.getByTestId("user-activity-stream-load-more");
expect(footer).toBeInTheDocument();
footer.click();
expect(loadMore).toHaveBeenCalledTimes(1);
  });

it("renders ConsistencyNotice when staleness is 'stale'", () => {
const items = [makeActivityItem(1)];
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items,
total: 1,
staleness: "stale",
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.getByTestId("consistency-notice-stale")).toBeInTheDocument();
  });

it("does NOT render ConsistencyNotice when staleness is 'fresh'", () => {
const items = [makeActivityItem(1)];
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items,
total: 1,
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.queryByTestId("consistency-notice-stale")).toBeNull();
expect(screen.queryByTestId("consistency-notice-recent")).toBeNull();
  });
});

describe("UserActivityStream — blocked-content gate", () => {
it("does not render rows when the cached relationship resolves to 'blocked'", () => {
const items = [makeActivityItem(1), makeActivityItem(2)];
mockUseUserActivity.mockReturnValue({
...PLACEHOLDER_RESULT,
visibility: "visible",
items,
total: 2,
    });
mockUseRelationship.mockReturnValue({
relationship: "blocked",
isLoading: false,
isStale: false,
error: null,
retry: vi.fn(),
    });
render(<UserActivityStream targetUserId="user-1" />);
expect(screen.getByTestId("blocked-content-gate-fallback")).toBeInTheDocument();
expect(screen.queryByTestId("user-activity-stream")).toBeNull();
  });
});
