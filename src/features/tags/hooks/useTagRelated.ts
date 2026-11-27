"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError } from "@/lib/api";
import type { TagResponseDto } from "@/lib/api/generated/schemas";

import { TAG_KEYS } from "@/features/tags/query-keys";
import { getRelatedTags } from "@/features/tags/services/tags.service";

export interface UseTagRelatedParams {
  limit?: number;
}

export interface UseTagRelatedResult {
  tags: readonly TagResponseDto[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useTagRelated(
  slug: string,
  params: UseTagRelatedParams = {},
): UseTagRelatedResult {
  const { data, error, isLoading } = useQuery(
    {
      queryKey: TAG_KEYS.related(slug, params),
      queryFn: async () => {
        const result = await getRelatedTags(slug, { limit: params.limit });
        return result.data ?? [];
      },
      enabled: Boolean(slug),
    },
    getQueryClient(),
  );

  return {
    tags: data ?? [],
    isLoading,
    error: error ? coerceToApiError(error) : null,
  };
}
