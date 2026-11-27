import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TagsDirectoryPage } from "@/features/tags/components/TagsDirectoryPage";

import type {
  RankedTagResponseDto,
  TagResponseDto,
} from "@/lib/api/generated/schemas";

const { useTagsDirectoryMock, useTagsPopularMock, useTagsTrendingMock } =
  vi.hoisted(() => ({
    useTagsDirectoryMock: vi.fn(),
    useTagsPopularMock: vi.fn(),
    useTagsTrendingMock: vi.fn(),
  }));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/providers/QueryProvider", () => ({
  getQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/features/tags/hooks/useTagsDirectory", () => ({
  useTagsDirectory: (query: unknown) => useTagsDirectoryMock(query),
}));

vi.mock("@/features/tags/hooks/useTagsPopular", () => ({
  useTagsPopular: (params: unknown) => useTagsPopularMock(params),
}));

vi.mock("@/features/tags/hooks/useTagsTrending", () => ({
  useTagsTrending: (params: unknown) => useTagsTrendingMock(params),
}));

const DIRECTORY_TAGS: TagResponseDto[] = [
  {
    tagId: "0192f4d8-0000-7000-8000-000000000001",
    name: "Programming",
    slug: "programming",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    tagId: "0192f4d8-0000-7000-8000-000000000002",
    name: "Computer Science",
    slug: "computer-science",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

const POPULAR_TAGS: RankedTagResponseDto[] = [
  {
    rank: 1,
    tagId: "0192f4d8-0000-7000-8000-000000000001",
    name: "Programming",
    slug: "programming",
    totalScore: "120",
    totalAttempts: "1450",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

describe("TagsDirectoryPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTagsPopularMock.mockReturnValue({
      tags: POPULAR_TAGS,
      isLoading: false,
      error: null,
    });
    useTagsTrendingMock.mockReturnValue({
      tags: [],
      isLoading: false,
      error: null,
    });
    useTagsDirectoryMock.mockImplementation(
      ({ filter }: { filter: string }) => {
        const trimmed = filter.trim().toLowerCase();
        const items = trimmed
          ? DIRECTORY_TAGS.filter(
              (t) =>
                t.name.toLowerCase().includes(trimmed) ||
                t.slug.toLowerCase().includes(trimmed),
            )
          : DIRECTORY_TAGS;
        return {
          items,
          loadedCount: DIRECTORY_TAGS.length,
          isLoading: false,
          isLoadingMore: false,
          hasMore: true,
          loadMore: vi.fn(),
          error: null,
        };
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.clearAllMocks();
  });

  it("maintains proper h1 -> h2 heading hierarchy and co-locates the filter with All tags", () => {
    render(<TagsDirectoryPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Tags" }),
    ).toBeInTheDocument();
    const popularStrip = screen.getByTestId("popular-tags-strip");
    const filterInput = screen.getByTestId("tag-filter-input");
    const grid = screen.getByTestId("tags-directory-page-grid");

    expect(
      screen.getByRole("heading", { level: 2, name: "Popular now" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "All tags" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("tag-pill-rank")).toHaveTextContent("#1");
    expect(screen.getByTestId("tag-pill-count")).toHaveTextContent(
      "1.5k plays",
    );

    // DOM & Tab focus order: Popular discovery strip -> All tags filter input -> All tags pill grid
    expect(
      popularStrip.compareDocumentPosition(filterInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      filterInput.compareDocumentPosition(grid) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("allows uppercase and space-separated queries without flagging aria-invalid", () => {
    render(<TagsDirectoryPage />);

    const input = screen.getByTestId("tag-filter-input");
    fireEvent.change(input, { target: { value: "Computer Science" } });

    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByTestId("tags-directory-count")).toHaveTextContent(
      "1 of 2 loaded",
    );

    const clearBtn = screen.getByTestId("tag-filter-clear");
    fireEvent.click(clearBtn);
    expect(document.activeElement).toBe(input);
  });

  it("keeps Load more tags accessible inside filter-no-match when unloaded pages remain", () => {
    const loadMore = vi.fn();
    useTagsDirectoryMock.mockReturnValue({
      items: [],
      loadedCount: 60,
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      loadMore,
      error: null,
    });

    render(<TagsDirectoryPage />);

    const input = screen.getByTestId("tag-filter-input");
    fireEvent.change(input, { target: { value: "typescript" } });

    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(
      screen.getByTestId("tag-empty-state-filter-no-match"),
    ).toBeInTheDocument();

    const loadMoreBtn = screen.getByRole("button", { name: "Load more tags" });
    fireEvent.click(loadMoreBtn);
    expect(loadMore).toHaveBeenCalledTimes(1);

    const clearBtn = screen.getByRole("button", { name: "Clear filter" });
    expect(clearBtn.className).not.toContain("bg-default");
  });

  it("does not flood individual skeletons with duplicate role='status' regions while loading", () => {
    useTagsDirectoryMock.mockReturnValue({
      items: [],
      loadedCount: 0,
      isLoading: true,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
    });

    render(<TagsDirectoryPage />);

    const skeletons = screen.getAllByTestId("tag-pill-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
    for (const skel of skeletons) {
      expect(skel).not.toHaveAttribute("role", "status");
      expect(skel).toHaveAttribute("aria-hidden", "true");
    }
  });
});
