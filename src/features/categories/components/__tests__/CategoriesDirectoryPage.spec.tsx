import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { CategoriesDirectoryPage } from "../CategoriesDirectoryPage";
import * as hooks from "@/features/categories/hooks";
import type { CategoryResponseDto } from "@/lib/api/generated/schemas";

vi.mock("@/features/categories/hooks", () => ({
  useCategoriesRanked: vi.fn(),
  useCategoriesTrending: vi.fn(),
}));

vi.mock("@/providers/QueryProvider", () => ({
  getQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
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

const mockCategories: CategoryResponseDto[] = [
  {
    categoryId: "cat-1",
    name: "Science & Nature",
    slug: "science-nature",
    description: "Explore the mysteries of the cosmos and biology.",
    imageUrl: "https://example.test/science.jpg",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    categoryId: "cat-2",
    name: "World History",
    slug: "world-history",
    description: "Step through the defining moments of humankind.",
    imageUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    categoryId: "cat-3",
    name: "Pop Culture",
    slug: "pop-culture",
    description: "Movies, music, celebrities, and entertainment.",
    imageUrl: "https://example.test/pop.jpg",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("CategoriesDirectoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useCategoriesTrending).mockReturnValue({
      categories: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof hooks.useCategoriesTrending>);
  });

  it("renders the loading skeleton when fetching categories", () => {
    vi.mocked(hooks.useCategoriesRanked).mockReturnValue({
      categories: [],
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof hooks.useCategoriesRanked>);

    render(<CategoriesDirectoryPage />);

    expect(screen.getByTestId("categories-directory-loading")).toBeInTheDocument();
  });

  it("renders the error alert and retry button when network error occurs", () => {
    vi.mocked(hooks.useCategoriesRanked).mockReturnValue({
      categories: [],
      isLoading: false,
      error: new Error("Network error"),
    } as unknown as ReturnType<typeof hooks.useCategoriesRanked>);

    render(<CategoriesDirectoryPage />);

    expect(screen.getByTestId("categories-directory-error")).toBeInTheDocument();
    expect(screen.getByTestId("categories-directory-retry")).toBeInTheDocument();
    expect(screen.getByText(/could not load categories/i)).toBeInTheDocument();
  });

  it("renders directory empty state when no categories exist", () => {
    vi.mocked(hooks.useCategoriesRanked).mockReturnValue({
      categories: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof hooks.useCategoriesRanked>);

    render(<CategoriesDirectoryPage />);

    expect(screen.getByTestId("category-empty-state-directory")).toBeInTheDocument();
  });

  it("renders categories grid, count badge, and search bar in happy path", () => {
    vi.mocked(hooks.useCategoriesRanked).mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof hooks.useCategoriesRanked>);

    render(<CategoriesDirectoryPage />);

    expect(screen.getByRole("heading", { name: /quiz categories/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /all categories/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId("categories-directory-count-badge")).toHaveTextContent("3");

    expect(screen.getByRole("heading", { name: /science & nature/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /world history/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /pop culture/i, level: 3 })).toBeInTheDocument();
  });

  it("filters categories when typing in search bar and clears via clear button and Escape key", async () => {
    vi.mocked(hooks.useCategoriesRanked).mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof hooks.useCategoriesRanked>);

    render(<CategoriesDirectoryPage />);

    const searchInput = screen.getByTestId("categories-directory-search-input");
    fireEvent.change(searchInput, { target: { value: "Science" } });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /science & nature/i, level: 3 })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /world history/i, level: 3 })).not.toBeInTheDocument();
      expect(screen.getByTestId("categories-directory-count-badge")).toHaveTextContent("1");
    });

    // Press Escape to clear
    fireEvent.keyDown(searchInput, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /world history/i, level: 3 })).toBeInTheDocument();
      expect(screen.getByTestId("categories-directory-count-badge")).toHaveTextContent("3");
    });
  });

  it("renders search-empty state with clear action when query produces 0 matches", async () => {
    vi.mocked(hooks.useCategoriesRanked).mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof hooks.useCategoriesRanked>);

    render(<CategoriesDirectoryPage />);

    const searchInput = screen.getByTestId("categories-directory-search-input");
    fireEvent.change(searchInput, { target: { value: "Astronomy" } });

    await waitFor(() => {
      expect(screen.getByTestId("categories-directory-search-empty")).toBeInTheDocument();
      expect(screen.getByText(/no categories match/i)).toBeInTheDocument();
    });

    const emptyState = screen.getByTestId("categories-directory-search-empty");
    const clearBtn = within(emptyState).getByRole("button", { name: /clear search/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("categories-directory-search-empty")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /science & nature/i, level: 3 })).toBeInTheDocument();
    });
  });
});
