

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { FollowErrorBanner } from "@/features/social/components/FollowErrorBanner";

describe("FollowErrorBanner — TKT-6.6.E4", () => {
describe("error === null", () => {
it("renders nothing", () => {
const { container } = render(<FollowErrorBanner error={null} />);
expect(container).toBeEmptyDOMElement();
    });
  });

describe("error copy — SOCIAL_ALREADY_FOLLOWING", () => {
it("shows 'You're already following this user.'", () => {
render(<FollowErrorBanner error="SOCIAL_ALREADY_FOLLOWING" />);
expect(screen.getByText("You're already following this user.")).toBeInTheDocument();
    });
  });

describe("error copy — SOCIAL_SELF_FOLLOW", () => {
it("shows 'You can't follow yourself.'", () => {
render(<FollowErrorBanner error="SOCIAL_SELF_FOLLOW" />);
expect(screen.getByText("You can't follow yourself.")).toBeInTheDocument();
    });
  });

describe("error copy — SOCIAL_USER_BLOCKED", () => {
it("shows 'You can't follow this user.'", () => {
render(<FollowErrorBanner error="SOCIAL_USER_BLOCKED" />);
expect(screen.getByText("You can't follow this user.")).toBeInTheDocument();
    });
  });

describe("error copy — SOCIAL_BLOCKED_USER", () => {
it("shows 'This user has blocked you.'", () => {
render(<FollowErrorBanner error="SOCIAL_BLOCKED_USER" />);
expect(screen.getByText("This user has blocked you.")).toBeInTheDocument();
    });
  });

describe("error copy — UNAUTHORIZED (GLOBAL_UNAUTHENTICATED)", () => {
it("shows 'Sign in to follow users.'", () => {
render(<FollowErrorBanner error="GLOBAL_UNAUTHENTICATED" />);
expect(screen.getByText("Sign in to follow users.")).toBeInTheDocument();
    });
  });

describe("error copy — RATE_LIMITED (GLOBAL_RATE_LIMITED)", () => {
it("shows the rate-limit message", () => {
render(<FollowErrorBanner error="GLOBAL_RATE_LIMITED" />);
expect(
screen.getByText("You're doing that too much. Please wait a moment and try again."),
      ).toBeInTheDocument();
    });

it("shows a retry button (retryable)", () => {
render(<FollowErrorBanner error="GLOBAL_RATE_LIMITED" onRetry={vi.fn()} />);
expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

describe("error copy — NETWORK_ERROR", () => {
it("shows the network error message", () => {
render(<FollowErrorBanner error="NETWORK_ERROR" />);
expect(
screen.getByText("Network error. Check your connection and try again."),
      ).toBeInTheDocument();
    });

it("shows a retry button (retryable)", () => {
render(<FollowErrorBanner error="NETWORK_ERROR" onRetry={vi.fn()} />);
expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

describe("error copy — INTERNAL_SERVER_ERROR (GLOBAL_INTERNAL_ERROR)", () => {
it("shows the 500 message", () => {
render(<FollowErrorBanner error="GLOBAL_INTERNAL_ERROR" />);
expect(
screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
    });

it("shows a retry button (retryable)", () => {
render(<FollowErrorBanner error="GLOBAL_INTERNAL_ERROR" onRetry={vi.fn()} />);
expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

describe("retry button", () => {
it("calls onRetry when clicked", () => {
const onRetry = vi.fn();
render(<FollowErrorBanner error="GLOBAL_RATE_LIMITED" onRetry={onRetry} />);
screen.getByRole("button", { name: /retry/i }).click();
expect(onRetry).toHaveBeenCalledTimes(1);
    });

it("is NOT rendered for non-retryable errors (SOCIAL_ALREADY_FOLLOWING)", () => {
render(<FollowErrorBanner error="SOCIAL_ALREADY_FOLLOWING" onRetry={vi.fn()} />);
expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });

it("is NOT rendered for UNAUTHORIZED", () => {
render(<FollowErrorBanner error="GLOBAL_UNAUTHENTICATED" onRetry={vi.fn()} />);
expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });

it("does NOT crash when onRetry is omitted (retryable error)", () => {

const { container } = render(<FollowErrorBanner error="GLOBAL_RATE_LIMITED" />);
expect(container).not.toBeEmptyDOMElement();
expect(screen.getByText(/doing that too much/i)).toBeInTheDocument();
    });
  });

describe("role and aria", () => {
it("has role='alert' for accessibility", () => {
render(<FollowErrorBanner error="GLOBAL_INTERNAL_ERROR" />);
expect(screen.getByRole("alert")).toBeInTheDocument();
    });

it("has aria-live='polite'", () => {
const { container } = render(<FollowErrorBanner error="GLOBAL_INTERNAL_ERROR" />);
expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    });
  });

describe("renders for any FollowErrorCode (catches unknown codes gracefully)", () => {
it("renders without crashing for an unknown GLOBAL_* code", () => {

const { container } = render(<FollowErrorBanner error="GLOBAL_BAD_REQUEST" />);
expect(container).not.toBeEmptyDOMElement();
    });
  });
});
