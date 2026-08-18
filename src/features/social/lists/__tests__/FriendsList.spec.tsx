

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FriendsList } from "@/features/social/lists/FriendsList";
import type { SocialUserSummaryDto } from "@/features/social/types";

const mockUseFriends = vi.fn();
vi.mock("@/features/social/hooks/useFriends", () => ({
useFriends: (...args: unknown[]) => mockUseFriends(...args),
}));

const mockUseSocialListVisibility = vi.fn();
vi.mock("@/features/social/hooks/useSocialListVisibility", () => ({
useSocialListVisibility: (...args: unknown[]) =>
mockUseSocialListVisibility(...args),
}));

const mockUseSocialListUrlState = vi.fn();
vi.mock("@/features/social/hooks/useSocialListUrlState", () => ({
useSocialListUrlState: (...args: unknown[]) => mockUseSocialListUrlState(...args),
}));

const mockUseSocialListLifecycleReset = vi.fn();
vi.mock("@/features/social/hooks/useSocialListLifecycleReset", () => ({
useSocialListLifecycleReset: (...args: unknown[]) =>
mockUseSocialListLifecycleReset(...args),
}));

const publishSocialListLoadedMock = vi.fn();
vi.mock("@/lib/social/social-list-loaded-broadcast-channel", () => ({
publishSocialListLoaded: (...args: unknown[]) =>
publishSocialListLoadedMock(...args),
subscribeSocialListLoaded: () => () => undefined,
unsubscribeAllSocialListLoadedHandlers: () => undefined,
getSocialListLoadedChannel: () => null,
closeSocialListLoadedChannel: () => undefined,
initSocialListLoadedChannel: () => false,
SOCIAL_LIST_LOADED_CHANNEL_NAME: "social/list-loaded",
}));

const summaries: SocialUserSummaryDto[] = [
{
id: "summary-1",
userId: "11111111-1111-1111-1111-111111111111",
userName: "alice",
displayName: "Alice A.",
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const EMPTY = {
users: [] as readonly SocialUserSummaryDto[],
isLoading: false,
isStale: false,
hasMore: false,
loadMore: () => undefined,
error: null,
retry: () => Promise.resolve(),
};

function makeApiError(code: string, status: number): Error {
const err = new Error("test") as Error & { code?: string; status?: number };
Object.defineProperty(err, "code", { value: code, configurable: true });
Object.defineProperty(err, "status", { value: status, configurable: true });
return err;
}

beforeEach(() => {
mockUseFriends.mockReset();
mockUseSocialListVisibility.mockReset();
mockUseSocialListUrlState.mockReset();
mockUseSocialListLifecycleReset.mockReset();
publishSocialListLoadedMock.mockReset();
mockUseSocialListUrlState.mockReturnValue({
cursor: null,
limit: 20,
setCursor: vi.fn(),
setLimit: vi.fn(),
reset: vi.fn(),
  });

mockUseSocialListVisibility.mockReturnValue({
canViewFriends: true,
canViewBlocked: false,
canViewCounts: true,
isOwner: false,
isMutualFriend: true,
isAuthenticated: true,
isPrivateProfile: false,
  });
mockUseFriends.mockReturnValue({
users: summaries,
isLoading: false,
isStale: false,
hasMore: true,
loadMore: vi.fn(),
error: null,
retry: vi.fn(),
  });
});

describe("FriendsList", () => {
it("renders the privacy notice when canViewFriends is false", () => {
mockUseSocialListVisibility.mockReturnValue({
canViewFriends: false,
canViewBlocked: false,
canViewCounts: true,
isOwner: false,
isMutualFriend: false,
isAuthenticated: true,
isPrivateProfile: false,
    });
render(<FriendsList targetUserId="user-1" viewerIsOwner={false} />);
expect(
screen.getByTestId("privacy-restricted-notice-friends_only"),
    ).toBeInTheDocument();
  });

it("renders the privacy notice when the response is forbidden", () => {
mockUseFriends.mockReturnValue({
...EMPTY,
error: makeApiError("SOCIAL_FRIEND_LIST_FORBIDDEN", 403),
    });
render(<FriendsList targetUserId="user-1" viewerIsOwner={false} />);
expect(
screen.getByTestId("privacy-restricted-notice-friends_only"),
    ).toBeInTheDocument();
expect(screen.queryByTestId("social-list-error-state")).toBeNull();
  });

it("renders the privacy notice on a generic 403", () => {
mockUseFriends.mockReturnValue({
...EMPTY,
error: makeApiError("UNEXPECTED_CODE", 403),
    });
render(<FriendsList targetUserId="user-1" viewerIsOwner={false} />);
expect(
screen.getByTestId("privacy-restricted-notice-friends_only"),
    ).toBeInTheDocument();
  });

it("renders the list for a permitted viewer", () => {
render(<FriendsList targetUserId="user-1" viewerIsOwner={false} />);
const rows = screen.getAllByTestId("social-list-row-summary");
expect(rows.length).toBe(1);
  });

it("renders the empty state with the friends copy", () => {
mockUseFriends.mockReturnValue(EMPTY);
render(<FriendsList targetUserId="user-1" viewerIsOwner={false} />);
const empty = screen.getByTestId("social-list-empty-state-friends");
expect(empty.textContent).toMatch(/No friends yet/);
  });

it("renders the error state on a non-privacy error", () => {
mockUseFriends.mockReturnValue({
...EMPTY,
error: makeApiError("GLOBAL_INTERNAL_ERROR", 500),
    });
render(<FriendsList targetUserId="user-1" viewerIsOwner={false} />);
expect(screen.getByTestId("social-list-error-state")).toBeInTheDocument();
  });

it("publishes a list.loaded event after a successful load-more (TKT-6.2.G2)", () => {
const loadMore = vi.fn();
mockUseFriends.mockReturnValue({
users: summaries,
isLoading: false,
isStale: false,
hasMore: true,
loadMore,
error: null,
retry: vi.fn(),
    });
render(<FriendsList targetUserId="user-1" viewerIsOwner={false} />);
publishSocialListLoadedMock.mockClear();
screen.getByTestId("friends-list-load-more").click();
expect(publishSocialListLoadedMock).toHaveBeenCalledTimes(1);
const arg = publishSocialListLoadedMock.mock.calls[0]![0] as {
kind: string;
targetUserId: string;
    };
expect(arg.kind).toBe("friends");
expect(arg.targetUserId).toBe("user-1");
  });
});