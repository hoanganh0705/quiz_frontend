

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialListSkeleton } from "@/features/social/components/SocialListSkeleton";
import { SOCIAL_GRAPH_DEFAULT_LIMIT } from "@/features/social/pagination-invariants";

describe("SocialListSkeleton", () => {
it("defaults to SOCIAL_GRAPH_DEFAULT_LIMIT rows", () => {
render(<SocialListSkeleton />);
const root = screen.getByTestId("social-list-skeleton");
expect(root.getAttribute("data-row-count")).toBe(
String(SOCIAL_GRAPH_DEFAULT_LIMIT),
    );
  });

it("accepts an explicit rowCount override", () => {
render(<SocialListSkeleton rowCount={5} />);
const root = screen.getByTestId("social-list-skeleton");
expect(root.getAttribute("data-row-count")).toBe("5");
  });

it("renders aria-busy=true on the root", () => {
render(<SocialListSkeleton rowCount={3} />);
const root = screen.getByTestId("social-list-skeleton");
expect(root.getAttribute("aria-busy")).toBe("true");
expect(root.getAttribute("role")).toBe("status");
expect(root.getAttribute("aria-label")).toBe("Loading list");
  });
});