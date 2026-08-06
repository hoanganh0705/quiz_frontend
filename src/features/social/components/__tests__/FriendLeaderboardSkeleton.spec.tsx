/**
 * `FriendLeaderboardSkeleton.spec.tsx` — Locks the Friend Leaderboard
 * loading shape (TKT-6.3.C4).
 *
 * Asserts:
 *
 *   - The skeleton root has `aria-busy="true"`.
 *   - The default `rowCount` mirrors `SOCIAL_GRAPH_DEFAULT_LIMIT`
 *     (20).
 *   - An explicit `rowCount` overrides the default.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FriendLeaderboardSkeleton } from "@/features/social/components/FriendLeaderboardSkeleton";
import { SOCIAL_GRAPH_DEFAULT_LIMIT } from "@/features/social/pagination-invariants";

describe("FriendLeaderboardSkeleton", () => {
  it("renders aria-busy=true on the root", () => {
    render(<FriendLeaderboardSkeleton />);
    const root = screen.getByTestId("friend-leaderboard-skeleton");
    expect(root.getAttribute("aria-busy")).toBe("true");
  });

  it("uses role='status' for assistive tech announcements", () => {
    render(<FriendLeaderboardSkeleton />);
    const root = screen.getByTestId("friend-leaderboard-skeleton");
    expect(root.getAttribute("role")).toBe("status");
  });

  it("defaults to SOCIAL_GRAPH_DEFAULT_LIMIT rows", () => {
    render(<FriendLeaderboardSkeleton />);
    const root = screen.getByTestId("friend-leaderboard-skeleton");
    expect(root.getAttribute("data-row-count")).toBe(
      String(SOCIAL_GRAPH_DEFAULT_LIMIT),
    );
  });

  it("honours an explicit rowCount prop", () => {
    render(<FriendLeaderboardSkeleton rowCount={5} />);
    const root = screen.getByTestId("friend-leaderboard-skeleton");
    expect(root.getAttribute("data-row-count")).toBe("5");
  });
});