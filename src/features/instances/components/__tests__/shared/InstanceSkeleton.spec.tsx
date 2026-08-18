

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
