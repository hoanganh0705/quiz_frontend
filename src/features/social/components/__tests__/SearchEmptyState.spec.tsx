

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchEmptyState } from "@/features/social/components/SearchEmptyState";

describe("SearchEmptyState", () => {
it("renders the empty-query copy", () => {
render(<SearchEmptyState kind="empty-query" />);
const empty = screen.getByTestId("search-empty-state");
expect(empty.textContent).toContain("Start typing to search");
expect(empty.getAttribute("data-kind")).toBe("empty-query");
  });

it("renders the query-too-short copy with the query", () => {
render(<SearchEmptyState kind="query-too-short" query="a" />);
const empty = screen.getByTestId("search-empty-state");
expect(empty.textContent).toContain("Query too short");
expect(empty.textContent).toContain('"a"');
expect(empty.getAttribute("data-kind")).toBe("query-too-short");
  });

it("renders the no-results copy with the query", () => {
render(<SearchEmptyState kind="no-results" query="nobody" />);
const empty = screen.getByTestId("search-empty-state");
expect(empty.textContent).toContain("No results found");
expect(empty.textContent).toContain("nobody");
expect(empty.getAttribute("data-kind")).toBe("no-results");
  });

it("renders the no-trending copy", () => {
render(<SearchEmptyState kind="no-trending" />);
const empty = screen.getByTestId("search-empty-state");
expect(empty.textContent).toContain("No trending users right now");
expect(empty.getAttribute("data-kind")).toBe("no-trending");
  });

it("does not crash when query is omitted for variants that accept it", () => {
const { container } = render(<SearchEmptyState kind="query-too-short" />);
expect(container.querySelector("[data-testid='search-empty-state']")).toBeTruthy();
  });
});
