'use client'

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