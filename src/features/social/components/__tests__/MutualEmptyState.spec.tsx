/**
 * `MutualEmptyState.spec.tsx` — Locks the mutual empty-state
 * contract (TKT-6.4.B4).
 *
 * Asserts:
 *
 *   - Renders the documented copy for the `'friends'` variant.
 *   - Renders the documented copy for the `'followers'` variant.
 *   - The `data-variant` attribute matches the prop.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MutualEmptyState } from "@/features/social/components/MutualEmptyState";

describe("MutualEmptyState", () => {
  it("renders the documented friends copy", () => {
    render(<MutualEmptyState variant="friends" />);
    const empty = screen.getByTestId("mutual-empty-state-friends");
    expect(empty).toBeInTheDocument();
    expect(empty.textContent).toContain("No mutual friends");
    expect(empty.getAttribute("data-variant")).toBe("friends");
  });

  it("renders the documented followers copy", () => {
    render(<MutualEmptyState variant="followers" />);
    const empty = screen.getByTestId("mutual-empty-state-followers");
    expect(empty).toBeInTheDocument();
    expect(empty.textContent).toContain("No mutual followers");
    expect(empty.getAttribute("data-variant")).toBe("followers");
  });
});
