/**
 * `SocialDiscoveryPlaceholder.spec.tsx` — Locks the discovery placeholder
 * contract (TKT-6.5.B5).
 *
 * Asserts:
 *
 *   - `surface === 'suggestions'` renders the suggestions shell.
 *   - `surface === 'trending'` renders the trending shell.
 *   - The `data-testid` and `aria-label` match the surface.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialDiscoveryPlaceholder } from "@/features/social/components/SocialDiscoveryPlaceholder";

describe("SocialDiscoveryPlaceholder", () => {
  it("renders the suggestions shell", () => {
    render(<SocialDiscoveryPlaceholder surface="suggestions" />);
    const placeholder = screen.getByTestId("social-discovery-placeholder-suggestions");
    expect(placeholder.textContent).toContain("People you might know");
    expect(placeholder.getAttribute("aria-label")).toBe(
      "People you might know (placeholder)",
    );
  });

  it("renders the trending shell", () => {
    render(<SocialDiscoveryPlaceholder surface="trending" />);
    const placeholder = screen.getByTestId("social-discovery-placeholder-trending");
    expect(placeholder.textContent).toContain("Trending users");
    expect(placeholder.getAttribute("aria-label")).toBe(
      "Trending users (placeholder)",
    );
  });
});
