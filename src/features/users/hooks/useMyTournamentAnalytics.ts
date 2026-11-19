"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { myTournamentAnalyticsKey } from "@/features/users/types/tournament.types";
import { getMyTournamentAnalytics } from "@/features/users/services/users.profile.service";
import type { MyTournamentAnalyticsResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyTournamentAnalyticsReturn {
  analytics: MyTournamentAnalyticsResponseDto | null;
  isLoading: boolean;
  error: Error | null;
}

export function useMyTournamentAnalytics(): UseMyTournamentAnalyticsReturn {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: myTournamentAnalyticsKey(),
      queryFn: () => getMyTournamentAnalytics(),
      refetchOnWindowFocus: true,
    },
    getQueryClient(),
  );

  return {
    analytics: data ?? null,
    isLoading: isLoading && !error,
    error: (error as Error) ?? null,
  };
}
