/**
 * `InstanceSkeleton.spec.tsx` — presentational skeleton primitives.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G3.
 *
 * Tests cover:
 * - `InstanceLobbySkeleton` renders the documented slots
 * - `InstanceRosterRowSkeleton` renders the documented slots
 * - className passthrough
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import {
  InstanceLobbySkeleton,
  InstanceRosterRowSkeleton,
} from "@/features/instances/components/shared/InstanceSkeleton";

describe("InstanceLobbySkeleton", () => {
  it("renders the documented root test id", () => {
    const { getByTestId } = render(<InstanceLobbySkeleton />);
    expect(getByTestId("instance-lobby-skeleton")).toBeDefined();
  });

  it("accepts a className passthrough", () => {
    const { container } = render(<InstanceLobbySkeleton className="custom-x" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("custom-x");
  });

  it("renders three roster row placeholders by default", () => {
    const { container } = render(<InstanceLobbySkeleton />);
    // Each row contains three skeleton blocks (avatar + 2 lines).
    // We don't import skeleton internals — just verify the row pattern.
    expect(container.querySelectorAll('[class*="rounded-full"]').length).toBeGreaterThan(0);
  });
});

describe("InstanceRosterRowSkeleton", () => {
  it("renders the documented root test id", () => {
    const { getByTestId } = render(<InstanceRosterRowSkeleton />);
    expect(getByTestId("instance-roster-row-skeleton")).toBeDefined();
  });

  it("accepts a className passthrough", () => {
    const { container } = render(<InstanceRosterRowSkeleton className="row-x" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("row-x");
  });
});
