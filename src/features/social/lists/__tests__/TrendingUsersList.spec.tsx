/**
 * `TrendingUsersList.spec.tsx` — Locks the TrendingUsersList page contract
 * (TKT-6.5.E2).
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrendingUsersList } from "@/features/social/lists/TrendingUsersList";
import type { TrendingUserResponseDto } from "@/lib/api/generated/schemas";

// ─── Mock all dependencies ─────────────────────────────────────────────────

const mockUseTrendingUsers = vi.fn();
vi.mock("@/features/social/hooks/useTrendingUsers", () => ({
  useTrendingUsers: (...args: unknown[]) => mockUseTrendingUsers(...args),
}));

const mockBlockedContentGate = vi.fn(({ children }: { children: React.ReactNode }) => children);
vi.mock("@/features/social/components/BlockedContentGate", () => ({
  BlockedContentGate: (props: { children: React.ReactNode }) => mockBlockedContentGate(props),
}));

const mockTrendingUserCard = vi.fn(
  ({ user, rank }: { user: TrendingUserResponseDto; rank: number }) => (
    <div data-testid="trending-user-card" data-user-id={user.userId} data-rank={rank}>
      {user.username} #{rank}
    </div>
  ),
);
vi.mock("@/features/social/components/TrendingUserCard", () => ({
  TrendingUserCard: (props: { user: TrendingUserResponseDto; rank: number }) =>
    mockTrendingUserCard(props),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────

const alice: TrendingUserResponseDto = {
  userId: "u1",
  username: "alice",
  avatarUrl: null,
  followers: 1500,
  trendScore: 9.5,
  trendReason: "most_followed",
};

const bob: TrendingUserResponseDto = {
  userId: "u2",
  username: "bob",
  avatarUrl: null,
  followers: 1200,
  trendScore: 8.0,
  trendReason: "fastest_growing",
};

const visibleResult = {
  items: [alice, bob],
  total: 2,
  visibility: "visible" as const,
  isLoading: false,
  isStale: false,
  hasMore: false,
  loadMore: vi.fn(),
  error: null,
  retry: vi.fn(),
};

beforeEach(() => {
  mockUseTrendingUsers.mockReset();
  mockUseTrendingUsers.mockReturnValue(visibleResult);
  mockBlockedContentGate.mockClear();
  mockTrendingUserCard.mockClear();
});

describe("TrendingUsersList", () => {
  it("renders PrivacyRestrictedNotice for blocked_by_viewer visibility", () => {
    mockUseTrendingUsers.mockReturnValueOnce({
      items: [],
      total: 0,
      visibility: "blocked_by_viewer",
      isLoading: false,
      isStale: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      retry: vi.fn(),
    });

    render(<TrendingUsersList />);

    expect(screen.getByTestId(/privacy-restricted-notice/)).toBeInTheDocument();
  });

  it("renders PrivacyRestrictedNotice for not_found visibility", () => {
    mockUseTrendingUsers.mockReturnValueOnce({
      items: [],
      total: 0,
      visibility: "not_found",
      isLoading: false,
      isStale: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      retry: vi.fn(),
    });

    render(<TrendingUsersList />);

    expect(screen.getByTestId(/privacy-restricted-notice/)).toBeInTheDocument();
  });

  it("renders SearchResultSkeleton when loading", () => {
    mockUseTrendingUsers.mockReturnValueOnce({
      items: [],
      total: 0,
      visibility: "visible",
      isLoading: true,
      isStale: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      retry: vi.fn(),
    });

    render(<TrendingUsersList />);

    expect(screen.getByTestId("search-result-skeleton-trending")).toBeInTheDocument();
  });

  it("renders SearchEmptyState when items are empty and not loading", () => {
    mockUseTrendingUsers.mockReturnValueOnce({
      items: [],
      total: 0,
      visibility: "visible",
      isLoading: false,
      isStale: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      retry: vi.fn(),
    });

    render(<TrendingUsersList />);

    expect(screen.getByTestId("search-empty-state")).toBeInTheDocument();
  });

  it("renders section with correct data-testid when visible", () => {
    render(<TrendingUsersList />);

    expect(screen.getByTestId("trending-users-list")).toBeInTheDocument();
  });

  it("renders cards when items are present", () => {
    render(<TrendingUsersList />);

    expect(screen.getAllByTestId("trending-user-card")).toHaveLength(2);
  });

  it("renders cards with correct ranks", () => {
    render(<TrendingUsersList />);

    const cards = screen.getAllByTestId("trending-user-card");
    expect(cards[0]).toHaveAttribute("data-rank", "1");
    expect(cards[1]).toHaveAttribute("data-rank", "2");
  });

  it("renders load more button when hasMore is true", () => {
    mockUseTrendingUsers.mockReturnValueOnce({
      ...visibleResult,
      hasMore: true,
    });

    render(<TrendingUsersList />);

    expect(screen.getByTestId("trending-users-load-more")).toBeInTheDocument();
  });

  it("calls useTrendingUsers without args (no targetUserId)", () => {
    render(<TrendingUsersList />);

    expect(mockUseTrendingUsers).toHaveBeenCalledWith();
  });
});
