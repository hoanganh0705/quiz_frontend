"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getCollectionAnalyticsData } from "@/features/bookmarks/api";
import type { CollectionAnalytics } from "@/features/bookmarks/types";
import { collectionAnalyticsKey } from "@/features/bookmarks/types";

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

  const error: ApiError | null = (() => {
    const first = query.error;
    if (!first) return null;
    if (isApiError(first)) return first;
    if (first && typeof first === "object" && "status" in first) {
      return first as unknown as ApiError;
    }
    return {
      status: 0,
      message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

  return {
    analytics,
    isLoading: query.isLoading && !query.error && enabled,
    error,
    isEmpty,
    mutate: query.refetch,
  };
}
