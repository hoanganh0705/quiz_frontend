"use client";

import { useCallback } from "react";
import { mutate } from "swr";
import { WifiOff } from "lucide-react";

import { ApiError } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

import { useQuizzesTrending } from "@/features/quizzes/hooks/useQuizzesTrending";
import { TRENDING_RAIL_LIMIT, type TrendingQuizItemDto } from "@/features/quizzes/types/home-rails";
import {
  setTrendingCategory,
  useTrendingCategoryId,
} from "@/features/quizzes/store/use-home-category-store";

import { HomeCategoryFilter } from "./HomeCategoryFilter";
import { QuizRail } from "./QuizRail";
import { QuizRailEmpty } from "./QuizRailEmpty";
import { QuizRailSkeleton } from "./QuizRailSkeleton";
import { RailQuizCard, type RailQuiz } from "./RailQuizCard";

function trendingToRailQuiz(item: TrendingQuizItemDto): RailQuiz {
  return {
    quizId: item.quizId,
    title: item.title,
    slug: item.slug,
    imageUrl: item.imageUrl ?? null,
  };
}

export interface HomeTrendingRailProps {
  items?: readonly TrendingQuizItemDto[];
  title?: string;
  className?: string;
}

export function HomeTrendingRail({
  items,
  title = "Trending",
  className,
}: HomeTrendingRailProps): React.ReactElement {
  const categoryId = useTrendingCategoryId();

  const { quizzes, isLoading, error } = useQuizzesTrending({
    limit: TRENDING_RAIL_LIMIT,
    categoryId,
  });

  // SSR-rendered trending items act as fallback data so the rail doesn't
  // flash empty while the hook's first request is in flight.
  const sourceItems = items ?? [];
  const visibleItems = sourceItems.length > 0 ? sourceItems : quizzes;

  const handleCategoryChange = useCallback((next: string | undefined) => {
    setTrendingCategory(next);
  }, []);

  const handleReset = useCallback(() => {
    setTrendingCategory(undefined);
  }, []);

  const handleRetry = useCallback(() => {
    void mutate([
      "quizzes",
      "trending",
      { limit: TRENDING_RAIL_LIMIT, categoryId },
    ]);
  }, [categoryId]);

  const filterSlot = (
    <HomeCategoryFilter value={categoryId} onChange={handleCategoryChange} />
  );

  const showSkeleton = isLoading && visibleItems.length === 0;

  return (
    <QuizRail
      layout="scroller"
      title={title}
      subtitle="What players are reaching for right now"
      filter={filterSlot}
      className={className}
    >
      {showSkeleton ? (
        <QuizRailSkeleton layout="scroller" count={TRENDING_RAIL_LIMIT} />
      ) : error && visibleItems.length === 0 ? (
        <TrendingErrorPanel onRetry={handleRetry} error={error} />
      ) : visibleItems.length === 0 ? (
        <QuizRailEmpty
          title="No trending quizzes"
          description={
            categoryId
              ? "No trending quizzes in this category yet."
              : "No trending quizzes yet."
          }
          {...(categoryId
            ? {
                actionLabel: "Show all categories",
                onAction: handleReset,
              }
            : {})}
        />
      ) : (
        visibleItems.map((item) => (
          <RailQuizCard
            key={item.quizId}
            quiz={trendingToRailQuiz(item)}
            badge="Trending"
          />
        ))
      )}
    </QuizRail>
  );
}

function TrendingErrorPanel({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div
      role="alert"
      className="flex w-full flex-col items-center gap-3 py-6"
      data-testid="home-trending-rail-error"
    >
      <EmptyState
        icon={WifiOff}
        title="Couldn’t load trending quizzes"
        description={error.message || "Please try again."}
        actions={[
          {
            label: "Retry",
            onClick: onRetry,
            variant: "default",
          },
        ]}
      />
    </div>
  );
}