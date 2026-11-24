"use client";

/**
 * `<QuizzesDirectoryPage />` — the `/quizzes` route's main composition.
 *
 * Wires:
 *
 *   - `useQuizFiltersUrlSync()` — seeds the store from the URL on
 *     mount; debounces 300 ms before any subsequent URL write. After
 *     the mount-seed it reacts to subsequent `searchParams` changes
 *     (back/forward navigation, shared links).
 *   - The in-memory `useQuizFiltersStore` — single source of truth for
 *     the in-memory filter state.
 *   - `<FilterBar />` slot primitive — renders the four filter
 *     affordances (category / sort / difficulty / tag multi-select).
 *     The primitive accepts `state` from the store + `onChange` that
 *     dispatches a `setFilter` per changed field.
 *   - `<QuizListingStrip />` (twice) — the supplementary strips above
 *     the grid: one for the popular rail, one for the trending rail.
 *     The variant only changes the rail label; everything else is
 *     shared so loading / error / empty states stay consistent.
 *   - The `useQuizzesList(state, { limit: 20 })` cursor-paginated
 *     directory below the filter bar (limit matches pagination target — "20 items").
 *   - `<QuizGridEmpty />` — the filter-aware empty state.
 *   - `<QuizGridLoadMore />` — the load-more button.
 *
 * ## Layout & accessibility
 *
 *   - The page is a `<main>` landmark with `aria-labelledby` pointing
 *     to the H1.
 *   - On the initial mount the grid renders 20 `<QuizCardSkeleton />`
 *     items of the same outer dimensions as the resolved cards —
 *     CLS = 0 once the items arrive.
 *   - The strip empty / loading / error states are independent of
 *     the grid's state (an error in the popular strip does NOT block
 *     the directory below it).
 *   - Each card is a real `<Link>` rendered by the shared
 *     `<EntityCard />` primitive so middle-click / right-click /
 *     keyboard navigation all behave like a normal link.
 *
 * ## `initialState` prop
 *
 * The optional `initialState` prop seeds the filter store on mount
 * via `setFilter`. The URL sync hook reads the URL on mount and
 * ALSO seeds the store — the URL wins. `initialState` is preserved
 * for callers that want to compose `QuizzesDirectoryPage` from a
 * route that passes a category slug through props (the legacy
 * `QuizCatalogMainContent` does this).
 */

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Flame, Sparkles, TrendingUp, Users } from "lucide-react";

import { ApiError } from "@/lib/api";
import { cn } from "@/shared/utils/merge-class-names";

import { useCategoriesRanked } from "@/features/categories/hooks";
import { rankedCategoryToCategoryResponse } from "@/features/categories/utils/ranked-category-to-category-response";
import { QuizGridEmpty } from "@/features/quizzes/components/QuizGridEmpty";
import { QuizGridLoadMore } from "@/features/quizzes/components/QuizGridLoadMore";
import { useQuizFiltersUrlSync } from "@/features/quizzes/hooks/useQuizFiltersUrlSync";
import { useQuizzesList } from "@/features/quizzes/hooks/useQuizzesList";
import { useQuizzesPopular } from "@/features/quizzes/hooks/useQuizzesPopular";
import { useQuizzesTrending } from "@/features/quizzes/hooks/useQuizzesTrending";
import {
  setFilter,
  useQuizFiltersStore,
} from "@/features/quizzes/store/use-quiz-filters-store";
import { initialsFromQuizId } from "@/features/quizzes/utils/quiz-card-decoration";
import { gradientFromQuizId } from "@/features/quizzes/utils/quiz-card-gradient";
import { useTagsPopular } from "@/features/tags/hooks";

import { QuizCardSkeleton } from "@/components/primitives";
import { EntityCard } from "@/components/primitives/EntityCard/EntityCard";
import { FilterBar } from "@/components/primitives/FilterBar";
import { Button } from "@/components/ui/Button";

import type { QuizFilterUrlState } from "@/features/quizzes/types/quiz-filter-params";
import type {
  PopularQuizItemDto,
  TrendingQuizItemDto,
} from "@/lib/api/generated/schemas";

const PAGE_LIMIT = 20;
const SKELETON_COUNT = 20;
const STRIP_LIMIT = 10;

export interface QuizzesDirectoryPageProps {
  /**
   * Optional initial filter state. Applied via `setFilter` on mount
   * (so the values are visible to the filter bar's first render).
   * The URL sync hook reads the URL on mount and overrides; if both
   * are present, the URL wins (the URL is the source of truth on
   * hard reload).
   */
  initialState?: Partial<QuizFilterUrlState>;
}

/**
 * Subscribe to the filter state via `useQuizFiltersStore()`. We
 * intentionally subscribe to the entire state object — the FilterBar
 * primitive needs the full state to render, and React's
 * `useSyncExternalStore` (zustand's default) handles the subscription
 * efficiently.
 */
