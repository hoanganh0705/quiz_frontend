/**
 * `useMyRanking` — ranking data for the authenticated user.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B6.
 *
 * Wraps `getMyRanking` from `users.profile.service.ts` in a simple SWR hook.
 *
 * ## XP ranking lag (master plan §1.3 line 69)
 *
 * The `me/ranking` endpoint may lag XP events by up to 60 seconds.
 * Components must never assume monotonic XP within a single request cycle.
 * This hook does not cache XP values between requests.
 *
 * ## SWR key
 *
 * The key is `['users', 'me', 'ranking']`.
 */

import useSWR from "swr";

import { myRankingKey } from "@/features/users/types/user-analytics.types";
import { getMyRanking } from "@/features/users/services/users.profile.service";
import type { UserRankingResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyRankingReturn {
  ranking: UserRankingResponseDto | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch ranking data for the authenticated user.
 *
 * @param refreshInterval - Optional polling interval in ms (e.g., 60000 for 60s).
 *                         Only pass when the tab is active to avoid unnecessary requests.
 */
export function useMyRanking(refreshInterval?: number): UseMyRankingReturn {
  const { data, error, isLoading } = useSWR(
    myRankingKey(),
    () => getMyRanking(),
    {
      revalidateOnFocus: true,
      ...(refreshInterval !== undefined ? { refreshInterval } : {}),
    },
  );

  return {
    ranking: data ?? null,
    isLoading,
    error: error ?? null,
  };
}
