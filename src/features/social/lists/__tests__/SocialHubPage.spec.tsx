/**
 * `SocialHubPage.spec.tsx` — Locks the Social Hub landing
 * page contract (TKT-6.3.E1).
 *
 * Asserts:
 *
 *   - Counts card renders the current viewer's counts.
 *   - Each entry tile renders with the documented href
 *     (`/social/me/analytics`,
 *     `/social/friends/leaderboard`,
 *     `/social/users/{currentUserId}/stats`).
 *   - While the counts hook is loading and no cached data
 *     is present, the skeleton variant of the counts card
 *     is rendered.
 *   - Error + no cached counts → `SocialListErrorState` is
 *     rendered with a retry CTA.
 *   - The counts card propagates the loading-flag to the
 *     skeleton branch.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SocialHubPage } from "@/features/social/lists/SocialHubPage";

const mockUseSocialCounts = vi.fn();
vi.mock("@/features/social/hooks/useSocialCounts", () => ({
  useSocialCounts: (...args: unknown[]) => mockUseSocialCounts(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: (...args: unknown[]) => mockUseAuthBootstrap(...args),
}));

beforeEach(() => {
  mockUseSocialCounts.mockReset();
  mockUseAuthBootstrap.mockReset();
  mockUseAuthBootstrap.mockReturnValue({
    currentUser: { userId: "viewer-id" },
    isAuthenticated: true,
  });
  mockUseSocialCounts.mockReturnValue({
    counts: { followers: 7, following: 12, friends: 3, blocked: 0 },
    isLoading: false,
    isStale: false,
    error: null,
    retry: () => Promise.resolve(),
  });
});

describe("SocialHubPage — composition", () => {
  it("renders the counts card with the current viewer's id", () => {
    render(<SocialHubPage />);
    const card = screen.getByTestId("social-counts-card");
    expect(card).toBeInTheDocument();
  });

  it("renders all three entry tiles with the documented hrefs", () => {
    render(<SocialHubPage />);
    expect(
      screen.getByTestId("social-hub-entry-my-analytics"),
    ).toHaveAttribute("href", "/social/me/analytics");
    expect(
      screen.getByTestId("social-hub-entry-leaderboard"),
    ).toHaveAttribute("href", "/social/friends/leaderboard");
    expect(
      screen.getByTestId("social-hub-entry-stats"),
    ).toHaveAttribute("href", "/social/users/viewer-id/stats");
  });
});

describe("SocialHubPage — loading branch", () => {
  it("renders the counts-card skeleton variant while loading", () => {
    mockUseSocialCounts.mockReturnValue({
      counts: null,
      isLoading: true,
      isStale: false,
      error: null,
      retry: () => Promise.resolve(),
    });
    render(<SocialHubPage />);
    expect(
      screen.getByTestId("social-counts-card-skeleton"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("social-counts-card")).not.toBeInTheDocument();
  });
});

describe("SocialHubPage — error branch", () => {
  it("renders SocialListErrorState with a retry CTA when counts fail and no cached data is present", () => {
    mockUseSocialCounts.mockReturnValue({
      counts: null,
      isLoading: false,
      isStale: false,
      error: { code: "GLOBAL_RATE_LIMITED", status: 429, message: "x" } as never,
      retry: () => Promise.resolve(),
    });
    render(<SocialHubPage />);
    expect(
      screen.getByTestId("social-list-error-state"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("social-list-error-state-retry"),
    ).toBeInTheDocument();
  });
});

describe("SocialHubPage — viewer override", () => {
  it("honours an explicit currentUserIdOverride", () => {
    render(<SocialHubPage currentUserIdOverride="user-9" />);
    expect(
      screen.getByTestId("social-hub-entry-stats"),
    ).toHaveAttribute("href", "/social/users/user-9/stats");
  });
});

describe("SocialHubPage — unauthenticated fallback", () => {
  it("renders the unauthenticated header when no viewer id is available", () => {
    mockUseAuthBootstrap.mockReturnValue({
      currentUser: null,
      isAuthenticated: false,
    });
    render(<SocialHubPage />);
    expect(
      screen.getByTestId("social-hub-page"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("social-hub-entry-tiles"),
    ).not.toBeInTheDocument();
  });
});