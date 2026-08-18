

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";

describe("FollowPendingIndicator — TKT-6.6.E2", () => {
it("renders with default text 'Following...' and size 'md'", () => {
render(<FollowPendingIndicator />);
expect(screen.getByText("Following...")).toBeInTheDocument();
  });

it("renders with custom text prop", () => {
render(<FollowPendingIndicator text="Unfollowing..." />);
expect(screen.getByText("Unfollowing...")).toBeInTheDocument();
  });

it("renders size='sm' variant without crashing", () => {
render(<FollowPendingIndicator size="sm" />);
expect(screen.getByText("Following...")).toBeInTheDocument();
  });

it("renders size='md' variant without crashing", () => {
render(<FollowPendingIndicator size="md" />);
expect(screen.getByText("Following...")).toBeInTheDocument();
  });

it("accepts size prop without crashing (sm and md)", () => {
const { rerender } = render(<FollowPendingIndicator size="sm" />);
expect(screen.getByText("Following...")).toBeInTheDocument();

rerender(<FollowPendingIndicator size="md" />);
expect(screen.getByText("Following...")).toBeInTheDocument();
  });

it("passes custom text through to the rendered output", () => {
const { rerender } = render(<FollowPendingIndicator text="Processing..." />);
expect(screen.getByText("Processing...")).toBeInTheDocument();

rerender(<FollowPendingIndicator text="Almost done..." />);
expect(screen.getByText("Almost done...")).toBeInTheDocument();
  });
});
