"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { TagAnalyticsResponseDto } from "@/lib/api/generated/schemas";

import { TAG_KEYS } from "@/features/tags/query-keys";
import { getTagAnalytics } from "@/features/tags/services/tags.service";

export interface UseTagAnalyticsResult {
  analytics: TagAnalyticsResponseDto | null;
  isLoading: boolean;
  error: ApiError | null;
}

export function useTagAnalytics(id: string): UseTagAnalyticsResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: TAG_KEYS.analytics(id),
      queryFn: async () => {
        const result = await getTagAnalytics(id);
        return result.data ?? null;
      },
      enabled: Boolean(id),
    },
    getQueryClient(),
  );

  const apiError = error ? coerceToApiError(error) : null;
  const isNotFound = apiError?.status === 404;

  return {
    analytics: isNotFound ? null : (data ?? null),
    isLoading,
    error: isNotFound ? null : apiError,
  };
}
