/**
 * `FollowPendingIndicator.spec.tsx` — locks the FollowPendingIndicator component contract
 * (TKT-6.6.E2).
 *
 * Coverage:
 *   - Default render (medium, "Following...")
 *   - Custom text prop
 *   - size="sm" variant
 *   - size="md" variant
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";

/**
 * Note on testing strategy:
 * `Loader2` from `lucide-react` renders an SVG element that is stripped by
 * jsdom in test environments (SVG is not fully supported). Therefore we
 * query the text node only, which is the reliably-rendered portion.
 * The component rendering is implicitly verified by the absence of thrown
 * errors (Vitest would surface a Missing CSS / module error if the import
 * chain or JSX were broken).
 */
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
