/**
 * `MyAnalyticsSkeleton.spec.tsx` — Locks the My Analytics loading
 * shape (TKT-6.3.C4).
 *
 * Asserts:
 *
 *   - The skeleton root has `aria-busy="true"`.
 *   - The default `widgetCount` renders the documented count (6).
 *   - An explicit `widgetCount` overrides the default.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyAnalyticsSkeleton } from "@/features/social/components/MyAnalyticsSkeleton";

describe("MyAnalyticsSkeleton", () => {
  it("renders aria-busy=true on the root", () => {
    render(<MyAnalyticsSkeleton />);
    const root = screen.getByTestId("my-analytics-skeleton");
    expect(root.getAttribute("aria-busy")).toBe("true");
  });

  it("uses role='status' for assistive tech announcements", () => {
    render(<MyAnalyticsSkeleton />);
    const root = screen.getByTestId("my-analytics-skeleton");
    expect(root.getAttribute("role")).toBe("status");
  });

  it("defaults to 6 widget tiles", () => {
    render(<MyAnalyticsSkeleton />);
    const root = screen.getByTestId("my-analytics-skeleton");
    expect(root.getAttribute("data-widget-count")).toBe("6");
  });

  it("honours an explicit widgetCount prop", () => {
    render(<MyAnalyticsSkeleton widgetCount={3} />);
    const root = screen.getByTestId("my-analytics-skeleton");
    expect(root.getAttribute("data-widget-count")).toBe("3");
  });
});