

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedStaleMarker } from "@/features/social/components/FeedStaleMarker";

describe("FeedStaleMarker (TKT-6.9.F4)", () => {
it("renders the documented badge when isStale is true", () => {
render(<FeedStaleMarker isStale={true} />);
const root = screen.getByTestId("feed-stale-marker");
expect(root).toBeInTheDocument();
expect(root.getAttribute("aria-live")).toBe("polite");
expect(root.getAttribute("aria-label")).toBe("Feed is updating");
expect(screen.getByText(/Updating\.\.\./)).toBeInTheDocument();
  });

it("renders null when isStale is false", () => {
const { container } = render(<FeedStaleMarker isStale={false} />);
expect(screen.queryByTestId("feed-stale-marker")).toBeNull();
expect(container.firstChild).toBeNull();
  });

it("does NOT render an aggressive spinner (uses a pulse element instead)", () => {
render(<FeedStaleMarker isStale={true} />);

expect(screen.getByTestId("feed-stale-marker-pulse")).toBeInTheDocument();

expect(
screen.queryByTestId("feed-stale-marker")?.querySelector(
'[data-slot="loading-spinner"]',
      ),
    ).toBeNull();
  });
});