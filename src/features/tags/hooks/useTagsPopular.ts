"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";
import type { RankedTagResponseDto } from "@/lib/api/generated/schemas";

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
  const key = ["tags", "popular", params] as const;

  const { data, error, isLoading } = useQuery(
    {
      queryKey: key,
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
    error: error instanceof ApiError ? error : null,
  };
}
