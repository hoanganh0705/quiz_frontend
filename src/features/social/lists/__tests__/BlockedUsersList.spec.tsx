/**
 * `BlockedUsersList.spec.tsx` — Locks the blocked-users list page
 * contract (TKT-6.2.F2).
 *
 * Asserts:
 *
 *   - Non-owner viewer → `PrivacyRestrictedNotice` (and
 *     `useBlockedUsers` is NOT called).
 *   - Owner → list of `SocialListRow variant="blocked"`.
 *   - Empty list → `SocialListEmptyState` with the blocked copy.
 *   - 404 / 403 → `PrivacyRestrictedNotice` (defensive).
 *   - Non-privacy error → `SocialListErrorState`.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BlockedUsersList } from "@/features/social/lists/BlockedUsersList";
import type { SocialBlockedUserDto } from "@/features/social/types";

const mockUseBlockedUsers = vi.fn();
vi.mock("@/features/social/hooks/useBlockedUsers", () => ({
  useBlockedUsers: (...args: unknown[]) => mockUseBlockedUsers(...args),
}));

const mockUseSocialListVisibility = vi.fn();
vi.mock("@/features/social/hooks/useSocialListVisibility", () => ({
  useSocialListVisibility: (...args: unknown[]) =>
    mockUseSocialListVisibility(...args),
}));

const blocked: SocialBlockedUserDto[] = [
  {
    id: "blocked-1",
    userId: "11111111-1111-1111-1111-111111111111",
    user: {
      id: "summary-1",
      userId: "11111111-1111-1111-1111-111111111111",
      userName: "alice",
      displayName: null,
      avatarUrl: null,
      isPrivate: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    since: "2026-01-02T00:00:00.000Z",
  },
];

const EMPTY = {
  users: [] as readonly SocialBlockedUserDto[],
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
  mockUseBlockedUsers.mockReset();
  mockUseSocialListVisibility.mockReset();
  mockUseSocialListVisibility.mockReturnValue({
    canViewFriends: false,
    canViewBlocked: true,
    canViewCounts: true,
    isOwner: true,
    isMutualFriend: false,
    isAuthenticated: true,
    isPrivateProfile: false,
  });
  mockUseBlockedUsers.mockReturnValue({
    users: blocked,
    isLoading: false,
    isStale: false,
    hasMore: false,
    loadMore: () => undefined,
    error: null,
    retry: vi.fn(),
  });
});

describe("BlockedUsersList", () => {
  it("renders the privacy notice when canViewBlocked is false", () => {
    mockUseSocialListVisibility.mockReturnValue({
      canViewFriends: false,
      canViewBlocked: false,
      canViewCounts: true,
      isOwner: false,
      isMutualFriend: false,
      isAuthenticated: true,
      isPrivateProfile: false,
    });
    render(<BlockedUsersList />);
    expect(
      screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
  });

  it("renders the list with the blocked variant for an owner", () => {
    render(<BlockedUsersList />);
    const rows = screen.getAllByTestId("social-list-row-blocked");
    expect(rows.length).toBe(1);
    const href = rows[0]!.getAttribute("href") ?? "";
    expect(href).toMatch(/^\/users\/[0-9a-f-]+$/);
    expect(href).not.toMatch(/followId|friendshipId|blockId/);
  });

  it("renders the empty state with the blocked copy", () => {
    mockUseBlockedUsers.mockReturnValue(EMPTY);
    render(<BlockedUsersList />);
    const empty = screen.getByTestId("social-list-empty-state-blocked");
    expect(empty.textContent).toMatch(/No blocked users/);
  });

  it("renders the privacy notice on a 404 for a non-owner viewer", () => {
    mockUseBlockedUsers.mockReturnValue({
      ...EMPTY,
      error: makeApiError("GLOBAL_NOT_FOUND", 404),
    });
    render(<BlockedUsersList />);
    expect(
      screen.getByTestId("privacy-restricted-notice-not_available"),
    ).toBeInTheDocument();
  });

  it("renders the error state on a non-privacy error", () => {
    mockUseBlockedUsers.mockReturnValue({
      ...EMPTY,
      error: makeApiError("GLOBAL_INTERNAL_ERROR", 500),
    });
    render(<BlockedUsersList />);
    expect(screen.getByTestId("social-list-error-state")).toBeInTheDocument();
  });
});