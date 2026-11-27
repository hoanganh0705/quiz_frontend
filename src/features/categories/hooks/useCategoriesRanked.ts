"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { RankedCategoryResponseDto } from "@/lib/api/generated/schemas";

import { CATEGORY_KEYS } from "@/features/categories/query-keys";
import { getCategoriesRanked } from "@/features/categories/services/categories.service";

export interface UseCategoriesRankedParams {
  limit?: number;
}

export interface UseCategoriesRankedResult {
  categories: readonly RankedCategoryResponseDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useCategoriesRanked(
  params: UseCategoriesRankedParams = {},
): UseCategoriesRankedResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: CATEGORY_KEYS.ranked(params),
      queryFn: async () => {
        const result = await getCategoriesRanked({ limit: params.limit });
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
