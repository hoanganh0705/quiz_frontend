"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { RankedTagResponseDto } from "@/lib/api/generated/schemas";

import { TAG_KEYS } from "@/features/tags/query-keys";
import { getTagsTrending } from "@/features/tags/services/tags.service";

export interface UseTagsTrendingParams {
  limit?: number;
}

export interface UseTagsTrendingResult {
  tags: readonly RankedTagResponseDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useTagsTrending(
  params: UseTagsTrendingParams = {},
): UseTagsTrendingResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: TAG_KEYS.trending(params),
      queryFn: async () => {
        const result = await getTagsTrending({ limit: params.limit });
        return result.data ?? [];
      },
    },
    getQueryClient(),
  );

  return {
    tags: data ?? [],
    isLoading,
    error: error ? coerceToApiError(error) : null,
  };
}
