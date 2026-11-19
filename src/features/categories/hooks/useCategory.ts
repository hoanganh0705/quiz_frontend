"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { CategoryResponseDto } from "@/lib/api/generated/schemas";

import { getCategoryBySlug } from "@/features/categories/services/categories.service";

export interface UseCategoryResult {
  category: CategoryResponseDto | null;
  isLoading: boolean;
  error: ApiError | null;
  notFound: boolean;
}

export function useCategory(idOrSlug: string): UseCategoryResult {
  const key = ["category", idOrSlug] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
      queryFn: async () => {
        const result = await getCategoryBySlug(idOrSlug);
        return result.data ?? null;
      },
    },
    getQueryClient(),
  );

  const apiError = error instanceof ApiError ? error : null;
  const notFound = apiError?.status === 404;

  return {
    category: data ?? null,
    isLoading,
    error: apiError,
    notFound,
  };
}
