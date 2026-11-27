"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, coerceToApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getCollectionAnalyticsData } from "@/features/bookmarks/api";
import { collectionAnalyticsKey } from "@/features/bookmarks/types";

import type { CollectionAnalytics } from "@/features/bookmarks/types";

export interface UseCollectionAnalyticsResult {
  analytics: CollectionAnalytics | null;
  isLoading: boolean;
  error: ApiError | null;
  isEmpty: boolean;
  mutate: () => Promise<unknown>;
}

export function useCollectionAnalytics(
  collectionId: string | null | undefined,
): UseCollectionAnalyticsResult {
  const { isAuthenticated } = useAuthState();

  const enabled = Boolean(collectionId && isAuthenticated);
  const queryKey = enabled
    ? collectionAnalyticsKey(collectionId!)
    : (["bookmark-collections", "analytics", "disabled"] as const);

  const query = useQuery(
    {
      queryKey,
      queryFn: () => getCollectionAnalyticsData(collectionId!),
      enabled,
      refetchOnWindowFocus: true,
      staleTime: 60_000,
    },
    getQueryClient(),
  );

  const analytics: CollectionAnalytics | null = query.data ?? null;

  const isEmpty = analytics !== null && analytics.totalQuizzes === 0;

  const error: ApiError | null = query.error
    ? coerceToApiError(query.error)
    : null;

  return {
    analytics,
    isLoading: query.isLoading && !query.error && enabled,
    error,
    isEmpty,
    mutate: query.refetch,
  };
}
