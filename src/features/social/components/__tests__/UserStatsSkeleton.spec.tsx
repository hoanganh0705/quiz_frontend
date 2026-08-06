/**
 * `UserStatsSkeleton.spec.tsx` — Locks the User Stats loading shape
 * (TKT-6.3.C4).
 *
 * Asserts:
 *
 *   - The skeleton root has `aria-busy="true"`.
 *   - The default `tileCount` renders the documented count (4).
 *   - An explicit `tileCount` overrides the default.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserStatsSkeleton } from "@/features/social/components/UserStatsSkeleton";

describe("UserStatsSkeleton", () => {
  it("renders aria-busy=true on the root", () => {
    render(<UserStatsSkeleton />);
    const root = screen.getByTestId("user-stats-skeleton");
    expect(root.getAttribute("aria-busy")).toBe("true");
  });

  it("uses role='status' for assistive tech announcements", () => {
    render(<UserStatsSkeleton />);
    const root = screen.getByTestId("user-stats-skeleton");
    expect(root.getAttribute("role")).toBe("status");
  });

  it("defaults to 4 stat tiles", () => {
    render(<UserStatsSkeleton />);
    const root = screen.getByTestId("user-stats-skeleton");
    expect(root.getAttribute("data-tile-count")).toBe("4");
  });

  it("honours an explicit tileCount prop", () => {
    render(<UserStatsSkeleton tileCount={2} />);
    const root = screen.getByTestId("user-stats-skeleton");
    expect(root.getAttribute("data-tile-count")).toBe("2");
  });
});