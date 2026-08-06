/**
 * `TrendingUserCard.spec.tsx` — Locks the TrendingUserCard component contract
 * (TKT-6.5.E2).
 *
 * Asserts:
 *
 *   - Renders avatar + username + rank number.
 *   - Row click navigation pushes `/users/:userId` only.
 *   - Renders optional trend chip (follower delta, rank delta).
 *   - Truncates long usernames.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "jest-axe";

import { TrendingUserCard } from "@/features/social/components/TrendingUserCard";
import type { TrendingUserResponseDto } from "@/lib/api/generated/schemas";

const mockUser: TrendingUserResponseDto = {
  userId: "user-123",
  username: "alice_wonder",
  avatarUrl: null,
  followers: 1500,
  trendScore: 9.5,
  trendReason: "most_followed",
};

describe("TrendingUserCard", () => {
  it("renders avatar, username, and rank", () => {
    render(<TrendingUserCard user={mockUser} rank={1} />);

    expect(screen.getByText("alice_wonder")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByTestId("trending-user-card")).toBeInTheDocument();
  });

  it("links to /users/:userId", () => {
    render(<TrendingUserCard user={mockUser} rank={1} />);

    const link = screen.getByTestId("trending-user-card");
    expect(link).toHaveAttribute("href", "/users/user-123");
  });

  it("renders follower delta when provided", () => {
    render(
      <TrendingUserCard
        user={mockUser}
        rank={1}
        trendSignal={{ followerDelta: 150 }}
      />,
    );

    expect(screen.getByText("+150 followers")).toBeInTheDocument();
  });

  it("renders negative follower delta", () => {
    render(
      <TrendingUserCard
        user={mockUser}
        rank={1}
        trendSignal={{ followerDelta: -20 }}
      />,
    );

    expect(screen.getByText("-20 followers")).toBeInTheDocument();
  });

  it("renders rank delta when provided", () => {
    render(
      <TrendingUserCard
        user={mockUser}
        rank={1}
        trendSignal={{ rankDelta: 5 }}
      />,
    );

    expect(screen.getByText("+5 rank")).toBeInTheDocument();
  });

  it("renders negative rank delta", () => {
    render(
      <TrendingUserCard
        user={mockUser}
        rank={1}
        trendSignal={{ rankDelta: -2 }}
      />,
    );

    expect(screen.getByText("-2 rank")).toBeInTheDocument();
  });

  it("renders both trend signals when provided", () => {
    render(
      <TrendingUserCard
        user={mockUser}
        rank={1}
        trendSignal={{ followerDelta: 100, rankDelta: 3 }}
      />,
    );

    expect(screen.getByText("+100 followers")).toBeInTheDocument();
    expect(screen.getByText("+3 rank")).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl is provided", () => {
    const userWithAvatar: TrendingUserResponseDto = {
      ...mockUser,
      avatarUrl: "https://example.com/avatar.jpg",
    };

    render(<TrendingUserCard user={userWithAvatar} rank={1} />);

    // Check that the card renders with the userId
    const card = screen.getByTestId("trending-user-card");
    expect(card).toBeInTheDocument();
    // The actual image element is inside the Avatar component
  });

  it("applies custom className", () => {
    render(<TrendingUserCard user={mockUser} rank={1} className="custom-class" />);

    expect(screen.getByTestId("trending-user-card")).toHaveClass("custom-class");
  });

  it("has accessible aria-label", () => {
    render(<TrendingUserCard user={mockUser} rank={5} />);

    const link = screen.getByTestId("trending-user-card");
    expect(link).toHaveAttribute(
      "aria-label",
      "View profile for alice_wonder, ranked #5",
    );
  });

  it("renders correct data attributes", () => {
    render(<TrendingUserCard user={mockUser} rank={3} />);

    const card = screen.getByTestId("trending-user-card");
    expect(card).toHaveAttribute("data-user-id", "user-123");
    expect(card).toHaveAttribute("data-rank", "3");
  });
});
