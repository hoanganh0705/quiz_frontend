"use client";

/**
 * `<CategoriesDirectoryPage />` — the `/categories` route's main
 * composition.
 *
 * Wires:
 *   - The search input — a 250 ms-debounced
 *     `<Input>` element that filters the ranked grid by name.
 *   - `<TrendingCategoriesStrip />` above the grid.
 *   - The ranked grid of `<CategoryCard />` items.
 *   - `<CategoryEmptyState variant="directory" />` when the ranked
 *     list is empty AND the search input is empty.
 *   - The search-specific empty state when the user has typed a
 *     query that produces zero matches.
 *
 * ## Ranked endpoint is non-paginated
 *
 * `/categories/popular` has no `meta.pagination` (it's a `WrappedDto`,
 * not a `WrappedPaginatedDto`). The grid therefore renders the
 * up-to-100 items the wrapper returns and does NOT expose a load-more
 * button. If a future endpoint exposes cursor pagination for the
 * ranked list, this grid is the only call site to update.
 *
 * ## Search semantics
 *
 * The search is client-side. The filter is case-insensitive and
 * matches `category.name.toLowerCase().includes(query.toLowerCase())`
 * — same as the legacy page's behaviour. The 250 ms debounce prevents
 * re-render storms when the user types quickly.
 *
 * The search affects ONLY the ranked grid. The trending strip above
 * the grid is supplementary and is NOT filtered — the strip is what
 * other surfaces (e.g. home rails) consume, and filtering it
 * would defeat its purpose.
 *
 * When the user has typed a non-empty query and the filter produces
 * zero matches, the page renders the search-specific empty state
 * (`"No categories found matching your search."`) INSTEAD OF the
 * generic `CategoryEmptyState`. The `CategoryEmptyState` is only
 * shown when the underlying list is empty AND the user has not
 * typed anything.
 */

import { useCallback, useId, useMemo, useState } from "react";
import { AlertCircle, RotateCcw, Search, SearchX, X } from "lucide-react";

import { CategoryCard, CategoryCardSkeleton } from "@/components/primitives";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { getQueryClient } from "@/providers/QueryProvider";

import { useCategoriesRanked } from "@/features/categories/hooks";
import { CATEGORY_KEYS } from "@/features/categories/query-keys";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { CategoryEmptyState } from "./CategoryEmptyState";
import { TrendingCategoriesStrip } from "./TrendingCategoriesStrip";

const QUERY_KEY = CATEGORY_KEYS.ranked({ limit: 100 });
const SEARCH_DEBOUNCE_MS = 250;

const GRID_LAYOUT =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6";

export function CategoriesDirectoryPage(): React.ReactElement {
  const { categories, isLoading, error } = useCategoriesRanked({
    limit: 100,
  });

  const searchId = useId();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedQuery = useDebouncedValue(
    searchTerm,
    SEARCH_DEBOUNCE_MS,
  ).debouncedValue;

  const filteredCategories = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query),
    );
  }, [categories, debouncedQuery]);

  const handleClear = useCallback(() => {
    setSearchTerm("");
  }, []);

  const showClear = searchTerm.length > 0;
  const resultCountId = `${searchId}-count`;

  return (
    <main
      className={`${PAGE_CONTAINER_CLASS} space-y-10`}
      aria-labelledby="categories-directory-title"
      data-testid="categories-directory-page"
    >
      <header className="space-y-2">
        <h1
          id="categories-directory-title"
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
        >
          Quiz Categories
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
          Browse all quiz categories and find quizzes that match your interests.
        </p>
      </header>

      <TrendingCategoriesStrip />

      <section
        className="space-y-6 pt-6 border-t border-border/60"
        aria-label="All categories directory"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                All Categories
              </h2>
              {!isLoading && (
                <span
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono font-medium tabular-nums text-muted-foreground border border-border/50"
                  data-testid="categories-directory-count-badge"
                >
                  {filteredCategories.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {searchTerm.trim()
                ? `Showing categories matching "${searchTerm.trim()}"`
                : "Explore our full directory of quiz topics and arenas"}
            </p>
          </div>

          <div className="relative w-full sm:w-72 lg:w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search categories…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && searchTerm) {
                  e.preventDefault();
                  handleClear();
                }
              }}
              className="pl-9 pr-9 h-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
              aria-label="Search quiz categories"
              aria-describedby={resultCountId}
              autoComplete="off"
              spellCheck={false}
              data-testid="categories-directory-search-input"
            />
            {showClear && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div
            className={GRID_LAYOUT}
            aria-label="Loading categories"
            aria-busy="true"
            data-testid="categories-directory-loading"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
            role="alert"
            data-testid="categories-directory-error"
          >
            <div className="rounded-full bg-destructive/10 p-3.5 mb-4 ring-1 ring-destructive/20 text-destructive">
              <AlertCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-1.5">
              Could not load categories
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
              We encountered a network issue loading the directory. Please check your connection and try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void getQueryClient().invalidateQueries({ queryKey: QUERY_KEY })
              }
              className="gap-2"
              data-testid="categories-directory-retry"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : categories.length === 0 ? (
          <CategoryEmptyState variant="directory" />
        ) : (
          <>
            {filteredCategories.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 px-4 text-center"
                role="status"
                aria-live="polite"
                data-testid="categories-directory-search-empty"
              >
                <div className="rounded-full bg-muted/60 p-3.5 mb-4 ring-1 ring-border/60">
                  <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1.5">
                  No categories found
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
                  No categories match &ldquo;<span className="font-medium text-foreground">{searchTerm.trim()}</span>&rdquo;. Try checking for typos or searching for a broader topic.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="gap-2"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear search
                </Button>
              </div>
            ) : (
              <div
                className={GRID_LAYOUT}
                role="list"
                aria-label="Quiz categories"
                aria-describedby={resultCountId}
                data-testid="categories-directory-grid"
              >
                {filteredCategories.map((ranked) => (
                  <CategoryCard
                    key={ranked.categoryId}
                    category={ranked}
                    titleHeadingLevel={3 as const}
                  />
                ))}
              </div>
            )}
            <span id={resultCountId} className="sr-only">
              Showing {filteredCategories.length} of {categories.length}{" "}
              categories
            </span>
          </>
        )}
      </section>
    </main>
  );
}
