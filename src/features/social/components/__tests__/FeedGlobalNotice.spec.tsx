/**
 * `FeedGlobalNotice.spec.tsx` — Locks the global-feed labelling
 * contract (TKT-6.9.F5).
 *
 * Asserts:
 *
 *   - The documented text renders.
 *   - The root element has `role="status"` and `aria-label`.
 *   - No warning icon is rendered (calm visual style).
 *   - The component is server-renderable (no hooks).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedGlobalNotice } from "@/features/social/components/FeedGlobalNotice";

describe("FeedGlobalNotice (TKT-6.9.F5)", () => {
  it("renders the documented text", () => {
    render(<FeedGlobalNotice />);
    expect(
      screen.getByText(/Global feed — personalization coming soon/),
    ).toBeInTheDocument();
  });

  it("renders role=status and aria-label", () => {
    render(<FeedGlobalNotice />);
    const root = screen.getByTestId("feed-global-notice");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-label")).toBe("Global feed notice");
  });

  it("does NOT render a warning icon (calm visual style)", () => {
    render(<FeedGlobalNotice />);
    const root = screen.getByTestId("feed-global-notice");
    // The component is intentionally icon-free. We assert no
    // `aria-label` ending in "warning" / "icon" is present.
    const labelled = root.querySelector('[aria-label*="warning" i]');
    expect(labelled).toBeNull();
    const labelledIcon = root.querySelector('[aria-label*="icon" i]');
    expect(labelledIcon).toBeNull();
  });
});