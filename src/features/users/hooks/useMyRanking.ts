"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { myRankingKey } from "@/features/users/types/user-analytics.types";
import { getMyRanking } from "@/features/users/services/users.profile.service";
import type { UserRankingResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyRankingReturn {
  ranking: UserRankingResponseDto | null;
  isLoading: boolean;
  error: Error | null;
}

export function useMyRanking(refreshInterval?: number): UseMyRankingReturn {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: myRankingKey(),
      queryFn: () => getMyRanking(),
      refetchOnWindowFocus: true,
      refetchInterval: refreshInterval,
    },
    getQueryClient(),
  );

  return {
    ranking: data ?? null,
    isLoading: isLoading && !error,
    error: (error as Error) ?? null,
  };
}
