/**
 * `ActivitySkeleton.spec.tsx` — Locks the activity-stream skeleton
 * shape (TKT-6.4.B3).
 *
 * Asserts:
 *
 *   - Renders the documented `data-testid` and `aria-busy`.
 *   - Renders 10 row placeholders by default.
 *   - Honors an explicit `rowCount` override.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActivitySkeleton } from "@/features/social/components/ActivitySkeleton";

describe("ActivitySkeleton", () => {
  it("renders the documented data-testid and aria-busy", () => {
    render(<ActivitySkeleton />);
    const skeleton = screen.getByTestId("activity-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.getAttribute("aria-busy")).toBe("true");
  });

  it("renders 10 row placeholders by default", () => {
    render(<ActivitySkeleton />);
    const skeleton = screen.getByTestId("activity-skeleton");
    expect(skeleton.getAttribute("data-row-count")).toBe("10");
  });

  it("honors an explicit rowCount override", () => {
    render(<ActivitySkeleton rowCount={4} />);
    const skeleton = screen.getByTestId("activity-skeleton");
    expect(skeleton.getAttribute("data-row-count")).toBe("4");
  });
});
