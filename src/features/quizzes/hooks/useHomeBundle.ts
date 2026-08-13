'use client'

/**
 * `useHomeBundle` — `useSWR` hook against the
 * `GET /home` composite endpoint (Phase 4 / S-23).
 *
 * The home page used to fan out 6+ sequential calls (featured,
 * trending, popular, categories, recent-winners, top-players).
 * The bundle collapses the fan-out into a single SWR round-trip.
 * The hook returns the four rails the consumer renders directly
 * (featured, trending, popular, categories) along with the side
 * rails (recentWinners, topPlayers) the page renders below.
 *
 * The hook is read-only — no mutation, no optimistic update. The
 * retry affordance lives in the consumer (the rails expose a
 * "Retry" button that calls SWR's global `mutate(key)`).
 */

import useSWR from 'swr'

import { ApiError, getHome } from '@/lib/api'
import type {
  CategoryResponseDto,
  HomeControllerGetBundle200,
  LeaderboardEntryDto,
  PopularQuizItemDto,
  QuizListItemDto,
  RecentWinnersResponseDto,
  TrendingQuizItemDto,
} from '@/lib/api/generated/schemas'

export interface UseHomeBundleResult {
  featured: readonly QuizListItemDto[]
  trending: readonly TrendingQuizItemDto[]
  popular: readonly PopularQuizItemDto[]
  categories: readonly CategoryResponseDto[]
  recentWinners: RecentWinnersResponseDto | null
  topPlayers: readonly LeaderboardEntryDto[]
  isLoading: boolean
  error: ApiError | null
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
}

export function useHomeBundle(): UseHomeBundleResult {
  const key = ['home', 'bundle'] as const

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const envelope = await getHome().homeControllerGetBundle();
      const payload = (envelope?.data as HomeControllerGetBundle200['data'] | undefined) ?? null;
      return payload;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    },
  );

  if (!data) {
    return {
      ...EMPTY,
      isLoading,
      error: error instanceof ApiError ? error : null,
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
    error: error instanceof ApiError ? error : null,
  };
}