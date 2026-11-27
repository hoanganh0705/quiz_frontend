"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError, getHome } from "@/lib/api";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";

import type {
  CategoryResponseDto,
  HomeControllerGetBundle200,
  LeaderboardEntryDto,
  PopularQuizItemDto,
  QuizListItemDto,
  RecentWinnersResponseDto,
  TrendingQuizItemDto,
} from "@/lib/api/generated/schemas";

export interface UseHomeBundleResult {
  featured: readonly QuizListItemDto[];
  trending: readonly TrendingQuizItemDto[];
  popular: readonly PopularQuizItemDto[];
  categories: readonly CategoryResponseDto[];
  recentWinners: RecentWinnersResponseDto | null;
  topPlayers: readonly LeaderboardEntryDto[];
  isLoading: boolean;
  error: ApiError | null;
}

const EMPTY: UseHomeBundleResult = {
  featured: [],
  trending: [],
  popular: [],
  categories: [],
  recentWinners: null,
  topPlayers: [],
  isLoading: false,
  error: null,
};

export function useHomeBundle(): UseHomeBundleResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: QUIZ_KEYS.homeBundle(),
      queryFn: async () => {
        const envelope = await getHome().homeControllerGetBundle();
        const payload =
          (envelope?.data as HomeControllerGetBundle200["data"] | undefined) ??
          null;
        return payload;
      },
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
    getQueryClient(),
  );

  const apiError = error ? coerceToApiError(error) : null;

  if (!data) {
    return {
      ...EMPTY,
      isLoading,
      error: apiError,
    };
  }

  return {
    featured: data.featured ?? [],
    trending: data.trending ?? [],
    popular: data.popular ?? [],
    categories: data.categories ?? [],
    recentWinners: data.recentWinners ?? null,
    topPlayers: data.topPlayers ?? [],
    isLoading,
    error: apiError,
  };
}
