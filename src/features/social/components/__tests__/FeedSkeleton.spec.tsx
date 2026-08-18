

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedSkeleton } from "@/features/social/components/FeedSkeleton";
import { FEED_DEFAULT_LIMIT } from "@/features/social/feed-pagination-invariants";

describe("FeedSkeleton (TKT-6.9.F1)", () => {
it("renders the default row count when rowCount is omitted", () => {
render(<FeedSkeleton />);
const root = screen.getByTestId("feed-skeleton");
expect(root.getAttribute("data-row-count")).toBe(String(FEED_DEFAULT_LIMIT));
expect(root.getAttribute("aria-busy")).toBe("true");
expect(root.getAttribute("aria-label")).toBe("Loading feed");
  });

it("renders the requested row count when rowCount is provided", () => {
render(<FeedSkeleton rowCount={3} />);
const root = screen.getByTestId("feed-skeleton");
expect(root.getAttribute("data-row-count")).toBe("3");
  });

it("uses the Phase 4 Skeleton primitive (data-slot='skeleton')", () => {
render(<FeedSkeleton rowCount={1} />);
const root = screen.getByTestId("feed-skeleton");

expect(root.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

it("marks the root as a live region for screen readers", () => {
render(<FeedSkeleton rowCount={1} />);
const root = screen.getByTestId("feed-skeleton");
expect(root.getAttribute("role")).toBe("status");
  });
});