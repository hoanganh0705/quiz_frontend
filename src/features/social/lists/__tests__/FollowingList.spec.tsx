/**
 * `FollowingList.spec.tsx` — Locks the following-list page contract
 * (TKT-6.2.E2).
 *
 * Mirrors FollowersList.spec.tsx but covers the following copy.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FollowingList } from "@/features/social/lists/FollowingList";
import type { SocialUserSummaryDto } from "@/features/social/types";

const mockUseFollowing = vi.fn();
vi.mock("@/features/social/hooks/useFollowing", () => ({
  useFollowing: (...args: unknown[]) => mockUseFollowing(...args),
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

beforeEach(() => {
  mockUseFollowing.mockReset();
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
  mockUseFollowing.mockReturnValue({
    users: summaries,
    isLoading: false,
    isStale: false,
    hasMore: true,
    loadMore: vi.fn(),
    error: null,
    retry: vi.fn(),
  });
});

describe("FollowingList", () => {
  it("renders the skeleton when loading and there are no cached rows", () => {
    mockUseFollowing.mockReturnValue({ ...EMPTY, isLoading: true });
    render(<FollowingList targetUserId="user-1" viewerIsOwner={false} />);
    expect(screen.getByTestId("social-list-skeleton")).toBeInTheDocument();
  });

  it("renders the error state when there is an error and no cached rows", () => {
    const error = Object.assign(new Error("test"), {
      code: "GLOBAL_INTERNAL_ERROR",
      status: 500,
    });
    mockUseFollowing.mockReturnValue({ ...EMPTY, error });
    render(<FollowingList targetUserId="user-1" viewerIsOwner={false} />);
    expect(screen.getByTestId("social-list-error-state")).toBeInTheDocument();
  });

  it("renders the empty state with the 'following' copy", () => {
    mockUseFollowing.mockReturnValue(EMPTY);
    render(<FollowingList targetUserId="user-1" viewerIsOwner={false} />);
    const empty = screen.getByTestId("social-list-empty-state-following");
    expect(empty.textContent).toMatch(/Not following anyone yet/);
  });

  it("renders a row per user with internal-id-free href", () => {
    render(<FollowingList targetUserId="user-1" viewerIsOwner={false} />);
    const rows = screen.getAllByTestId("social-list-row-summary");
    expect(rows.length).toBe(1);
    const href = rows[0]!.getAttribute("href") ?? "";
    expect(href).toMatch(/^\/users\/[0-9a-f-]+$/);
    expect(href).not.toMatch(/followId|friendshipId|blockId/);
  });

  it("renders the Load more button when hasMore is true", () => {
    const loadMore = vi.fn();
    mockUseFollowing.mockReturnValue({
      users: summaries,
      isLoading: false,
      isStale: false,
      hasMore: true,
      loadMore,
      error: null,
      retry: vi.fn(),
    });
    render(<FollowingList targetUserId="user-1" viewerIsOwner={false} />);
    screen.getByTestId("following-list-load-more").click();
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("publishes a list.loaded event after a successful load-more (TKT-6.2.G2)", () => {
    const loadMore = vi.fn();
    mockUseFollowing.mockReturnValue({
      users: summaries,
      isLoading: false,
      isStale: false,
      hasMore: true,
      loadMore,
      error: null,
      retry: vi.fn(),
    });
    render(<FollowingList targetUserId="user-1" viewerIsOwner={false} />);
    publishSocialListLoadedMock.mockClear();
    screen.getByTestId("following-list-load-more").click();
    expect(publishSocialListLoadedMock).toHaveBeenCalledTimes(1);
    const arg = publishSocialListLoadedMock.mock.calls[0]![0] as {
      kind: string;
      targetUserId: string;
      offset: number;
      limit: number;
    };
    expect(arg.kind).toBe("following");
    expect(arg.targetUserId).toBe("user-1");
    expect(typeof arg.offset).toBe("number");
    expect(typeof arg.limit).toBe("number");
  });

  it("wires the URL state and lifecycle reset hooks", () => {
    render(<FollowingList targetUserId="user-1" viewerIsOwner={false} />);
    expect(mockUseSocialListUrlState).toHaveBeenCalledWith("user-1");
    expect(mockUseSocialListLifecycleReset).toHaveBeenCalledTimes(1);
  });
});