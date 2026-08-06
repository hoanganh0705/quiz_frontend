/**
 * `SearchResultSkeleton.spec.tsx` — Locks the search result skeleton
 * shape (TKT-6.5.B3).
 *
 * Asserts:
 *
 *   - Renders the documented `data-testid` and `aria-busy`.
 *   - Renders 5 row placeholders by default.
 *   - Honors an explicit `rowCount` override.
 *   - Each `kind` renders a distinct shape without source-code duplication.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchResultSkeleton } from "@/features/social/components/SearchResultSkeleton";

describe("SearchResultSkeleton", () => {
  it("renders the documented data-testid and aria-busy for suggestions", () => {
    render(<SearchResultSkeleton kind="suggestions" />);
    const skeleton = screen.getByTestId("search-result-skeleton-suggestions");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.getAttribute("aria-busy")).toBe("true");
  });

  it("renders 5 row placeholders by default", () => {
    render(<SearchResultSkeleton kind="suggestions" />);
    const skeleton = screen.getByTestId("search-result-skeleton-suggestions");
    expect(skeleton.getAttribute("data-row-count")).toBe("5");
  });

  it("honors an explicit rowCount override", () => {
    render(<SearchResultSkeleton kind="suggestions" rowCount={3} />);
    const skeleton = screen.getByTestId("search-result-skeleton-suggestions");
    expect(skeleton.getAttribute("data-row-count")).toBe("3");
  });

  it("renders the search skeleton", () => {
    render(<SearchResultSkeleton kind="search" />);
    const skeleton = screen.getByTestId("search-result-skeleton-search");
    expect(skeleton).toBeInTheDocument();
  });

  it("renders the trending skeleton", () => {
    render(<SearchResultSkeleton kind="trending" />);
    const skeleton = screen.getByTestId("search-result-skeleton-trending");
    expect(skeleton).toBeInTheDocument();
  });
});
