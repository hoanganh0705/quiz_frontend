"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { RankedCategoryResponseDto } from "@/lib/api/generated/schemas";

import { CATEGORY_KEYS } from "@/features/categories/query-keys";
import { getCategoriesTrending } from "@/features/categories/services/categories.service";

export interface UseCategoriesTrendingParams {
  limit?: number;
}

export interface UseCategoriesTrendingResult {
  categories: readonly RankedCategoryResponseDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useCategoriesTrending(
  params: UseCategoriesTrendingParams = {},
): UseCategoriesTrendingResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: CATEGORY_KEYS.trending(params),
      queryFn: async () => {
        const result = await getCategoriesTrending({ limit: params.limit });
        return result.data ?? [];
      },
    },
    getQueryClient(),
  );

  return {
    categories: data ?? [],
    isLoading,
    error: error ? coerceToApiError(error) : null,
  };
}
