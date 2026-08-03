/**
 * `useMyTournamentAnalytics` — tournament analytics for the authenticated user.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B5.
 *
 * Wraps `getMyTournamentAnalytics` from `users.profile.service.ts` in a simple SWR hook.
 *
 * ## Zero values (master plan §1.3)
 *
 * The analytics may return zeros if the user has no tournament history.
 * Components handle this gracefully without error states.
 *
 * ## SWR key
 *
 * The key is `['users', 'me', 'tournaments', 'analytics']`.
 */

import useSWR from "swr";

import { myTournamentAnalyticsKey } from "@/features/users/types/tournament.types";
import { getMyTournamentAnalytics } from "@/features/users/services/users.profile.service";
import type { MyTournamentAnalyticsResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyTournamentAnalyticsReturn {
  analytics: MyTournamentAnalyticsResponseDto | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch tournament analytics for the authenticated user.
 */
export function useMyTournamentAnalytics(): UseMyTournamentAnalyticsReturn {
  const { data, error, isLoading } = useSWR(
    myTournamentAnalyticsKey(),
    () => getMyTournamentAnalytics(),
    {
      revalidateOnFocus: true,
    },
  );

  return {
    analytics: data ?? null,
    isLoading,
    error: error ?? null,
  };
}
