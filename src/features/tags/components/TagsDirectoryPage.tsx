"use client";

/**
 * `<TagsDirectoryPage>` — the `/tags` route's main composition.
 *
 * Spatial structure (Operate discovery mode):
 *   1. Page header (`<h1>` + concise lead).
 *   2. Full-width curated discovery band (`Popular now`, `Trending now` — collapses cleanly when empty).
 *   3. `All tags` catalog section with a container-responsive toolbar (`@2xl:flex-row`) that co-locates `<TagFilterInput>` directly with the tag list and live count it controls.
 */

import { useCallback, useId, useState } from "react";

import { RotateCcw } from "lucide-react";

import { getQueryClient } from "@/providers/QueryProvider";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { useTagsDirectory } from "@/features/tags/hooks/useTagsDirectory";
import { TAG_KEYS } from "@/features/tags/query-keys";

import { TagPill } from "@/components/primitives/TagPill/TagPill";
import { TagPillSkeleton } from "@/components/primitives/TagPill/TagPillSkeleton";
import { Button } from "@/components/ui/Button";

import { PopularTagsStrip } from "./PopularTagsStrip";
import { TagEmptyState } from "./TagEmptyState";
import { TagFilterInput } from "./TagFilterInput";
import { TrendingTagsStrip } from "./TrendingTagsStrip";

const PAGE_LIMIT = 60;
const SKELETON_COUNT = 24;
const SKELETON_WIDTHS = [
  "w-24",
  "w-32",
  "w-28",
  "w-20",
  "w-36",
  "w-28",
] as const;

const GRID_LAYOUT = "flex flex-wrap gap-x-2 gap-y-3 sm:gap-2.5";

export function TagsDirectoryPage(): React.ReactElement {
  const [filter, setFilter] = useState("");
  const countStatusId = useId();

  const {
    items,
    loadedCount,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    error,
  } = useTagsDirectory({ filter, limit: PAGE_LIMIT });

  const handleClearFilter = useCallback(() => {
    setFilter("");
  }, []);

  const handleRetry = useCallback(() => {
    if (typeof refresh === "function") {
      void refresh();
    }
    void getQueryClient().invalidateQueries({
      queryKey: TAG_KEYS.directory(PAGE_LIMIT),
    });
  }, [refresh]);

  const trimmedFilter = filter.trim();
  const hasActiveFilter = trimmedFilter.length > 0;
  const isCatalogEmpty =
    !isLoading && !error && loadedCount === 0 && !hasActiveFilter;

  return (
    <div
      className={`@container ${PAGE_CONTAINER_CLASS} space-y-8 md:space-y-10`}
      data-testid="tags-directory-page"
    >
      <header className="space-y-2">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          data-testid="tags-directory-page-title"
        >
          Tags
        </h1>
        <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-foreground-secondary">
          Discover quizzes by community topic—jump into popular and trending
          tags or search the catalog below.
        </p>
      </header>

      <div
        className="space-y-5 empty:hidden"
        data-testid="tags-discovery-rails"
      >
        <PopularTagsStrip />
        <TrendingTagsStrip />
      </div>

      <section
        aria-labelledby="all-tags-heading"
        className="space-y-5 pt-6 border-t border-border/60"
      >
        <div className="flex flex-col gap-3.5 @2xl:flex-row @2xl:items-center @2xl:justify-between border-b border-border/60 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                id="all-tags-heading"
                className="text-xl font-bold tracking-tight text-foreground"
              >
                All tags
              </h2>
              {!isLoading && !error && loadedCount > 0 ? (
                <span
                  id={countStatusId}
                  className="inline-flex items-center rounded-full border border-border/60 bg-muted px-2.5 py-0.5 font-mono text-xs font-medium tabular-nums text-muted-foreground"
                  aria-live="polite"
                  data-testid="tags-directory-count"
                >
                  {hasActiveFilter
                    ? `${items.length} of ${loadedCount} loaded`
                    : `${loadedCount} loaded`}
                </span>
              ) : null}
            </div>

            {!isCatalogEmpty ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {hasActiveFilter
                  ? hasMore
                    ? `Matching "${trimmedFilter}" across ${loadedCount} loaded tags — load more below to expand search`
                    : `Showing tags matching "${trimmedFilter}"`
                  : "Browse community tags alphabetically and select any topic to explore its quizzes"}
              </p>
            ) : null}
          </div>

          {!isCatalogEmpty && !error ? (
            <div className="w-full @2xl:w-80 shrink-0">
              <TagFilterInput
                value={filter}
                onChange={setFilter}
                describedBy={
                  !isLoading && loadedCount > 0 ? countStatusId : undefined
                }
              />
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div
            className={GRID_LAYOUT}
            aria-label="Loading tags"
            aria-busy="true"
            data-testid="tags-directory-page-loading"
          >
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <TagPillSkeleton
                key={i}
                className={SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]}
              />
            ))}
          </div>
        ) : error ? (
          <div
            className="rounded-xl border border-border bg-card p-8 text-center"
            role="alert"
            data-testid="tags-directory-page-error"
          >
            <p className="text-destructive text-base font-medium mb-4">
              Could not load tags. Please try again.
            </p>
            <Button
              variant="outline"
              className="min-h-10 sm:min-h-9"
              onClick={handleRetry}
              data-testid="tags-directory-page-retry"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : isCatalogEmpty ? (
          <TagEmptyState variant="directory" />
        ) : items.length === 0 ? (
          <TagEmptyState
            variant="filter-no-match"
            query={filter}
            loadedCount={loadedCount}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
            onClearFilter={handleClearFilter}
          />
        ) : (
          <div
            data-testid="tags-directory-page-grid"
            className={GRID_LAYOUT}
            role="list"
            aria-label="Tags"
          >
            {items.map((tag) => (
              <div key={tag.tagId} role="listitem">
                <TagPill tag={tag} variant="clickable" />
              </div>
            ))}
          </div>
        )}

        {hasMore && !isLoading && !error && items.length > 0 ? (
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              className="min-h-10 px-6"
              onClick={loadMore}
              disabled={isLoadingMore}
              data-testid="tags-directory-page-load-more"
            >
              {isLoadingMore ? "Loading…" : "Load more tags"}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
