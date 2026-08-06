/**
 * `ConsistencyNotice.spec.tsx` — Locks the eventual-consistency
 * messaging contract (TKT-6.3.C1).
 *
 * Asserts:
 *
 *   - `staleness: 'fresh'` renders nothing (returns `null`).
 *   - `staleness: 'recent'` renders the "updated just now" copy.
 *   - `staleness: 'stale'` renders the lag explanation copy.
 *   - The component NEVER renders `role="alert"` (lag is not an
 *     error).
 *   - The component renders `role="status"` so screen readers
 *     announce the lag as informational.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";

describe("ConsistencyNotice", () => {
  it("renders nothing when staleness is 'fresh'", () => {
    const { container } = render(<ConsistencyNotice staleness="fresh" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the 'updated just now' copy when staleness is 'recent'", () => {
    render(<ConsistencyNotice staleness="recent" />);
    const notice = screen.getByTestId("consistency-notice-recent");
    expect(notice.textContent).toMatch(/Updated just now/);
    expect(notice.getAttribute("role")).toBe("status");
  });

  it("renders the lag explanation copy when staleness is 'stale'", () => {
    render(<ConsistencyNotice staleness="stale" />);
    const notice = screen.getByTestId("consistency-notice-stale");
    expect(notice.textContent).toMatch(/Counts may be up to a few minutes behind/);
    expect(notice.getAttribute("role")).toBe("status");
  });

  it("never renders role='alert' (lag is informational, not an error)", () => {
    const { container: recent } = render(<ConsistencyNotice staleness="recent" />);
    const { container: stale } = render(<ConsistencyNotice staleness="stale" />);
    expect(recent.querySelector('[role="alert"]')).toBeNull();
    expect(stale.querySelector('[role="alert"]')).toBeNull();
  });

  it("honours the tone='warning' prop with a different visual class", () => {
    render(<ConsistencyNotice staleness="stale" tone="warning" />);
    const notice = screen.getByTestId("consistency-notice-stale");
    expect(notice.getAttribute("data-tone")).toBe("warning");
  });

  it("defaults tone to 'info'", () => {
    render(<ConsistencyNotice staleness="recent" />);
    const notice = screen.getByTestId("consistency-notice-recent");
    expect(notice.getAttribute("data-tone")).toBe("info");
  });
});