"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { myBadgesKey } from "@/features/users/types/badge.types";
import { listMyBadges } from "@/features/users/services/users.profile.service";
import type { UserBadgeList } from "@/features/users/types/badge.types";

export interface UseMyBadgesReturn {
  badges: UserBadgeList;
  isLoading: boolean;
  error: Error | null;
}

export function useMyBadges(refreshInterval?: number): UseMyBadgesReturn {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: myBadgesKey(),
      queryFn: () => listMyBadges(),
      refetchOnWindowFocus: true,
      refetchInterval: refreshInterval,
    },
    getQueryClient(),
  );

  return {
    badges: data ?? { items: [], total: 0 },
    isLoading: isLoading && !error,
    error: (error as Error) ?? null,
  };
}
