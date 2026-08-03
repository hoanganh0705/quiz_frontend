/**
 * `useMyAnalytics` — aggregate analytics for the authenticated user.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B7.
 *
 * Wraps `getMyAnalytics` from `users.profile.service.ts` in a simple SWR hook.
 *
 * ## Zero values
 *
 * Analytics may return zeros if the user has no activity yet.
 * Components handle this gracefully without error states.
 *
 * ## SWR key
 *
 * The key is `['users', 'me', 'analytics']`.
 */

import useSWR from "swr";

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

const DEFAULT_ANALYTICS = {
  xpTotal: 0,
  quizzesCompleted: 0,
  averageScore: 0,
  totalTimeSpentMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  tournamentsPlayed: 0,
  tournamentsWon: 0,
};

/**
 * Fetch aggregate analytics for the authenticated user.
 */
export function useMyAnalytics(): UseMyAnalyticsReturn {
  const { data, error, isLoading } = useSWR(
    myAnalyticsKey(),
    () => getMyAnalytics(),
    {
      revalidateOnFocus: true,
    },
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
    isLoading,
    error: error ?? null,
  };
}
