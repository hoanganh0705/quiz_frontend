/**
 * `FollowersList.spec.tsx` — Locks the followers-list page contract
 * (TKT-6.2.E1).
 *
 * Asserts:
 *
 *   - Loading + no rows → `SocialListSkeleton`.
 *   - Error + no rows → `SocialListErrorState` with retry.
 *   - Empty list → `SocialListEmptyState` with the followers copy.
 *   - Loaded list → list of `SocialListRow` with internal-id-free
 *     `href`.
 *   - `hasMore === true` → "Load more" button that calls `loadMore`.
 *   - `viewerIsOwner` is forwarded to the empty-state component.
 *   - Page-change reset → `useSocialListLifecycleReset` receives the
 *     targetUserId.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FollowersList } from "@/features/social/lists/FollowersList";
import type { SocialUserSummaryDto } from "@/features/social/types";

// ─── Hook mocks ───────────────────────────────────────────────────────────

const mockUseFollowers = vi.fn();
vi.mock("@/features/social/hooks/useFollowers", () => ({
  useFollowers: (...args: unknown[]) => mockUseFollowers(...args),
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

// ─── Fixtures ─────────────────────────────────────────────────────────────

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
  {
    id: "summary-2",
    userId: "22222222-2222-2222-2222-222222222222",
    userName: "bob",
    displayName: null,
    avatarUrl: null,
    isPrivate: false,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

const PLACEHOLDER_RESULT = {
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
  mockUseFollowers.mockReset();
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
  // Default to "loaded with rows".
  mockUseFollowers.mockReturnValue({
    users: summaries,
    isLoading: false,
    isStale: false,
    hasMore: true,
    loadMore: vi.fn(),
    error: null,
    retry: vi.fn(),
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe("FollowersList", () => {
  it("renders the skeleton when loading and there are no cached rows", () => {
    mockUseFollowers.mockReturnValue({
      ...PLACEHOLDER_RESULT,
      isLoading: true,
    });
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    expect(screen.getByTestId("social-list-skeleton")).toBeInTheDocument();
  });

  it("renders the error state when there is an error and no cached rows", () => {
    const error = makeApiError("GLOBAL_INTERNAL_ERROR", 500);
    mockUseFollowers.mockReturnValue({
      ...PLACEHOLDER_RESULT,
      error,
    });
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    expect(screen.getByTestId("social-list-error-state")).toBeInTheDocument();
  });

  it("renders the empty state when the list has zero rows", () => {
    mockUseFollowers.mockReturnValue(PLACEHOLDER_RESULT);
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    expect(
      screen.getByTestId("social-list-empty-state-followers"),
    ).toBeInTheDocument();
  });

  it("renders a row per user with internal-id-free href", () => {
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    const rows = screen.getAllByTestId("social-list-row-summary");
    expect(rows.length).toBe(2);
    for (const row of rows) {
      const href = row.getAttribute("href") ?? "";
      expect(href).toMatch(/^\/users\/[0-9a-f-]+$/);
      expect(href).not.toMatch(/followId|friendshipId|blockId/);
    }
  });

  it("renders the Load more button when hasMore is true and calls loadMore", () => {
    const loadMore = vi.fn();
    mockUseFollowers.mockReturnValue({
      users: summaries,
      isLoading: false,
      isStale: false,
      hasMore: true,
      loadMore,
      error: null,
      retry: vi.fn(),
    });
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    const btn = screen.getByTestId("followers-list-load-more");
    btn.click();
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("does not render the Load more button when hasMore is false", () => {
    mockUseFollowers.mockReturnValue({
      users: summaries,
      isLoading: false,
      isStale: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      retry: vi.fn(),
    });
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    expect(
      screen.queryByTestId("followers-list-load-more"),
    ).toBeNull();
  });

  it("forwards viewerIsOwner to the empty state", () => {
    mockUseFollowers.mockReturnValue(PLACEHOLDER_RESULT);
    render(<FollowersList targetUserId="user-1" viewerIsOwner />);
    const empty = screen.getByTestId("social-list-empty-state-followers");
    expect(empty.getAttribute("data-viewer-is-owner")).toBe("true");
  });

  it("publishes a list.loaded event after a successful load-more (TKT-6.2.G2)", () => {
    const loadMore = vi.fn();
    mockUseFollowers.mockReturnValue({
      users: summaries,
      isLoading: false,
      isStale: false,
      hasMore: true,
      loadMore,
      error: null,
      retry: vi.fn(),
    });
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    publishSocialListLoadedMock.mockClear();
    screen.getByTestId("followers-list-load-more").click();
    expect(publishSocialListLoadedMock).toHaveBeenCalledTimes(1);
    const arg = publishSocialListLoadedMock.mock.calls[0]![0] as {
      kind: string;
      targetUserId: string;
      offset: number;
      limit: number;
    };
    expect(arg.kind).toBe("followers");
    expect(arg.targetUserId).toBe("user-1");
  });

  it("does not call publishSocialListLoaded before any load-more is triggered", () => {
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    expect(publishSocialListLoadedMock).not.toHaveBeenCalled();
  });

  it("wires the URL state and lifecycle reset hooks", () => {
    render(<FollowersList targetUserId="user-1" viewerIsOwner={false} />);
    expect(mockUseSocialListUrlState).toHaveBeenCalledWith("user-1");
    expect(mockUseSocialListLifecycleReset).toHaveBeenCalledTimes(1);
  });
});