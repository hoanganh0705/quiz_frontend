/**
 * `MutualListSkeleton.spec.tsx` — Locks the list skeleton shape
 * (TKT-6.4.B3).
 *
 * Asserts:
 *
 *   - Renders the documented `data-testid` and `aria-busy`.
 *   - Renders `MUTUAL_LIST_PAGE_SIZE` row placeholders by default.
 *   - Honors an explicit `rowCount` override.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MutualListSkeleton } from "@/features/social/components/MutualListSkeleton";
import { MUTUAL_LIST_PAGE_SIZE } from "@/features/social/mutual-count-invariants";

describe("MutualListSkeleton", () => {
  it("renders the documented data-testid and aria-busy", () => {
    render(<MutualListSkeleton />);
    const skeleton = screen.getByTestId("mutual-list-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.getAttribute("aria-busy")).toBe("true");
  });

  it("renders MUTUAL_LIST_PAGE_SIZE row placeholders by default", () => {
    render(<MutualListSkeleton />);
    const skeleton = screen.getByTestId("mutual-list-skeleton");
    expect(skeleton.getAttribute("data-row-count")).toBe(
      String(MUTUAL_LIST_PAGE_SIZE),
    );
  });

  it("honors an explicit rowCount override", () => {
    render(<MutualListSkeleton rowCount={5} />);
    const skeleton = screen.getByTestId("mutual-list-skeleton");
    expect(skeleton.getAttribute("data-row-count")).toBe("5");
  });
});
