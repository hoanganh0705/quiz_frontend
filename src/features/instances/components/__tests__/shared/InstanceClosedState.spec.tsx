

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { InstanceClosedState } from "@/features/instances/components/shared/InstanceClosedState";

describe("InstanceClosedState", () => {
it("renders nothing when status is undefined", () => {
const { container } = render(<InstanceClosedState />);
expect(container.firstChild).toBeNull();
  });

it("renders the closed variant by default for status closed", () => {
render(<InstanceClosedState status="closed" />);
expect(screen.getByText("Instance closed")).toBeTruthy();
expect(
screen.getByText(
"The host has closed this instance. It is no longer accepting players.",
      ),
    ).toBeTruthy();
  });

it("renders the cancelled variant when cancelled overrides a closed status", () => {
render(<InstanceClosedState status="closed" cancelled={true} />);
expect(screen.getByText("Instance cancelled")).toBeTruthy();
expect(
screen.getByText(
"This instance was cancelled before it could begin. Please join another instance to play.",
      ),
    ).toBeTruthy();
  });

it("renders the finished variant for status finished", () => {
render(<InstanceClosedState status="finished" />);
expect(screen.getByText("Instance finished")).toBeTruthy();
expect(screen.getByText("This instance has finished. Thanks for playing!")).toBeTruthy();
  });

it("renders a closedAt timestamp when provided", () => {
render(<InstanceClosedState status="closed" closedAt="2026-01-15T13:30:00Z" />);
expect(screen.getByText(/Closed at/)).toBeTruthy();
  });
});
