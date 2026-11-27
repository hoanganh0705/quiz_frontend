"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { RankedTagResponseDto } from "@/lib/api/generated/schemas";

import { TAG_KEYS } from "@/features/tags/query-keys";
import { getTagsPopular } from "@/features/tags/services/tags.service";

export interface UseTagsPopularParams {
  limit?: number;
}

export interface UseTagsPopularResult {
  tags: readonly RankedTagResponseDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useTagsPopular(
  params: UseTagsPopularParams = {},
): UseTagsPopularResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: TAG_KEYS.popular(params),
      queryFn: async () => {
        const result = await getTagsPopular({ limit: params.limit });
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
