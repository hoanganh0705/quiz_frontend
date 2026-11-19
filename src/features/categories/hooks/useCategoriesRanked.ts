"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { RankedCategoryResponseDto } from "@/lib/api/generated/schemas";

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
  const key = ["categories", "ranked", params] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
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
    error: error instanceof ApiError ? error : null,
  };
}