function useQuizFiltersState(): QuizFilterUrlState {
  return useQuizFiltersStore();
}

export function QuizzesDirectoryPage({
  initialState,
}: QuizzesDirectoryPageProps = {}): React.ReactElement {
  useQuizFiltersUrlSync();
  useInitialState(initialState);

  const state = useQuizFiltersState();

  // ─── Data: categories for the dropdown, tags for the multi-select ───

  const { categories: rankedCategories } = useCategoriesRanked({ limit: 50 });
  const categories = useMemo(
    () => rankedCategories.map(rankedCategoryToCategoryResponse),
    [rankedCategories],
  );

  const { tags: popularTags } = useTagsPopular({ limit: 40 });
  const tags = useMemo(
    () =>
      popularTags.map((t) => ({
        tagId: t.tagId,
        slug: t.slug,
        name: t.name,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    [popularTags],
  );

  // ─── Data: popular / trending strips ─────────────────────────────────

  const {
    quizzes: popularQuizzes,
    isLoading: popularLoading,
    error: popularError,
  } = useQuizzesPopular({ limit: STRIP_LIMIT });
  const {
    quizzes: trendingQuizzes,
    isLoading: trendingLoading,
    error: trendingError,
  } = useQuizzesTrending({ limit: STRIP_LIMIT });

  // ─── Data: cursor-paginated directory ────────────────────────────────

  const { items, isLoading, isLoadingMore, hasMore, loadMore, error, refresh } =
    useQuizzesList({
      filters: state,
      limit: PAGE_LIMIT,
    });

  return (
    <main
      className="mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 sm:space-y-12"
      aria-labelledby="quizzes-directory-title"
      data-testid="quizzes-directory-page"
    >
      <header className="space-y-2">
        <h1
          id="quizzes-directory-title"
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
        >
          All Quizzes
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
          Browse published quizzes. Jump into what&apos;s trending or use the
          filters below to narrow down by category, tag, or difficulty.
        </p>
      </header>

      {/* Discovery Launchpad Rails */}
      <section className="space-y-8" aria-label="Featured quiz rails">
        <QuizListingStrip
          variant="trending"
          title="Trending now"
          quizzes={trendingQuizzes}
          isLoading={trendingLoading}
          error={trendingError}
        />

        <QuizListingStrip
          variant="popular"
          title="Popular now"
          quizzes={popularQuizzes}
          isLoading={popularLoading}
          error={popularError}
        />
      </section>

      {/* Catalog & Filter Workspace */}
      <section className="space-y-6" aria-label="Quiz directory">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand shrink-0" aria-hidden="true" />
              <h2
                id="catalog-heading"
                className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
              >
                Explore Catalog
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Filter by topic, sort by popularity or freshness, and find your
              next challenge.
            </p>
          </div>
          {items.length > 0 && !isLoading ? (
            <span className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-foreground font-semibold">{items.length}</span> quizzes
            </span>
          ) : null}
        </div>

        {/* Filter bar slot primitive — anchored directly above the directory grid */}
        <div
          className="rounded-xl border border-border bg-card p-4 shadow-2xs"
          aria-label="Quiz filters"
        >
          <FilterBar
            state={state}
            categories={categories}
            tags={tags}
            onChange={(next) => {
              useQuizFiltersStore.setState(next, true);
            }}
          />
        </div>

        {/* Directory grid */}
        <div aria-labelledby="catalog-heading">
          {isLoading ? (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              aria-busy="true"
              aria-label="Loading quizzes"
              data-testid="quizzes-directory-loading"
            >
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <QuizCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div
              className="text-center py-12 rounded-xl border border-border bg-card/40"
              role="alert"
              data-testid="quizzes-directory-error"
            >
              <p className="text-destructive text-base font-medium mb-3">
                Could not load quizzes. Please try again.
              </p>
              <Button
                variant="outline"
                onClick={() => void refresh()}
                data-testid="quizzes-directory-retry"
              >
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <QuizGridEmpty
              hasFilters={hasActiveFilters(state)}
              onReset={() => useQuizFiltersStore.setState({}, true)}
            />
          ) : (
            <>
              <div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                role="list"
                aria-label="Quizzes"
                data-testid="quizzes-directory-grid"
              >
                {items.map((item) => (
                  <div key={item.quizId} role="listitem">
                    <DirectoryQuizCard item={item} />
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <QuizGridLoadMore
                  hasMore={hasMore}
                  isLoading={isLoadingMore}
                  onLoadMore={loadMore}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function hasActiveFilters(state: QuizFilterUrlState): boolean {
  return Boolean(
    state.categoryId ||
    (state.tagSlugs && state.tagSlugs.length > 0) ||
    state.sort ||
    (state.difficulty && state.difficulty !== "all"),
  );
}

/**
 * Seeds the store with `initialState` on mount (a single-shot effect,
 * not gated by a ref).
 */
function useInitialState(initialState?: Partial<QuizFilterUrlState>): void {
  useEffect(() => {
    if (!initialState) return;
    for (const [key, value] of Object.entries(initialState)) {
      if (value !== undefined) {
        setFilter(key as keyof QuizFilterUrlState, value as never);
      }
    }
  }, [initialState]);
}

// ─── Sub-components ──────────────────────────────────────────────────────


interface DirectoryQuizCardItem {
  quizId: string;
  slug: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  publishedVersion?: { difficulty?: string | null } | null;
}

function difficultyBadgeClasses(difficulty?: string | null): string {
  const norm = (difficulty ?? "").toLowerCase();
  if (norm === "easy") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (norm === "medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
  if (norm === "hard") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  }
  return "border-border bg-muted text-muted-foreground";
}

function DirectoryQuizCard({
  item,
}: {
  item: DirectoryQuizCardItem;
}): React.ReactElement {
  const href = `/quizzes/${item.slug || item.quizId}`;
  const difficulty = item.publishedVersion?.difficulty;
  const fallbackGradient = gradientFromQuizId(item.quizId);

  return (
    <div
      className="relative h-full transition-transform duration-200 hover:-translate-y-0.5"
      data-testid="quizzes-directory-card"
      data-quiz-id={item.quizId}
    >
      <EntityCard
        href={href}
        title={item.title}
        description={item.description ?? null}
        imageUrl={item.imageUrl ?? null}
        imageAlt=""
        initials={initialsFromQuizId(item.quizId)}
        aspectRatio="16/9"
        coverSize="md"
        badges={
          difficulty ? (
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                difficultyBadgeClasses(difficulty),
              )}
            >
              {difficulty}
            </span>
          ) : null
        }
      />
      {item.imageUrl ? null : (
        <span
          aria-hidden="true"
          data-testid="quizzes-directory-card-fallback"
          data-quiz-id={item.quizId}
          style={{ background: fallbackGradient }}
          className="pointer-events-none absolute inset-x-0 top-0 z-0 flex aspect-video w-full items-center justify-center rounded-t-xl text-lg font-semibold uppercase text-white"
        >
          {initialsFromQuizId(item.quizId)}
        </span>
      )}
    </div>
  );
}

type StripVariant = "popular" | "trending";

type StripQuiz = PopularQuizItemDto | TrendingQuizItemDto;

interface QuizListingStripProps {
  variant: StripVariant;
  title: string;
  quizzes: readonly StripQuiz[];
  isLoading: boolean;
  error: ApiError | null;
}

function QuizListingStrip({
  variant,
  title,
  quizzes,
  isLoading,
  error,
}: QuizListingStripProps): React.ReactElement | null {
  const testid = `${variant}-quizzes-strip`;
  const cardTestid = `${variant}-quiz-card`;
  const showSkeleton = isLoading && quizzes.length === 0;
  const showError = !isLoading && error !== null && quizzes.length === 0;

  return (
    <section
      className="space-y-3"
      aria-label={`${variant} quizzes`}
      data-testid={testid}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          {variant === "trending" ? (
            <TrendingUp className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
          ) : (
            <Flame className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
          )}
          <span>{title}</span>
        </h2>
      </div>
      {showSkeleton ? (
        <div className="flex gap-4 overflow-x-auto pb-3 pt-1 px-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: STRIP_LIMIT }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between w-64 shrink-0 snap-start rounded-xl border border-border/60 bg-card p-4 min-h-[96px]"
            >
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-3 w-1/3 rounded bg-muted/70 mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      ) : showError ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
          data-testid={`${testid}-error`}
        >
          <span className="font-medium text-foreground">
            Couldn’t load {title.toLowerCase()}.
          </span>
          <span className="text-xs text-muted-foreground">
            The catalog below is still usable.
          </span>
        </div>
      ) : quizzes.length === 0 ? null : (
        <div className="flex gap-4 overflow-x-auto pb-3 pt-1 px-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.quizId}
              href={`/quizzes/${quiz.slug || quiz.quizId}`}
              className="group flex flex-col justify-between w-64 shrink-0 snap-start rounded-xl border border-border/80 bg-card p-4 transition-all duration-200 hover:border-brand/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={cardTestid}
              data-quiz-id={quiz.quizId}
            >
              <h3 className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-brand transition-colors leading-snug">
                {quiz.title}
              </h3>
              <div className="mt-3 flex items-center text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs font-medium">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  <span>
                    {quiz.totalAttempts}{" "}
                    {quiz.totalAttempts === 1 ? "attempt" : "attempts"}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
