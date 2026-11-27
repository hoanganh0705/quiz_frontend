"use client";

import { useCallback } from "react";

import { WifiOff } from "lucide-react";

import { getQueryClient } from "@/providers/QueryProvider";

import { useQuizzesPopular } from "@/features/quizzes/hooks/useQuizzesPopular";
import { useQuizzesTrending } from "@/features/quizzes/hooks/useQuizzesTrending";
import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import {
  setPopularCategory,
  setTrendingCategory,
  usePopularCategoryId,
  useTrendingCategoryId,
} from "@/features/quizzes/store/use-home-category-store";
import {
  POPULAR_RAIL_LIMIT,
  TRENDING_RAIL_LIMIT,
  type PopularQuizItemDto,
  type TrendingQuizItemDto,
} from "@/features/quizzes/types/home-rails";

import { EmptyState } from "@/components/ui/EmptyState";

import { HomeCategoryFilter } from "./HomeCategoryFilter";
import { QuizRail } from "./QuizRail";
import { QuizRailEmpty } from "./QuizRailEmpty";
import { QuizRailSkeleton } from "./QuizRailSkeleton";
import { RailQuizCard, type RailQuiz } from "./RailQuizCard";

import type { ApiError } from "@/lib/api";

export type HomeMetricRailVariant = "popular" | "trending";

const VARIANT_CONFIG = {
  popular: {
    defaultTitle: "Popular",
    subtitle: "Player favourites this season",
    badge: "Popular",
    limit: POPULAR_RAIL_LIMIT,
    emptyTitle: "No popular quizzes",
    emptyCategoryDescription: "No popular quizzes in this category yet.",
    emptyAllDescription: "No popular quizzes yet.",
    errorTitle: "Couldn’t load popular quizzes",
    errorTestId: "home-popular-rail-error",
  },
  trending: {
    defaultTitle: "Trending",
    subtitle: "What players are reaching for right now",
    badge: "Trending",
    limit: TRENDING_RAIL_LIMIT,
    emptyTitle: "No trending quizzes",
    emptyCategoryDescription: "No trending quizzes in this category yet.",
    emptyAllDescription: "No trending quizzes yet.",
    errorTitle: "Couldn’t load trending quizzes",
    errorTestId: "home-trending-rail-error",
  },
} as const;

function toRailQuiz(item: PopularQuizItemDto | TrendingQuizItemDto): RailQuiz {
  return {
    quizId: item.quizId,
    title: item.title,
    slug: item.slug,
    imageUrl: item.imageUrl ?? null,
  };
}

export interface HomeMetricRailProps {
  variant: HomeMetricRailVariant;
  items?: readonly (PopularQuizItemDto | TrendingQuizItemDto)[];
  title?: string;
  className?: string;
  categories?: readonly { categoryId: string; name: string }[];
}

export function HomeMetricRail({
  variant,
  items,
  title,
  className,
  categories,
}: HomeMetricRailProps): React.ReactElement {
  const config = VARIANT_CONFIG[variant];
  const popularCategoryId = usePopularCategoryId();
  const trendingCategoryId = useTrendingCategoryId();
  const categoryId =
    variant === "popular" ? popularCategoryId : trendingCategoryId;

  const hasSsrItems = Boolean(items && items.length > 0);
  const popularQuery = useQuizzesPopular({
    limit: POPULAR_RAIL_LIMIT,
    categoryId: popularCategoryId,
    enabled:
      variant === "popular" && (popularCategoryId !== undefined || !hasSsrItems),
  });
  const trendingQuery = useQuizzesTrending({
    limit: TRENDING_RAIL_LIMIT,
    categoryId: trendingCategoryId,
    enabled:
      variant === "trending" &&
      (trendingCategoryId !== undefined || !hasSsrItems),
  });

  const { quizzes, isLoading, error } =
    variant === "popular" ? popularQuery : trendingQuery;

  const sourceItems = items ?? [];
  const visibleItems =
    categoryId !== undefined
      ? quizzes
      : quizzes.length > 0
        ? quizzes
        : sourceItems;

  const setCategory =
    variant === "popular" ? setPopularCategory : setTrendingCategory;

  const handleCategoryChange = useCallback(
    (next: string | undefined) => {
      setCategory(next);
    },
    [setCategory],
  );

  const handleReset = useCallback(() => {
    setCategory(undefined);
  }, [setCategory]);

  const handleRetry = useCallback(() => {
    const queryKey =
      variant === "popular"
        ? QUIZ_KEYS.popular({ limit: config.limit, categoryId })
        : QUIZ_KEYS.trending({ limit: config.limit, categoryId });
    void getQueryClient().invalidateQueries({ queryKey });
  }, [variant, config.limit, categoryId]);

  const filterSlot = (
    <HomeCategoryFilter
      value={categoryId}
      onChange={handleCategoryChange}
      fallbackCategories={categories}
    />
  );

  const showSkeleton =
    isLoading &&
    (categoryId !== undefined
      ? quizzes.length === 0
      : visibleItems.length === 0);

  const statusContent = showSkeleton ? (
    <QuizRailSkeleton layout="scroller" count={config.limit} />
  ) : error && visibleItems.length === 0 ? (
    <MetricRailErrorPanel
      title={config.errorTitle}
      testId={config.errorTestId}
      onRetry={handleRetry}
      error={error}
    />
  ) : visibleItems.length === 0 ? (
    <QuizRailEmpty
      title={config.emptyTitle}
      description={
        categoryId ? config.emptyCategoryDescription : config.emptyAllDescription
      }
      {...(categoryId
        ? {
            actionLabel: "Show all categories",
            onAction: handleReset,
          }
        : {})}
    />
  ) : null;

  return (
    <QuizRail
      layout="scroller"
      title={title ?? config.defaultTitle}
      subtitle={config.subtitle}
      filter={filterSlot}
      statusContent={statusContent}
      className={className}
    >
      {visibleItems.map((item) => (
        <RailQuizCard
          key={item.quizId}
          quiz={toRailQuiz(item)}
          badge={config.badge}
        />
      ))}
    </QuizRail>
  );
}

function MetricRailErrorPanel({
  title,
  testId,
  error,
  onRetry,
}: {
  title: string;
  testId: string;
  error: ApiError;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div
      role="alert"
      className="flex w-full flex-col items-center gap-3 py-6"
      data-testid={testId}
    >
      <EmptyState
        icon={WifiOff}
        title={title}
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
