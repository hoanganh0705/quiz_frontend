/**
 * `SuggestionsPanel.spec.tsx` — Locks the suggestions panel page contract
 * (TKT-6.5.E1).
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SuggestionsPanel } from "@/features/social/lists/SuggestionsPanel";
import type { SocialSuggestionItemDto } from "@/features/social/types";

// ─── Mock all dependencies ─────────────────────────────────────────────────

const mockUseSuggestions = vi.fn();
vi.mock("@/features/social/hooks/useSuggestions", () => ({
  useSuggestions: (...args: unknown[]) => mockUseSuggestions(...args),
}));

const mockBlockedContentGate = vi.fn(({ children }: { children: React.ReactNode }) => children);
vi.mock("@/features/social/components/BlockedContentGate", () => ({
  BlockedContentGate: (props: { children: React.ReactNode }) => mockBlockedContentGate(props),
}));

const mockSocialListRow = vi.fn(({ user }: { user: unknown }) => (
  <div data-testid="social-list-row">
    {(user as { userName?: string }).userName ?? "unknown"}
  </div>
));
vi.mock("@/features/social/components/SocialListRow", () => ({
  SocialListRow: (props: { user: unknown }) => mockSocialListRow(props),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────

const alice: SocialSuggestionItemDto = {
  id: "sug-1",
  user: {
    userId: "u1",
    userName: "alice",
    displayName: "Alice A.",
    avatarUrl: null,
    isPrivate: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  mutualFriendsCount: 3,
  reason: "mutual_friends",
};

const bob: SocialSuggestionItemDto = {
  id: "sug-2",
  user: {
    userId: "u2",
    userName: "bob",
    displayName: "Bob B.",
    avatarUrl: null,
    isPrivate: false,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  mutualFriendsCount: 1,
  reason: "mutual_friends",
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
  mockUseSuggestions.mockReset();
  mockUseSuggestions.mockReturnValue(visibleResult);
  mockBlockedContentGate.mockClear();
  mockSocialListRow.mockClear();
});

describe("SuggestionsPanel", () => {
  it("renders PrivacyRestrictedNotice for blocked_by_viewer visibility", () => {
    mockUseSuggestions.mockReturnValueOnce({
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

    render(<SuggestionsPanel targetUserId="target-1" />);

    expect(screen.getByTestId(/privacy-restricted-notice/)).toBeInTheDocument();
  });

  it("renders PrivacyRestrictedNotice for not_found visibility", () => {
    mockUseSuggestions.mockReturnValueOnce({
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

    render(<SuggestionsPanel targetUserId="target-1" />);

    expect(screen.getByTestId(/privacy-restricted-notice/)).toBeInTheDocument();
  });

  it("renders SearchResultSkeleton when loading", () => {
    mockUseSuggestions.mockReturnValueOnce({
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

    render(<SuggestionsPanel targetUserId="target-1" />);

    expect(screen.getByTestId("search-result-skeleton-suggestions")).toBeInTheDocument();
  });

  it("renders SearchEmptyState when items are empty and not loading", () => {
    mockUseSuggestions.mockReturnValueOnce({
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

    render(<SuggestionsPanel targetUserId="target-1" />);

    expect(screen.getByTestId("search-empty-state")).toBeInTheDocument();
  });

  it("renders section with correct data-testid when visible", () => {
    render(<SuggestionsPanel targetUserId="target-1" />);

    expect(screen.getByTestId("suggestions-panel")).toBeInTheDocument();
  });

  it("renders rows when items are present", () => {
    render(<SuggestionsPanel targetUserId="target-1" />);

    expect(screen.getAllByTestId("social-list-row")).toHaveLength(2);
  });

  it("renders load more button when hasMore is true", () => {
    mockUseSuggestions.mockReturnValueOnce({
      ...visibleResult,
      hasMore: true,
    });

    render(<SuggestionsPanel targetUserId="target-1" />);

    expect(screen.getByTestId("suggestions-load-more")).toBeInTheDocument();
  });

  it("calls useSuggestions when rendered", () => {
    render(<SuggestionsPanel targetUserId="custom-target" />);

    expect(mockUseSuggestions).toHaveBeenCalled();
  });
});
