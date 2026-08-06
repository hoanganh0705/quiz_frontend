/**
 * `FriendRequestEmptyState.spec.tsx` — locks the `FriendRequestEmptyState`
 * contract (TKT-6.8.E9).
 *
 * Coverage:
 *
 *   - kind === 'incoming' renders the incoming copy
 *   - kind === 'outgoing' renders the outgoing copy
 *   - Each variant has a stable data-testid
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FriendRequestEmptyState } from "@/features/social/components/FriendRequestEmptyState";

describe("FriendRequestEmptyState — TKT-6.8.E9", () => {
  it("renders incoming copy when kind is 'incoming'", () => {
    render(<FriendRequestEmptyState kind="incoming" />);
    const root = screen.getByTestId("friend-request-empty-state-incoming");
    expect(root.getAttribute("aria-label")).toBe("No incoming requests");
    expect(screen.getByText(/No incoming requests/)).toBeInTheDocument();
    expect(screen.getByText(/When someone sends you a friend request/)).toBeInTheDocument();
  });

  it("renders outgoing copy when kind is 'outgoing'", () => {
    render(<FriendRequestEmptyState kind="outgoing" />);
    const root = screen.getByTestId("friend-request-empty-state-outgoing");
    expect(root.getAttribute("aria-label")).toBe("No outgoing requests");
    expect(screen.getByText(/No outgoing requests/)).toBeInTheDocument();
    expect(screen.getByText(/Friend requests you send/)).toBeInTheDocument();
  });
});
