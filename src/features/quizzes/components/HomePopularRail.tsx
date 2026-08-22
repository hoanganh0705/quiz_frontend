"use client";

import { useCallback } from "react";
import { mutate } from "swr";
import { WifiOff } from "lucide-react";

import { ApiError } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

import { useQuizzesPopular } from "@/features/quizzes/hooks/useQuizzesPopular";
import { POPULAR_RAIL_LIMIT, type PopularQuizItemDto } from "@/features/quizzes/types/home-rails";
import {
  setPopularCategory,
  usePopularCategoryId,
} from "@/features/quizzes/store/use-home-category-store";

import { HomeCategoryFilter } from "./HomeCategoryFilter";
import { QuizRail } from "./QuizRail";
import { QuizRailEmpty } from "./QuizRailEmpty";
import { QuizRailSkeleton } from "./QuizRailSkeleton";
import { RailQuizCard, type RailQuiz } from "./RailQuizCard";

function popularToRailQuiz(item: PopularQuizItemDto): RailQuiz {
  return {
    quizId: item.quizId,
    title: item.title,
    slug: item.slug,
    imageUrl: item.imageUrl ?? null,
  };
}

export interface HomePopularRailProps {
  items?: readonly PopularQuizItemDto[];
  title?: string;
  className?: string;
}

export function HomePopularRail({
  items,
  title = "Popular",
  className,
}: HomePopularRailProps): React.ReactElement {
  const categoryId = usePopularCategoryId();

  const { quizzes, isLoading, error } = useQuizzesPopular({
    limit: POPULAR_RAIL_LIMIT,
    categoryId,
  });

  const sourceItems = items ?? [];
  const visibleItems = sourceItems.length > 0 ? sourceItems : quizzes;

  const handleCategoryChange = useCallback((next: string | undefined) => {
    setPopularCategory(next);
  }, []);

  const handleReset = useCallback(() => {
    setPopularCategory(undefined);
  }, []);

  const handleRetry = useCallback(() => {
    void mutate([
      "quizzes",
      "popular",
      { limit: POPULAR_RAIL_LIMIT, categoryId },
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
      subtitle="Player favourites this season"
      filter={filterSlot}
      className={className}
    >
      {showSkeleton ? (
        <QuizRailSkeleton layout="scroller" count={POPULAR_RAIL_LIMIT} />
      ) : error && visibleItems.length === 0 ? (
        <PopularErrorPanel onRetry={handleRetry} error={error} />
      ) : visibleItems.length === 0 ? (
        <QuizRailEmpty
          title="No popular quizzes"
          description={
            categoryId
              ? "No popular quizzes in this category yet."
              : "No popular quizzes yet."
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
            quiz={popularToRailQuiz(item)}
            badge="Popular"
          />
        ))
      )}
    </QuizRail>
  );
}

function PopularErrorPanel({
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
      data-testid="home-popular-rail-error"
    >
      <EmptyState
        icon={WifiOff}
        title="Couldn’t load popular quizzes"
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