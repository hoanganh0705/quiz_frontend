"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { myTournamentsKey } from "@/features/users/types/tournament.types";
import { listMyTournaments } from "@/features/users/services/users.profile.service";
import type { MyTournamentItemDto } from "@/lib/api/generated/schemas";

export interface UseMyTournamentsReturn {
  tournaments: MyTournamentItemDto[];
  isLoading: boolean;
  error: Error | null;
}

export function useMyTournaments(): UseMyTournamentsReturn {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: myTournamentsKey(),
      queryFn: () => listMyTournaments(),
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  const tournaments = (data?.data ?? []) as MyTournamentItemDto[];

  return {
    tournaments,
    isLoading: isLoading && !error,
    error: (error as Error) ?? null,
  };
}
