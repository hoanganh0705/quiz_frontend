"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { CategoryResponseDto } from "@/lib/api/generated/schemas";

import { CATEGORY_KEYS } from "@/features/categories/query-keys";
import { getCategoryBySlug } from "@/features/categories/services/categories.service";

export interface UseCategoryResult {
  category: CategoryResponseDto | null;
  isLoading: boolean;
  error: ApiError | null;
  notFound: boolean;
}

export function useCategory(idOrSlug: string): UseCategoryResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: CATEGORY_KEYS.detail(idOrSlug),
      queryFn: async () => {
        const result = await getCategoryBySlug(idOrSlug);
        return result.data ?? null;
      },
      enabled: Boolean(idOrSlug),
    },
    getQueryClient(),
  );

  const apiError = error ? coerceToApiError(error) : null;
  const notFound = apiError?.status === 404;

  return {
    category: data ?? null,
    isLoading,
    error: apiError,
    notFound,
  };
}
