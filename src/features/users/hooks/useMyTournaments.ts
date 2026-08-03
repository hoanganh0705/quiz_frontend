/**
 * `useMyTournaments` — fetched active tournaments for the authenticated user.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B3.
 *
 * Wraps `listMyTournaments` from `users.profile.service.ts` in a simple SWR hook.
 *
 * ## SWR key
 *
 * The key is `['users', 'me', 'tournaments']`.
 */

import useSWR from "swr";

import { myTournamentsKey } from "@/features/users/types/tournament.types";
import { listMyTournaments } from "@/features/users/services/users.profile.service";
import type { MyTournamentItemDto } from "@/lib/api/generated/schemas";

export interface UseMyTournamentsReturn {
  tournaments: MyTournamentItemDto[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch active tournaments for the authenticated user.
 */
export function useMyTournaments(): UseMyTournamentsReturn {
  const { data, error, isLoading } = useSWR(
    myTournamentsKey(),
    () => listMyTournaments(),
    {
      revalidateOnFocus: true,
    },
  );

  const tournaments = (data?.data ?? []) as MyTournamentItemDto[];

  return {
    tournaments,
    isLoading,
    error: error ?? null,
  };
}
