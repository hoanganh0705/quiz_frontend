"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { TagResponseDto } from "@/lib/api/generated/schemas";

import { TAG_KEYS } from "@/features/tags/query-keys";
import { getTagBySlug } from "@/features/tags/services/tags.service";

export interface UseTagBySlugResult {
  tag: TagResponseDto | null;
  isLoading: boolean;
  error: ApiError | null;
  notFound: boolean;
}

export function useTagBySlug(slug: string): UseTagBySlugResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: TAG_KEYS.detail(slug),
      queryFn: async () => {
        const result = await getTagBySlug(slug);
        return result.data ?? null;
      },
      enabled: Boolean(slug),
    },
    getQueryClient(),
  );

  const apiError = error ? coerceToApiError(error) : null;
  const notFound = apiError?.status === 404;

  return {
    tag: data ?? null,
    isLoading,
    error: apiError,
    notFound,
  };
}
