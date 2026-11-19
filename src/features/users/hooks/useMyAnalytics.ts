"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { myAnalyticsKey } from "@/features/users/types/user-analytics.types";
import { getMyAnalytics } from "@/features/users/services/users.profile.service";

export interface UseMyAnalyticsReturn {
  analytics: {
    xpTotal: number;
    quizzesCompleted: number;
    averageScore: number;
    totalTimeSpentMinutes: number;
    currentStreak: number;
    longestStreak: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
  } | null;
  isLoading: boolean;
  error: Error | null;
}

export function useMyAnalytics(): UseMyAnalyticsReturn {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: myAnalyticsKey(),
      queryFn: () => getMyAnalytics(),
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  const analytics = data
    ? {
        xpTotal: data.xpTotal ?? 0,
        quizzesCompleted: data.quizzesCompleted ?? 0,
        averageScore: data.averageScore ?? 0,
        totalTimeSpentMinutes: data.totalTimeSpentMinutes ?? 0,
        currentStreak: data.currentStreak ?? 0,
        longestStreak: data.longestStreak ?? 0,
        tournamentsPlayed: data.tournamentsPlayed ?? 0,
        tournamentsWon: data.tournamentsWon ?? 0,
      }
    : null;

  return {
    analytics,
    isLoading: isLoading && !error,
    error: (error as Error) ?? null,
  };
}
