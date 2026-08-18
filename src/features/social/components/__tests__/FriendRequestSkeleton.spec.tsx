

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FriendRequestSkeleton } from "@/features/social/components/FriendRequestSkeleton";

describe("FriendRequestSkeleton — TKT-6.8.E8", () => {
it("renders the default count (5 rows)", () => {
render(<FriendRequestSkeleton />);
const root = screen.getByTestId("friend-request-skeleton");
expect(root.getAttribute("data-row-count")).toBe("5");
expect(root.getAttribute("aria-busy")).toBe("true");
  });

it("renders a custom count", () => {
render(<FriendRequestSkeleton count={8} />);
const root = screen.getByTestId("friend-request-skeleton");
expect(root.getAttribute("data-row-count")).toBe("8");
  });

it("has aria-label 'Loading friend requests'", () => {
render(<FriendRequestSkeleton />);
expect(
screen.getByLabelText("Loading friend requests"),
    ).toBeInTheDocument();
  });
});
