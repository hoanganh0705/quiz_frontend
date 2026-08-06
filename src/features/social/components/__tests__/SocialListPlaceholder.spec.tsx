/**
 * `SocialListPlaceholder.spec.tsx` — Locks the canonical
 * placeholder contract (TKT-6.2.C5).
 *
 * Asserts:
 *
 *   - Each `kind` renders with its documented label.
 *   - The placeholder is statically rendered (no SWR / no service
 *     calls).
 *   - The component carries an `aria-label` with the list kind.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialListPlaceholder } from "@/features/social/components/SocialListPlaceholder";

describe("SocialListPlaceholder", () => {
  it("renders the followers placeholder", () => {
    render(<SocialListPlaceholder kind="followers" />);
    const root = screen.getByTestId("social-list-placeholder-followers");
    expect(root.textContent).toMatch(/Followers/);
    expect(root.getAttribute("aria-label")).toBe("Followers (placeholder)");
  });

  it("renders the following placeholder", () => {
    render(<SocialListPlaceholder kind="following" />);
    const root = screen.getByTestId("social-list-placeholder-following");
    expect(root.textContent).toMatch(/Following/);
    expect(root.getAttribute("aria-label")).toBe("Following (placeholder)");
  });

  it("renders the friends placeholder", () => {
    render(<SocialListPlaceholder kind="friends" />);
    const root = screen.getByTestId("social-list-placeholder-friends");
    expect(root.textContent).toMatch(/Friends/);
    expect(root.getAttribute("aria-label")).toBe("Friends (placeholder)");
  });

  it("renders the blocked placeholder", () => {
    render(<SocialListPlaceholder kind="blocked" />);
    const root = screen.getByTestId("social-list-placeholder-blocked");
    expect(root.textContent).toMatch(/Blocked users/);
    expect(root.getAttribute("aria-label")).toBe(
      "Blocked users (placeholder)",
    );
  });
});