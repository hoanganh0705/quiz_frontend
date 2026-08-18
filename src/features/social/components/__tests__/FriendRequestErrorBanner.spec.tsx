

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { FriendRequestErrorBanner } from "@/features/social/components/FriendRequestErrorBanner";

describe("FriendRequestErrorBanner — TKT-6.8.E10", () => {
it("renders nothing when error is null", () => {
const { container } = render(
<FriendRequestErrorBanner error={null} />,
    );
expect(container.firstChild).toBeNull();
  });

it("renders a generic fallback for unknown codes", () => {
render(<FriendRequestErrorBanner error="NOT_A_REAL_CODE" />);
expect(screen.getByText("Something went wrong")).toBeInTheDocument();
expect(screen.getByRole("alert")).toBeInTheDocument();
  });

it("renders code-specific copy for SOCIAL_SELF_FRIEND_REQUEST", () => {
render(
<FriendRequestErrorBanner
error="SOCIAL_SELF_FRIEND_REQUEST"
      />,
    );
expect(screen.getByText("Can't send to yourself")).toBeInTheDocument();
expect(
screen.getByText(/cannot send a friend request to yourself/),
    ).toBeInTheDocument();
  });

it("renders the terminal-state copy for SOCIAL_FRIEND_REQUEST_NOT_FOUND", () => {
render(
<FriendRequestErrorBanner
error="SOCIAL_FRIEND_REQUEST_NOT_FOUND"
      />,
    );
expect(screen.getByText("Action completed")).toBeInTheDocument();
  });

it("renders the retry button for retryable codes", () => {
render(
<FriendRequestErrorBanner
error="GLOBAL_RATE_LIMITED"
onAction={() => undefined}
      />,
    );
expect(screen.getByLabelText("Try again")).toBeInTheDocument();
  });

it("does not render the retry button when no action is provided", () => {
render(
<FriendRequestErrorBanner error="GLOBAL_RATE_LIMITED" />,
    );
expect(
screen.queryByLabelText("Try again"),
    ).not.toBeInTheDocument();
  });

it("invokes onAction when the retry button is clicked", () => {
const onAction = vi.fn();
render(
<FriendRequestErrorBanner
error="GLOBAL_RATE_LIMITED"
onAction={onAction}
      />,
    );
fireEvent.click(screen.getByLabelText("Try again"));
expect(onAction).toHaveBeenCalledTimes(1);
  });

it("does not render a retry button for non-retryable codes", () => {
render(
<FriendRequestErrorBanner
error="SOCIAL_SELF_FRIEND_REQUEST"
onAction={() => undefined}
      />,
    );
expect(screen.queryByLabelText("Try again")).not.toBeInTheDocument();
  });

it("has aria-live='polite' on the alert", () => {
render(
<FriendRequestErrorBanner error="GLOBAL_INTERNAL_ERROR" />,
    );
expect(
screen.getByRole("alert").getAttribute("aria-live"),
    ).toBe("polite");
  });
});
