

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActivityEmptyState } from "@/features/social/components/ActivityEmptyState";

describe("ActivityEmptyState", () => {
it("renders the default empty copy when isBlocked is omitted", () => {
render(<ActivityEmptyState />);
const empty = screen.getByTestId("activity-empty-state");
expect(empty.textContent).toContain("No activity yet");
expect(empty.getAttribute("data-blocked")).toBe("false");
  });

it("renders the default empty copy when isBlocked is false", () => {
render(<ActivityEmptyState isBlocked={false} />);
const empty = screen.getByTestId("activity-empty-state");
expect(empty.textContent).toContain("No activity yet");
expect(empty.getAttribute("data-blocked")).toBe("false");
  });

it("renders the blocked copy when isBlocked is true", () => {
render(<ActivityEmptyState isBlocked={true} />);
const empty = screen.getByTestId("activity-empty-state");
expect(empty.textContent).toContain("Activity is hidden");
expect(empty.textContent).toContain("a block");
expect(empty.getAttribute("data-blocked")).toBe("true");
  });
});
