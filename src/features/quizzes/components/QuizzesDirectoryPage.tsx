"use client";

/**
 * `<QuizzesDirectoryPage />` — the `/quizzes` route's main composition.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.D1.
 *
 * Wires:
 *
 *   - `useQuizFiltersUrlSync()` — seeds the store from the URL on
 *     mount; debounces 300 ms before any subsequent URL write.
 *   - The in-memory `useQuizFiltersStore` — single source of truth for
 *     the in-memory filter state.
 *   - `<FilterBar />` slot primitive — renders the four filter
 *     affordances (category / sort / difficulty / tag multi-select).
 *     The primitive accepts `state` from the store + `onChange` that
 *     dispatches a `setFilter` per changed field.
 *   - `<PopularQuizzesStrip />` + `<TrendingQuizzesStrip />` — the
 *     supplementary strips above the grid (mirrors
 *     `<CategoriesDirectoryPage />`'s `TrendingCategoriesStrip`).
 *   - The `useQuizzesList(state, { limit: 20 })` cursor-paginated
 *     directory below the filter bar (limit matches Story 3.5 AC #5
 *     Lighthouse target — "20 items").
 *   - `<QuizGridEmpty />` — the filter-aware empty state.
 *   - `<QuizGridLoadMore />` — the load-more button.
 *
 * ## Layout & accessibility
 *
 *   - The page is a `<main>` landmark with `aria-labelledby` pointing
 *     to the H1.
 *   - On the initial mount the grid renders 20 `<QuizCardSkeleton />`
 *     items of the same outer dimensions as the resolved cards —
 *     CLS = 0 once the items arrive (Story 3.5 AC #4).
 *   - The strip empty / loading / error states are independent of
 *     the grid's state (an error in the popular strip does NOT block
 *     the directory below it).
 *
 * ## `initialState` prop (TKT-3.5.D2 forwarder)
 *
 * The optional `initialState` prop seeds the filter store on mount
 * via `setFilter`. The URL sync hook (C2) reads the URL on mount and
 * ALSO seeds the store — the URL wins. `initialState` is preserved
 * for callers that want to compose `QuizzesDirectoryPage` from a
 * route that passes a category slug or a search query through props
 * (the legacy `QuizCatalogMainContent` does this — D2).
 */

import { useEffect } from "react";

import { useQuizFiltersUrlSync } from "@/features/quizzes/hooks/useQuizFiltersUrlSync";
import { useQuizzesList } from "@/features/quizzes/hooks/useQuizzesList";
import { useQuizzesPopular } from "@/features/quizzes/hooks/useQuizzesPopular";
import { useQuizzesTrending } from "@/features/quizzes/hooks/useQuizzesTrending";
import {
  setFilter,
  useQuizFiltersStore,
} from "@/features/quizzes/store/use-quiz-filters-store";
import type { QuizFilterUrlState } from "@/features/quizzes/types/quiz-filter-params";
import { gradientFromQuizId } from "@/features/quizzes/utils/quiz-card-gradient";
import { useCategoriesRanked } from "@/features/categories/hooks";
import { rankedCategoryToCategoryResponse } from "@/features/categories/utils/ranked-category-to-category-response";
import { useTagsPopular } from "@/features/tags/hooks";

import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/primitives/FilterBar";
import { QuizCardSkeleton } from "@/components/primitives";

import { QuizGridEmpty } from "@/features/quizzes/components/QuizGridEmpty";
import { QuizGridLoadMore } from "@/features/quizzes/components/QuizGridLoadMore";

