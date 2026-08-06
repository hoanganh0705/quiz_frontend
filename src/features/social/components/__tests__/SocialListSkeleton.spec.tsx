/**
 * `SocialListSkeleton.spec.tsx` — Locks the skeleton component
 * contract (TKT-6.2.C2).
 *
 * Asserts:
 *
 *   - Default `rowCount` equals `SOCIAL_GRAPH_DEFAULT_LIMIT` (20).
 *   - Explicit `rowCount` overrides the default.
 *   - `aria-busy="true"` is present on the root.
 *   - The component renders `role="status"` for screen-reader
 *     live-region semantics.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialListSkeleton } from "@/features/social/components/SocialListSkeleton";
import { SOCIAL_GRAPH_DEFAULT_LIMIT } from "@/features/social/pagination-invariants";

describe("SocialListSkeleton", () => {
  it("defaults to SOCIAL_GRAPH_DEFAULT_LIMIT rows", () => {
    render(<SocialListSkeleton />);
    const root = screen.getByTestId("social-list-skeleton");
    expect(root.getAttribute("data-row-count")).toBe(
      String(SOCIAL_GRAPH_DEFAULT_LIMIT),
    );
  });

  it("accepts an explicit rowCount override", () => {
    render(<SocialListSkeleton rowCount={5} />);
    const root = screen.getByTestId("social-list-skeleton");
    expect(root.getAttribute("data-row-count")).toBe("5");
  });

  it("renders aria-busy=true on the root", () => {
    render(<SocialListSkeleton rowCount={3} />);
    const root = screen.getByTestId("social-list-skeleton");
    expect(root.getAttribute("aria-busy")).toBe("true");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-label")).toBe("Loading list");
  });
});