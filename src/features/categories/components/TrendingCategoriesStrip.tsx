"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

import { CategoryCard } from "./CategoryCard";
import { CategoryCardSkeleton } from "@/components/primitives";
import { useCategoriesTrending } from "@/features/categories/hooks";
import { rankedCategoryToCategoryResponse } from "@/features/categories/utils/ranked-category-to-category-response";
import { Button } from "@/components/ui/Button";

const QUERY_KEY = ["categories", "trending", { limit: 10 }] as const;

const STRIP_CONTAINER =
  "flex gap-4 overflow-x-auto pb-3 pt-1 px-0.5 snap-x snap-mandatory scroll-mt-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth";
const STRIP_HEADER =
  "mb-4 flex items-center justify-between gap-2";

export function TrendingCategoriesStrip(): React.ReactElement | null {
  const { categories, isLoading, error } = useCategoriesTrending({
    limit: 10,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollBounds = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollBounds();
  }, [categories, updateScrollBounds]);

  const handleScrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = 280;
    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }, []);

  if (isLoading) {
    return (
      <section
        className="mb-8"
        aria-label="Trending categories"
        aria-busy="true"
      >
        <div className={STRIP_HEADER}>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Flame
              className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0"
              aria-hidden="true"
            />
            <span>Trending now</span>
          </h2>
        </div>
        <div className={STRIP_CONTAINER}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-64 shrink-0 snap-start"
              data-testid="trending-strip-skeleton"
            >
              <CategoryCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-8" aria-label="Trending categories">
        <div className={STRIP_HEADER}>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Flame
              className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0"
              aria-hidden="true"
            />
            <span>Trending now</span>
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void getQueryClient().invalidateQueries({ queryKey: QUERY_KEY })
            }
            data-testid="trending-strip-retry"
          >
            Retry
          </Button>
        </div>
        <p className="text-sm text-muted-foreground" role="alert">
          Couldn&apos;t load trending categories.
        </p>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      className="mb-8"
      aria-label="Trending categories"
      data-testid="trending-strip"
    >
      <div className={STRIP_HEADER}>
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Flame
            className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0"
            aria-hidden="true"
          />
          <span>Trending now</span>
        </h2>
        <div
          className="hidden sm:flex items-center gap-1.5"
          aria-label="Trending categories controls"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleScrollBy("left")}
            disabled={!canScrollLeft}
            className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Scroll trending categories left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleScrollBy("right")}
            disabled={!canScrollRight}
            className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Scroll trending categories right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={updateScrollBounds}
        className={STRIP_CONTAINER}
      >
        {categories.map((ranked) => (
          <div key={ranked.categoryId} className="w-64 shrink-0 snap-start">
            <CategoryCard
              category={rankedCategoryToCategoryResponse(ranked)}
              titleHeadingLevel={3 as const}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