const PAGE_LIMIT = 20;
const SKELETON_COUNT = 20;

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
  // Wire the URL sync hook (Phase 1: mount-seed; Phase 2:
  // debounced 300 ms write). The hook has no return value; calling it
  // is the side effect.
  useQuizFiltersUrlSync();

  // Apply `initialState` on first render so the FilterBar sees
  // the props-derived defaults immediately. The URL sync hook's
  // mount-seed effect runs immediately after, and the URL wins.
  const initializedRef = useRefInit(initialState);

  const state = useQuizFiltersState();

  // ─── Data: categories for the dropdown, tags for the multi-select ───

  const { categories: rankedCategories } = useCategoriesRanked({ limit: 100 });
  const categories = useMemo(
    () => rankedCategories.map(rankedCategoryToCategoryResponse),
    [rankedCategories],
  );

  const { tags: popularTags } = useTagsPopular({ limit: 100 });
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

  const { quizzes: popularQuizzes } = useQuizzesPopular({ limit: 10 });
  const { quizzes: trendingQuizzes } = useQuizzesTrending({ limit: 10 });

  // ─── Data: cursor-paginated directory ────────────────────────────────

  const { items, isLoading, isLoadingMore, hasMore, loadMore, error, refresh } =
    useQuizzesList({
      filters: state,
      limit: PAGE_LIMIT,
    });

  // Avoid unused-variable lint on `initializedRef`.
  void initializedRef;

  return (
    <main
      className="min-h-screen text-foreground p-4 md:p-8 lg:p-12"
      aria-labelledby="quizzes-directory-title"
      data-testid="quizzes-directory-page"
    >
      <header className="mb-8">
        <h1
          id="quizzes-directory-title"
          className="text-3xl font-bold mb-2 text-foreground"
        >
          All Quizzes
        </h1>
        <p className="text-foreground/70 text-base">
          Browse published quizzes. Use the filters to narrow down by category,
          tag, sort, or difficulty.
        </p>
      </header>

      {/* Filter bar slot primitive */}
      <section
        className="mb-6 rounded-lg border border-border bg-card p-4"
        aria-label="Quiz filters"
      >
        <FilterBar
          state={state}
          categories={categories}
          tags={tags}
          onChange={(next) => {
            // Apply the next state by dispatching `setFilter` per
            // changed field. The simplest implementation: replace the
            // entire state via `setState` (the actions are stable).
            useQuizFiltersStore.setState(next, true);
          }}
        />
      </section>

      {/* Popular strip */}
      <PopularQuizzesStrip quizzes={popularQuizzes} />

      {/* Trending strip */}
      <TrendingQuizzesStrip quizzes={trendingQuizzes} />

      {/* Directory grid */}
      <section aria-label="Quiz directory">
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
            className="text-center py-12"
            role="alert"
            data-testid="quizzes-directory-error"
          >
            <p className="text-destructive text-lg mb-4">
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
            <QuizGridLoadMore
              hasMore={hasMore}
              isLoading={isLoadingMore}
              onLoadMore={loadMore}
            />
          </>
        )}
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
 * Returns a ref whose only purpose is to fire the initial-state
 * effect once. The ref itself is not read.
 */
function useRefInit(initialState?: Partial<QuizFilterUrlState>) {
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (!initialState) return;
    for (const [key, value] of Object.entries(initialState)) {
      if (value !== undefined) {
        setFilter(key as keyof QuizFilterUrlState, value as never);
      }
    }
  }, [initialState]);
  return initializedRef;
}

// ─── Sub-components ──────────────────────────────────────────────────────

import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  PopularQuizItemDto,
  QuizListItemDto,
  TrendingQuizItemDto,
} from "@/lib/api/generated/schemas";

function PopularQuizzesStrip({
  quizzes,
}: {
  quizzes: readonly PopularQuizItemDto[];
}): React.ReactElement | null {
  if (quizzes.length === 0) return null;
  return (
    <section
      className="mb-8"
      aria-label="Popular quizzes"
      data-testid="popular-quizzes-strip"
    >
      <div className="mb-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Popular now</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {quizzes.map((quiz) => (
          <Link
            key={quiz.quizId}
            href={`/quizzes/${quiz.slug || quiz.quizId}`}
            className="w-64 shrink-0 snap-start rounded-xl border bg-card p-4 transition hover:shadow-md"
            data-testid="popular-quiz-card"
            data-quiz-id={quiz.quizId}
          >
            <p className="font-semibold text-sm line-clamp-2">{quiz.title}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {quiz.totalAttempts} attempts
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrendingQuizzesStrip({
  quizzes,
}: {
  quizzes: readonly TrendingQuizItemDto[];
}): React.ReactElement | null {
  if (quizzes.length === 0) return null;
  return (
    <section
      className="mb-8"
      aria-label="Trending quizzes"
      data-testid="trending-quizzes-strip"
    >
      <div className="mb-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Trending now</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {quizzes.map((quiz) => (
          <Link
            key={quiz.quizId}
            href={`/quizzes/${quiz.slug || quiz.quizId}`}
            className="w-64 shrink-0 snap-start rounded-xl border bg-card p-4 transition hover:shadow-md"
            data-testid="trending-quiz-card"
            data-quiz-id={quiz.quizId}
          >
            <p className="font-semibold text-sm line-clamp-2">{quiz.title}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {quiz.totalAttempts} attempts
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DirectoryQuizCard({
  item,
}: {
  item: QuizListItemDto & { id?: string };
}) {
  const router = useRouter();
  const href = `/quizzes/${item.slug || item.quizId}`;
  const difficulty = item.publishedVersion?.difficulty;
  const fallbackGradient = gradientFromQuizId(item.quizId);
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:shadow-md text-left w-full"
      data-testid="quizzes-directory-card"
      data-quiz-id={item.quizId}
      aria-label={item.title}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            data-testid="quizzes-directory-card-fallback"
            data-quiz-id={item.quizId}
            style={{ background: fallbackGradient }}
            className="flex h-full w-full items-center justify-center text-lg font-semibold uppercase text-white"
          >
            {initialsFromQuizId(item.quizId)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">
          {item.title}
        </h3>
        {item.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          {difficulty ? (
            <span className="rounded-full border bg-background px-2 py-0.5">
              {difficulty}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function initialsFromQuizId(quizId: string): string {
  const seed = quizId.replace(/-/g, "").slice(-6);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = chars[hash % chars.length];
  const b = chars[(hash >>> 8) % chars.length];
  return `${a}${b}`;
}
