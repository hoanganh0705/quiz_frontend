/**
 * `SocialSearchPlaceholder.spec.tsx` — Locks the social search placeholder
 * contract (TKT-6.5.B5).
 *
 * Asserts:
 *
 *   - Renders the "Coming soon" copy.
 *   - The `data-testid` is `social-search-placeholder`.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialSearchPlaceholder } from "@/features/social/components/SocialSearchPlaceholder";

describe("SocialSearchPlaceholder", () => {
  it("renders the coming soon copy", () => {
    render(<SocialSearchPlaceholder />);
    const placeholder = screen.getByTestId("social-search-placeholder");
    expect(placeholder.textContent).toContain("Search coming soon");
    expect(placeholder.getAttribute("aria-label")).toBe(
      "Social user search (placeholder)",
    );
  });
});
